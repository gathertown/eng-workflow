# Addressing PR Review Feedback

## Fetching comments

Start here for a whole PR — one call gets the unresolved threads, the timeline comments, and each reviewer's latest verdict:

```bash
<skill-dir>/fetch-pr-feedback.sh <PR-number> [author-login]
```

`<skill-dir>` is this skill's base directory.

It prints JSON: `unresolved_threads` (each with `reply_to_id`, the REST comment id the reply endpoint wants), `resolved_thread_count`, `timeline_comments`, `latest_reviews`. It handles the three traps that make hand-rolled fetching lose comments — `isResolved` only exists in GraphQL, `reviewThreads` pages at 100, and REST defaults to 30 per page. Read-only.

"This stack" + one PR link → run it for **every** PR in the stack.

For a deep link to one thread or comment, the queries below are the direct route.

### Graphite deep links

The fragment holds a GitHub GraphQL node ID. `PRRT_` = `PullRequestReviewThread`, `PRRC_` = `PullRequestReviewComment`.

```bash
gh api graphql -f query='
query {
  node(id: "PRRT_kwDOExampleThread1") {
    ... on PullRequestReviewThread {
      isResolved path line
      comments(first: 20) { nodes { databaseId author { login } body url } }
    }
  }
}'

gh api graphql -f query='
query {
  node(id: "PRRC_kwDOExampleComment1") {
    ... on PullRequestReviewComment { databaseId author { login } body url path line }
  }
}'
```

`databaseId` is the REST comment ID — use it for replies.

### Which threads are still open

The script already filters to unresolved. Two rules it encodes, worth knowing when you read its output: `isOutdated` threads still count — outdated means the line moved, not that the point was answered — and REST carries no resolution state at all, so never conclude "no unresolved feedback" from a REST listing.

### One-off REST calls

**Always pass `per_page=100`.** GitHub defaults to 30 and silently drops the rest, so feedback goes unaddressed.

```bash
gh api "repos/{owner}/{repo}/pulls/{number}/comments?per_page=100"    # review comments
gh api "repos/{owner}/{repo}/issues/{number}/comments?per_page=100"   # timeline comments
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}               # one comment
```

## Scope

- "Address **this** comment" + link → just that one, but mention other unresolved ones and ask.
- "Address the feedback/comments" → all unresolved review comments.
- "Comments" usually means inline review comments, not timeline comments. Use context.

## Making changes

1. Check out the branch the comment was left on — not whatever you're on.
2. Make the change.
3. Commit and validate.

## Responding

```bash
gh api repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies \
  -f body="[felix] <your response>"
```

The `[felix]` prefix is mandatory. **Leave the thread open** — the human confirms and resolves. One exception: the reviewer supplied the exact diff (a ` ```suggestion ` block or equivalent), it was the whole ask, and you applied precisely that on the branch the thread lives on. Then reply, and resolve after the reply lands. The full bar and the mutation are in the felix-loop skill — [SKILL.md §"Resolving verbatim suggestions"](../felix-loop/SKILL.md) and [github-commands.md §"Thread Operations"](../felix-loop/github-commands.md). Any hesitation, leave it open.

Timeline comments have no reply endpoint. Respond with a new issue comment that quotes what you're answering: `gh api repos/{owner}/{repo}/issues/{number}/comments -f body="[felix] Re: ..."`.

Ambiguous feedback (multiple reasonable readings) → ask the user. Clearly correct → apply without asking. Clearly wrong or irrelevant (e.g. a bot comment that doesn't apply) → reply explaining why, still leave it open.

## Summarizing for the human

Three tables — **Feedback I incorporated**, **Feedback I rejected**, **Feedback I skipped (needs your input)** — each with columns: Thread | Comment | What I did (or Reason).

Thread cell is a short code linking to `https://app.graphite.com/github/pr/<org>/<repo>/<prId>#comment-<commentId>`. Example row:

```
| [`c7Qm`](https://app.graphite.com/github/pr/owner/repo/1234#comment-PRRC_kwDOExampleComment1) | alice: "handle the parse error in loadConfig" | Wrapped the parse in `loadConfig()` in a try/catch -> exit 3 with the file path. Added a test for a malformed file. |
```

## Before you're done

1. Re-check the PR(s) for feedback you missed.
2. `gt submit --stack --no-edit`.
3. Re-request review **only from reviewers whose latest state is `CHANGES_REQUESTED`** — commenters and approvers didn't block: `bash <skill-dir>/re-request-review.sh <PR-number>`
4. Summarize what you addressed and what you decided.
