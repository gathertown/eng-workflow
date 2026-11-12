# GitHub CLI command reference

All commands use `gh`. Variables: `$OWNER`, `$REPO`, `$PR_NUMBER`, `$BASE_BRANCH`.

Everything through §"CI Check Results" below is what [nextAction.ts](nextAction.ts) already does in code (see [nextActionCore.ts](nextActionCore.ts)) — read this for context when debugging the script or reading its payload, not to re-run by hand. §"Thread Operations" onward are commands the parent LLM still runs directly.

```bash
OWNER=$(gh repo view --json owner -q .owner.login)
REPO=$(gh repo view --json name -q .name)
```

## Required Check Detection

Required checks come from **rulesets** (GitHub's current model) or **classic branch protection** (older). The classic endpoints 404 on rulesets-only repos, so query rulesets first.

```bash
# 1. Rulesets (current default). Check names are inlined under .parameters.
CHECKS=$(gh api "/repos/$OWNER/$REPO/rules/branches/$BASE_BRANCH" \
  --jq '[.[] | select(.type == "required_status_checks")
         | .parameters.required_status_checks[].context]' 2>/dev/null)

# 2. Fall back to classic branch protection.
if [ -z "$CHECKS" ] || [ "$CHECKS" = "[]" ]; then
  CHECKS=$(gh api "/repos/$OWNER/$REPO/branches/$BASE_BRANCH/protection/required_status_checks" \
    --jq '[.checks[]?.context // .contexts[]?]' 2>/dev/null)
fi
```

`$CHECKS` is a JSON array of check names that block merging, or `[]`. Failed checks not in this list are ignored entirely.

**Final fallback:** if both come back empty, use `mergeStateStatus` as the authoritative signal — `CLEAN` means required checks satisfied; treat `UNSTABLE` as "still running / optional failed" and `BLOCKED` as "waiting on reviews", and poll. Don't infer the required list from check names.

## PR Mergeability

```bash
gh pr view $PR_NUMBER --json mergeable,mergeStateStatus,reviewDecision
```

`mergeStateStatus`: `CLEAN`, `DIRTY` (conflicts), `UNSTABLE` (a check is unhappy — often a non-required flake), `BLOCKED` (required checks failing or reviews missing), `BEHIND`, `UNKNOWN`.

`reviewDecision` is what separates the two meanings of `BLOCKED`: `REVIEW_REQUIRED` / `CHANGES_REQUESTED` mean a human owes the PR something, `APPROVED` means it's blocked on checks instead. `gh` marshals the field as a plain string, so a PR whose base branch requires no review at all comes back as `""`, not JSON `null`.

## Unresolved Review Threads

Range fields (`startLine`, `line`) live on the **thread**, not the comments — GitHub attaches the highlighted range when the reviewer selects multiple lines.

```bash
gh api graphql -f query='
  query($owner:String!, $repo:String!, $pr:Int!, $cursor:String) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100, after:$cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isResolved
            isOutdated
            path
            startLine
            line
            originalStartLine
            originalLine
            diffSide
            comments(first:10) {
              nodes { id author { login } body createdAt }
            }
          }
        }
      }
    }
  }
' -F owner="$OWNER" -F repo="$REPO" -F pr=$PR_NUMBER -F cursor=null
```

Paginate with `-F cursor="$endCursor"` while `hasNextPage`. Filter to `isResolved == false`. Each unresolved thread becomes a signal with:

- Thread ID, first comment's body + author login, `path`.
- **Scope**: `startLine == null` → single-line pin at `line`; else the range `startLine..line` inclusive — the comment applies to the **whole** range, never just the trailing line. (Collapsing a range to its last line caused a silent-trim bug where a block comment got stripped one paragraph at a time across three commits.)
- `isOutdated` — authoritative "anchor drifted" flag; treat `line == null` as outdated too. When outdated, prefer `originalLine`/`originalStartLine` as a locator hint, falling back to content lookup.
- `diffSide` — `RIGHT` (new file) or `LEFT` (deleted line in the base file). LEFT-side line numbers can't be coverage-checked against the diff, so mark LEFT threads outdated and verify by content.

## Issue Comments

```bash
gh api "/repos/$OWNER/$REPO/issues/$PR_NUMBER/comments?per_page=100" \
  --jq '[.[] | select(.created_at > "'"$LAST_CHECK_TIMESTAMP"'") | {id, author: .user.login, author_type: .user.type, body, created_at}]'
```

Don't filter by human-vs-felix author — the human reviews from the same account felix posts from. Triage by content. But `author_type` is captured so the signal filter can drop `Bot`-authored chrome (dependency scans, etc.) — see SKILL.md §"Signal filter rules".

## CI Check Results

Use the check-runs endpoint, not `gh pr checks` — the latter collapses cancelled/failed into one bucket and loses the `conclusion` vocabulary.

```bash
HEAD_SHA=$(gh pr view $PR_NUMBER --json headRefOid -q .headRefOid)
gh api "/repos/$OWNER/$REPO/commits/$HEAD_SHA/check-runs?per_page=100"
# group by name (required only), take the highest `id` per name as the latest run
gh run view $RUN_ID --log-failed 2>/dev/null | tail -80   # for each FAILED required check
```

Map `status`+`conclusion` to an effective state and apply the cancelled-check policy — see SKILL.md §"Handling cancelled required checks". `nextAction.ts` never fetches the log itself; once it returns a `TRIAGE` payload with a FAILED check, fetch and redact the log yourself (SKILL.md §"Redacting secrets") before reading it or handing it to a fix subagent.

```bash
gh run rerun $WORKFLOW_RUN_ID --failed            # restart failed/cancelled jobs
gh run cancel $WORKFLOW_RUN_ID && gh run rerun $WORKFLOW_RUN_ID --failed   # if a long job blocks the rerun
```

Use the `workflowRunId` from the script's `RESTART_CANCELLED`/`TRIAGE` payload, not the check-run `id` — they're different IDs, and `gh run rerun` needs the former.

## Thread Operations

Reply to a thread (always `[felix]`-prefixed):

```bash
gh api graphql -f query='
  mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId, body: $body
    }) { comment { id } }
  }
' -f threadId="$THREAD_ID" -f body="$REPLY_BODY"
```

Resolve a thread — **only** after its reply has landed, and only for a reviewer-supplied diff applied verbatim (SKILL.md §"Resolving verbatim suggestions" is the gate; every other thread is human-only):

```bash
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { isResolved }
    }
  }
' -f threadId="$THREAD_ID"
```

There is no un-resolve in felix's flow — a human unresolving a thread is what puts it back in play, and `disposeReviewThread` picks that up live on the next round.

## Post Issue Comment (round summary)

```bash
gh pr comment $PR_NUMBER --body "$COMMENT_BODY"
```

`[felix]`-prefixed, natural developer status update. Good: "[felix] Addressed the null check in parser.ts and fixed the stale mock causing the test-unit failure." Bad: "**Felix Round 3 Summary** :robot: Fixed 3 signals."

## PR Description Update

Only when code drifts from the description, and edit surgically:

```bash
gh pr edit $PR_NUMBER --body "$UPDATED_BODY"
```

## Re-requesting review (changes-requested only)

Re-request only reviewers whose latest review state is `CHANGES_REQUESTED` — the ones who blocked the PR. Never blanket re-request every reviewer.

```bash
bash <skill-dir>/../graphite-workflow/re-request-review.sh $PR_NUMBER
```

## PR State Check

```bash
gh pr view $PR_NUMBER --json state -q .state    # OPEN / CLOSED / MERGED
```

## Polling

`nextAction.ts` polls internally — sleep, re-gather, re-evaluate, repeat — and only returns to the parent when something's actionable. See SKILL.md §"The `nextAction.ts` script" for its invocation and output.
