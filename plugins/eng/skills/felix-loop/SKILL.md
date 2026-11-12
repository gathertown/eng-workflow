---
name: felix-loop
description: Monitor a GitHub PR or Graphite stack for blocking issues (failed CI, review comments, lint, merge conflicts) and fix them iteratively until mergeable. Use for "fix a PR", "run felix", "watch PR #N", or "fix this stack".
---

# Felix Loop

If `repo.md` sits next to this file, or `.claude/eng/felix-loop/repo.md` exists in this repo, read it first. It holds this repo's commands and conventions. Where it conflicts with this skill, follow it.

Felix monitors a PR (or every PR in a Graphite stack), detects blocking signals — failed required CI checks, unresolved review threads, new comments, merge conflicts — and fixes them round by round until the PR is mergeable. You (the parent LLM) run the loop directly: bash for simple operations, subagents for reasoning-heavy work.

A single PR is just a stack of size one. The loop is the same either way; the stack-specific steps (per-branch fixing, `gt restack`) degenerate to no-ops when there's one branch. This skill uses `gt` (Graphite) for all branch operations — see the graphite-workflow skill for its semantics and "defer to human" rules. If the target branch isn't Graphite-tracked at all, stop and ask the human to `gt track` it first.

References (load on demand):

- `gh` CLI / GraphQL command reference: [github-commands.md](github-commands.md)
- Subagent prompt templates: [subagent-prompts.md](subagent-prompts.md)
- Gather/filter/gate/poll script: [nextAction.ts](nextAction.ts) (pure decisions in [nextActionCore.ts](nextActionCore.ts), tests in [nextActionCore.test.ts](nextActionCore.test.ts))

## The `nextAction.ts` script

Everything before Phase 1 below — trunk-drift check, signal gathering, filtering, the settling/quiet gates, and polling — is handled by one script instead of by hand each round. It gathers GitHub/Graphite state, applies the exact filter/gate rules from this skill, and sleeps through non-actionable rounds internally, so the parent LLM is only invoked when there's something to actually do.

```bash
node <skill-dir>/nextAction.ts <PR_NUMBER> [QUIET_EXIT] [POLL_INTERVAL] [POLL_TIMEOUT] [--continue]
```

`<skill-dir>` is this skill's base directory. Node 22.18 or later runs the TypeScript directly. Run it in the foreground with the Bash tool's `timeout` at 900000. It blocks through polling and prints exactly one JSON line to stdout when the LLM needs to act, then exits. One call stops polling after 10 minutes, which leaves room inside that timeout for its last round. Append `--once` to evaluate a single round and return immediately (even a `POLL`) instead of sleeping — useful for smoke-testing against a real PR without blocking; not used in the normal main loop.

```json
{"kind":"TRIAGE","payloadPath":".repo/felix/next-action.json"}
{"kind":"RESTART_CANCELLED","payloadPath":".repo/felix/next-action.json"}
{"kind":"SYNC_TRUNK","prNumber":123}
{"kind":"HUMAN_REQUIRED","reason":"...","prNumber":123}
{"kind":"DONE","topPrNumber":123}
{"kind":"STACK_LANDED"}
{"kind":"KEEP_POLLING"}
```

All progress goes to stderr (heartbeat lines while polling) — don't narrate those. React to the terminal JSON line only:

- **`TRIAGE`** — read `payloadPath` (a JSON file with `{ stack, signals, ambiguousSignals }`, where `stack` is bottom-to-top with title/body for fix context). Run Phase 1 (Triage) and Phase 2 (Fix) below on `signals`, using `ambiguousSignals` for the escape-hatch context when a thread's decision-needed reply already exists. Phase 2 fixes **one branch** per round, not the whole payload (§"One branch per round"). After Phase 3/4 (Push/Bookkeeping) — or immediately if nothing was FIXABLE — invoke the script again for the next round.
- **`RESTART_CANCELLED`** — read `payloadPath` for the cancelled check(s) (`checkName`, `checkRunId`, `workflowRunId`, `prNumber`). Apply §"Handling cancelled required checks" below (`gh run rerun`), then invoke the script again.
- **`SYNC_TRUNK`** — a PR in the stack is `DIRTY`, so trunk has moved under it. Run §"Syncing trunk" below, then invoke the script again.
- **`HUMAN_REQUIRED`** — a state only a human can clear: untracked branch, twice-cancelled check, a green stack blocked on review (§"Waiting on a reviewer"), a CI failure you dismissed with nothing else left to do, or POLL_TIMEOUT elapsing with nothing actionable. Post the appropriate comment per §"Exit conditions" if the reason names a specific PR-facing issue, then stop — don't invoke the script again until the human has acted.
- **`DONE`** — post the QUIET_EXIT comment on `topPrNumber` per §"Exit conditions", then stop.
- **`STACK_LANDED`** — stop silently, no comment.
- **`KEEP_POLLING`** — the call hit its 10-minute cap mid-poll. Run the same command again right away with `--continue`, and say nothing. `--continue` resumes the POLL_TIMEOUT deadline and the next round's start time from `.felix-state.json`. Every other re-run in this skill starts a fresh poll, so it goes without `--continue`.

The loop runs unattended: a message with no tool call ends your turn, and the loop stays stopped until a human prompts it again. The only intended turn endings are the terminal results above and the stops in §"Safety guardrails" and §"Exit conditions". Don't end a turn with a round summary that announces the next step, an offer to keep going unless the human prefers otherwise, or a list of decisions none of which blocks the next round. Put any status note in the same message as the next tool call (usually re-invoking the script) and carry on. The defer-to-human rules are the stops that are wanted; nothing here loosens them.

Transient `gh` failures — 5xx responses, dropped connections, secondary rate limits — are retried internally (4 attempts, 2s/6s/15s backoff), so a GitHub blip mid-poll no longer throws away the session. Everything else, and anything that survives all four attempts, still exits non-zero with `gh`'s own error. Polling is bounded: once `POLL_TIMEOUT` elapses without an actionable round, the script returns `HUMAN_REQUIRED` instead of polling on. Polls also pace themselves to GitHub's hourly rate limit. Before each sleep the script reads `gh api rate_limit` and spreads the calls left until the reset, with 500 held back for your own `gh` calls. On a 40-PR stack that stretches the sleep to about 100s.

The script never mutates GitHub or git — no comments, no reruns, no branch changes. `fix_rounds`, `pending_replies`, and each PR's `last_check_timestamp` in `.felix-state.json` are entirely yours — the script never writes any of them. (There's no persisted `addressed_signal_ids` or `ambiguous_signals` at all: a review thread's disposition — actionable, addressed, or pending-ambiguous — is derived fresh from live GitHub state every round, via `disposeReviewThread` in [nextActionCore.ts](nextActionCore.ts). That's a deliberate simplification over the old design: it self-heals after a human unresolves a thread or the state file is lost, with no separate list to keep in sync. Issue comments have no such self-healing signal, though, so `last_check_timestamp` stays yours to advance — see Phase 4 below.) `next_action_restart_counts` is shared: the script reads it to decide `RESTART_CANCELLED` vs `HUMAN_REQUIRED`, but only you write it, after actually running `gh run rerun` — see §"Handling cancelled required checks". (Despite the name, each value is a check-run id, not a count — see that section for why.) `next_action_dismissed_ci_failures` is shared the same way: the script reads it to drop an already-dismissed `ci_failure` from future `TRIAGE` payloads, but only you write it, when you classify one `UNHANDLEABLE` — see Phase 1 below. Track `fix_rounds` yourself and check it against `MAX_FIX_ROUNDS` before starting a fix round (§"Exit conditions").

## Long commands

Run every command in the foreground with the Bash tool's `timeout` at 900000, its 15-minute cap. A command that runs past its timeout moves to the background on its own. A background command or monitor started by a subagent is killed when the subagent's turn ends, and nothing wakes the subagent up again. So never end a turn to wait on a command, a monitor, or a background task.

- `nextAction.ts` stops polling by itself after 10 minutes (`KEEP_POLLING`, above).
- `gt-audit` takes from 30 seconds to 15 minutes on a big stack. Run it as `timeout 840 gt-audit`, or `gtimeout 840 gt-audit` where Homebrew coreutils only provides that name. Exit 124 means it ran out of time. In Phase 2, check the stack by diff the way an inconclusive finding is checked. In a trunk sync, stop.
- Tests, the typecheck, and `gt restack` take the same Bash `timeout`.

When felix runs as a subagent, a result that says it's waiting on something means the loop stopped. The coordinator checks `gt log short` and `git status` in felix's worktree, then continues the agent with `SendMessage` and what it found.

## Model tiers

`nextAction.ts` (see above) replaced the Sonnet gather-and-distill subagent that used to run every round — gathering, filtering, and gating are plain code now, so there's no per-round LLM cost while nothing's actionable. What's left is judgment work, all on one tier:

| Work                                                   | Model    | Why                                                                             |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------- |
| Parent loop (triage, decide, sequence, recover)        | **Opus** | Reads the script's payload, classifies signals, and sequences fix subagents     |
| Fix / Test-fix (Phase 2)                               | **Opus** | Real code edits and regression debugging — no token upside to cheaping this out |
| Conflict resolution, category 3 only (Phase 2 restack) | **Opus** | Has to work out what both sides meant, sometimes from the commit history        |

For a failed required check, the parent reads the redacted CI log directly (`gh run view <workflow_run_id> --log-failed | tail -80`, then apply §"Redacting secrets") only when it's actually triaging that failure this round — never speculatively.

## Parameters

Only the first three are `nextAction.ts` CLI arguments, positional and in this order after `PR_NUMBER` (§"The `nextAction.ts` script"); `MAX_FIX_ROUNDS` is yours to track and isn't passed to the script at all.

| Parameter        | Default  | Description                                                                                 |
| ---------------- | -------- | ------------------------------------------------------------------------------------------- |
| `PR_NUMBER`      | Required | Any PR in the stack — Felix discovers the rest                                              |
| `QUIET_EXIT`     | 3        | Consecutive quiet rounds before declaring success                                           |
| `POLL_INTERVAL`  | 60       | Fewest seconds between poll checks. Longer on a big stack to stay under GitHub's rate limit |
| `POLL_TIMEOUT`   | 1800     | Max seconds to poll before exiting `HUMAN_REQUIRED` (30 min)                                |
| `MAX_FIX_ROUNDS` | 5 × PRs  | Max rounds where Felix makes code changes (parent bookkeeping, Phase 1)                     |

`MAX_FIX_ROUNDS` scales with the stack because a round fixes one branch (§"One branch per round") — a flat 5 stops a 9-PR stack before felix has touched every branch once. Five rounds per PR leaves room for a second pass over each; the "same signal attempted 2+ times" guardrail is what actually stops felix grinding on one thing.

## Prerequisites and Startup

Just run the script — don't gather, check, or verify anything by hand first:

```bash
node <skill-dir>/nextAction.ts "$PR_NUMBER" "$QUIET_EXIT" "$POLL_INTERVAL" "$POLL_TIMEOUT"
```

It validates `PR_NUMBER`, discovers the stack (`ci/`, `renovate/`, `dependabot/`, and `graphite-readonly/` branches are dropped automatically), loads or reinitializes `.felix-state.json` by `stack_signature`, detects required checks, and gathers+evaluates+polls until something is actionable. See §"The `nextAction.ts` script" above for how to react to its output — that's the whole main loop.

No separate auth check needed: a `gh` call fails with GitHub CLI's own `gh auth login` instructions if you're not authenticated. The script reads the stack with `gt-stack list` from `PATH`. Claude Code puts the eng plugin's `bin/` there, and a repo can put its own `bin/` there for a terminal. When it's missing, the script stops with "`gt-stack` isn't on PATH". The script writes `.felix-state.json` and `.repo/felix/next-action.json` under the repo root, so both need to be gitignored.

## Main loop

The script above owns the loop shape: gather → filter → gate → poll, repeated internally until it returns something actionable. What follows is what to do with each of its outputs.

- **`TRIAGE`** → Phase 1, then Phase 2 if anything's FIXABLE, then Phase 3/4 if anything was pushed. Then re-run the script.
- **`RESTART_CANCELLED`** → §"Handling cancelled required checks", then re-run the script.
- **`SYNC_TRUNK`** → §"Syncing trunk", then re-run the script.
- **`KEEP_POLLING`** → re-run the script with `--continue`.
- **`HUMAN_REQUIRED`** / **`DONE`** / **`STACK_LANDED`** → §"Exit conditions", no further script invocation this session.

`fix_rounds` and `MAX_FIX_ROUNDS` are the parent's own bookkeeping (the script doesn't track them) — increment `fix_rounds` yourself in Phase 1 and check it before starting a fix round.

```
── PHASE 1: Triage ──────────────────────────────────────────

  Classify each signal FIXABLE / UNHANDLEABLE / AMBIGUOUS (§"Triage").
  Stack-specific UNHANDLEABLE: a fix that needs cross-branch surgery
  Graphite can't cleanly restack (e.g., moving a file from PR B to A).

  Issue (timeline) comments have no thread to reply to, so an
  UNHANDLEABLE or already-considered issue_comment signal can't self-heal
  the way a review thread does. For each one you're not going to fix,
  advance that PR's last_check_timestamp (in .felix-state.json) to at
  least that comment's createdAt now — otherwise it re-triages forever
  with no progress. Do this even if nothing else this round is FIXABLE.

  A ci_failure signal has neither a thread nor a timestamp to self-heal
  with, and its checkRunId doesn't change until a new push — so an
  UNHANDLEABLE one would re-triage on every immediate re-run with no poll
  sleep in between. For each ci_failure you're not going to fix (this
  round or after the "2+ attempts" guardrail), set
  next_action_dismissed_ci_failures["<prNumber>:<checkName>"] in
  .felix-state.json to that signal's checkRunId before invoking the script
  again — nextAction.ts drops it from future TRIAGE payloads for that
  exact run and correctly falls through to a sleeping POLL instead
  (the check still counts as failing, so this never reaches DONE). Once
  the rest of the stack stays quiet for QUIET_EXIT rounds, the script
  returns HUMAN_REQUIRED naming every dismissed check and its PRs. Do
  this even if nothing else this round is FIXABLE.

  if no FIXABLE signals: re-run nextAction.ts (no fix_rounds++)

  fix_rounds += 1
  group the FIXABLE signals by branch (bottom → top), then file.

── PHASE 2: Fix (serial, bottom-up) ─────────────────────────

  Take ONLY the bottom-most affected branch this round
  (§"One branch per round"). Signals on every other branch are left for
  the next gather, which will have picked up whatever arrived meanwhile.

  branch = the bottom-most branch with FIXABLE signals:
    gt checkout <branch>

    for each file group on this branch:
      dispatch the Fix Subagent on the capable tier (Opus — see §"Model
      tiers") with the signals, file paths, PR description, and any
      skills repo.md names. For a
      CI-failure signal, fetch and redact the log yourself first
      (§"Redacting secrets"), then pass the redacted excerpt — not the
      raw log. collect: files changed, signal summaries, commit fragment.

    run tests for this branch (the repo's test command, see AGENTS.md or CLAUDE.md).
    if new failures introduced this round:
      dispatch the Test Fix Subagent (Opus) — ONE attempt.
      if still failing:
        STOP. Continuing pushes a broken commit that cascades up the
        stack via restack. Clear this PR's pending_replies (they point
        at code never committed), post a comment describing what's
        broken, save state, stop — don't re-run the script this session.

    if staged changes exist:
      verify each fix subagent's claimed signals against the diff
        (§"Verifying fix claims"). Dropped claims stay unresolved —
        the thread reopens next round (the script re-derives its
        disposition live, so there's nothing to un-mark).
      for each surviving review-thread signal, append a pending_replies
        entry on its PR (use the cross-branch marker from §"Comment
        principles" item 7 when the fix landed on a different branch
        than the thread). Set `resolve: true` on the entry only if the
        thread meets every bar in §"Resolving verbatim suggestions".
      flush .felix-state.json now — pending_replies must be durable
        before the push (crash-recovery anchor for Phase 4).
      git commit with a natural message from the fix summaries.
        (pre-commit lint-staged auto-fixes prettier/eslint on staged
         files; if the hook fails, investigate and let it stage its
         fixes — never --no-verify.)

    gt restack — propagate this branch's changes upward.
      If restack pauses on a conflict, `git status` for every conflicted
      file at *this* pause and classify each hunk (most conflicts are
      category 1 or 2 — resolve those yourself, no subagent):
        1. Import conflicts — merge mechanically (keep both sides,
           dedupe, re-sort if the file already enforces an order).
        2. Same lines touched by unrelated changes — merge mechanically,
           keeping both edits (usual answer: the parent's version with
           this branch's change reapplied on top).
        3. Same lines touched by *related* changes — one side's intent
           depends on or conflicts with the other's.
      If every conflicted file at this pause is category 1 or 2:
      resolve and `git add` them all yourself, then `gt continue`.
      If any file at this pause is category 3: don't `git add` or
      `gt continue` yet — dispatch the Conflict Resolution Subagent
      (Opus) with the paused branch and the PR descriptions of both
      sides, covering every conflicted file at this pause (mechanical
      ones included, so nothing half-staged is left behind). It
      researches the commit that added the opposing code (`git log -L`
      / `git blame` / `gh pr view`) for the category-3 files, stages
      everything, and runs `gt continue` itself — from here it owns the
      rest of the restack (every later pause, any category) until it
      finishes or a hunk can't be resolved; don't call `gt continue`
      yourself once a category-3 dispatch has happened. Report the
      category-3 files in the round summary along with the research
      that settled each one.
      If any hunk (any category) can't be resolved with confidence:
      STOP with the rebase still paused, post an explanation on the
      affected PR, don't re-run the script this session.
      Once the restack finishes, check the subagent's `validation`
      result if one was dispatched (§"Model tiers" — its felix-result
      schema, [subagent-prompts.md](subagent-prompts.md)). A null
      `validation` means `resolved: false` — already covered by the stop
      above. A populated `validation` that reports failing checks is a
      regression like any other (§"Fix" phase's test-fix step): dispatch
      the Test Fix Subagent (Opus), ONE attempt. Its edits land on
      commits the rebase already rewrote, so they don't reach `gt submit`
      on their own — `git add` and commit them on the current branch,
      then `gt restack` again to propagate the fix to any branch above
      (if that second restack itself pauses, handle it with this same
      procedure). If the Test Fix Subagent fails instead: STOP here —
      don't run `gt-audit` or push a restack with red tests.

    timeout 840 gt-audit (§"Long commands", which also covers `gtimeout`)
      Every finding giving the reason "refs changed during both audit
      attempts": another session moved refs while this one read them,
      so run timeout 840 gt-audit once more. Silent on that rerun
      means preserved.
      A "preservation not verified" finding whose reason ends in
      "comparison limit (20) reached" means the audit couldn't
      compare. So does "refs changed during both audit attempts"
      again on the rerun. Check those by hand. Run git fetch, then
      git diff -U0 origin/<branch> <branch> | git patch-id --stable
      for every branch in the stack. Branches below this one must
      print nothing, and this branch and every one above it must
      print the same patch id, which is this round's edit. The -U0
      matters, because a plain diff carries context lines that differ
      on a branch whose nearby lines changed. If they match, carry on
      and say so in the round summary.
      Any other output, or a diff that doesn't match, means a commit
      left a branch and nothing else reaches it. STOP, post the output
      on the affected PR, don't re-run the script this session
      (§"Cross-worktree gt lock").

  cross-stack sanity check on the top branch:
    the repo's full typecheck (see AGENTS.md or CLAUDE.md)
    (per-branch test runs above already cover each branch's modules;
     this catches restack regressions in typecheck. Lint and build are
     left to GitHub CI.)

── PHASE 3: Push ────────────────────────────────────────────

  gt submit --stack --no-edit --no-interactive

  if gt reports remote divergence:
    STOP. Do NOT force push. Post a comment on the top PR. Don't
    re-run the script this session.

── PHASE 4: Bookkeeping ─────────────────────────────────────

  for each PR's pending_replies entry:
    if its thread already has a `[felix] Fixed in #N upstack/downstack —`
      reply (a prior round explained it; re-posting is noise): do NOT
      reply again — just remove the entry from pending_replies.
    otherwise: reply on the thread with the saved fix summary (short,
      natural, references the now-pushed commit). If the entry carries
      `resolve: true`, resolve the thread right after the reply lands
      (§"Resolving verbatim suggestions"; command in
      github-commands.md §"Thread Operations"). Then remove the entry
      from pending_replies.

  if this round pushed a fix, re-request review — but ONLY from reviewers
    whose latest review state is CHANGES_REQUESTED (they blocked the PR).
    Commenters and approvers are not re-requested. (Command:
    github-commands.md §"Re-requesting review".)

  Do NOT post a per-round summary comment to the PR timeline. A "here's
  what I did this round" status comment is noise — the pushed commits and
  the on-thread replies already show the work. The only timeline comments
  felix ever posts are: on-thread review replies (above), surgical PR
  description updates (below), and the terminal exit-condition comment
  (see §"Exit conditions"). Per-round work is reported only in the
  parent's chat output (§"Output discipline"), never on the PR.

  if code on a PR drifted from its description, surgically update that
    PR's description (only the affected prose).

  for each PR with a FIXABLE issue_comment signal handled this round,
    advance that PR's last_check_timestamp to at least the latest
    handled comment's createdAt (mirrors the Phase 1 rule for
    UNHANDLEABLE ones — otherwise a fixed comment resurfaces forever
    too).

  flush .felix-state.json (pending_replies, fix_rounds,
    last_check_timestamp), then re-run nextAction.ts for the next round.

  Crash between Phase 3's push and here: the next round reads
  pending_replies from state and finishes them first, before re-running
  nextAction.ts.
```

### Why CI doesn't gate review-fix rounds

The obvious design — wait for CI, fix everything in one round, push once — falls apart here because review traffic is dominated by AI review bots that drip-feed comments faster than CI settles. A test run takes 10–20 min; a new bot comment can arrive every 30s. If felix waits for CI between review fixes, reviewer threads pile up unanswered for a full CI cycle per round. So the script's settling gate gates only CI-failure triage. Review and issue-comment signals go through as soon as they appear; the resulting push resets CI — that's the cost we accept.

## One branch per round

A `TRIAGE` payload is a **snapshot**, not a work list. It is accurate for the
few seconds the gather took and stale from then on — a reviewer adding a
comment, or a bot finishing a pass, does not reach felix until the next gather.

So a round handles one branch and then goes back for a fresh payload. Phase 2
takes the bottom-most affected branch, Phase 3 pushes it, Phase 4 replies, and
the script runs again. Branches higher in the stack come back on the next
round, against signals that are current.

Do NOT drain a whole stack's signals inside one round. On a stack of any size
that loop runs for tens of minutes to hours, and every minute of it widens the
gap between the payload and the PRs. A reviewer can submit several reviews
while one long round runs, and none of those comments reach the run until the
next gather. Pushing mid-round does not
help — the loop only re-reads GitHub when the script runs.

The corollary for a long fix: if you push, or a branch's fix takes long enough
that new review traffic is plausible, the payload in hand is spent. Finish that
branch's Phase 3/4 and re-gather rather than starting the next branch from it.

## CI scope: required checks only

Felix acts on required status checks **exclusively**. Non-required checks (E2E suites, review bots, dependency scanners, CodeQL) are out of scope everywhere: never fixed, never waited on, never treated as a blocker.

- The settling gate counts only required-check terminality.
- The quiet-round success criterion is "every required check has a passing conclusion" — SUCCESS, SKIPPED, or NEUTRAL (GitHub's three passing conclusions) — **or never ran at all** (e.g. a `paths-ignore`d workflow for this diff; GitHub's own `mergeable` computation already treats that as clean, so felix doesn't wait on a check that's never coming). **Not** `mergeStateStatus == CLEAN`: that flips to UNSTABLE the moment any non-required check fails, parking felix while required checks are all green. It does still reject `mergeStateStatus == UNKNOWN` specifically, though (alongside `BLOCKED`) — right after a push, GitHub often hasn't created check-runs for the new SHA yet, so a required check that will run in a few seconds reads exactly as ABSENT as one that's permanently path-filtered; `UNKNOWN` is the tell that GitHub itself hasn't finished computing mergeability for this snapshot yet, and is what keeps that race from producing a premature `DONE`. A `BLOCKED` PR is rejected for `DONE` too, but doesn't always mean "keep polling" — see §"Waiting on a reviewer" below.
- Signal filtering drops CI signals outside the required list.

`mergeStateStatus` is still consulted for two non-CI things: `DIRTY` (trunk conflicts) and `BLOCKED` (missing approvals — see §"Waiting on a reviewer" below).

**Empty required-checks list (fallback).** If detection ([github-commands.md §"Required Check Detection"](github-commands.md)) returns no required checks — rulesets the query can't enumerate, or a transient API failure — every per-check scan above goes _vacuously_ true: the settling gate passes with CI red, `all_required_green` is true with nothing checked, and signal filtering drops every CI failure as "not in the list." So when the list is empty, fall back to `mergeStateStatus` as the authoritative CI signal: `CLEAN` on a PR means terminal-and-green; anything else (`UNSTABLE`, `BEHIND`, `UNKNOWN`) means not-terminal — poll. felix can't tell which CI failures to fix without the list, so it does **not** triage CI signals in this mode; it only gates on `mergeStateStatus` and waits for the human or a later round that recovers the list.

`nextAction.ts` implements all of the above (`normalizeCheckRuns`, `isStackRequiredTerminal` in [nextActionCore.ts](nextActionCore.ts)) — this section documents the rule for when you're reading a `RESTART_CANCELLED`/`TRIAGE` payload or debugging the script, not something to re-derive by hand.

## Waiting on a reviewer

A green `BLOCKED` PR is usually blocked on a human, and no amount of polling changes that. `nextAction.ts` reads `reviewDecision` alongside `mergeStateStatus`, and a stack in that state reaches `HUMAN_REQUIRED` on the same round it would otherwise have reached `DONE` — the two share one settling path, so both need the same evidence:

- every required check green by the quiet-round rule above (`SUCCESS`, or never ran for this diff)
- no PR reads `UNKNOWN` — GitHub hasn't finished computing mergeability, so nothing can be concluded from that snapshot, and no quiet round is banked from it
- QUIET_EXIT consecutive quiet rounds, exactly as `DONE` requires. This is what separates "green and waiting on a reviewer" from "someone pushed 20 seconds ago and the check-runs don't exist yet", since both read green-and-`BLOCKED` for a moment
- some PR reads `BLOCKED` with `reviewDecision` of `REVIEW_REQUIRED` (nobody has approved) or `CHANGES_REQUESTED` (an approval was withdrawn and every thread already has a reply) — that PR is the one named in the `reason`

`APPROVED` and a null `reviewDecision` (base branch requires no review) instead keep polling and bank no quiet rounds: such a PR is `BLOCKED` on something this script can't name — GitHub's required-conversation-resolution rule, or a check outside the required list — so there's neither a human to point at nor grounds to declare success. Report the reason in chat and stop; don't post it on the PR, which just nags the reviewers.

## Syncing trunk

`SYNC_TRUNK` means a PR reads `DIRTY`: trunk moved after the last restack and the stack no longer merges. Felix fixes this itself, with the same restack procedure as Phase 2.

1. `git fetch origin main` and compare `git rev-parse origin/main` with `git merge-base origin/main <top branch>`. If they match, trunk hasn't moved and the conflict is inside the stack. Stop and post on the named PR.
2. `gt sync --no-restack`. It never takes `-f`. Answer no to any overwrite prompt, and if the `gt` wrapper refuses because another worktree has unpushed work on a tracked branch, don't override it. Fast-forward trunk instead with `git -C <main checkout> merge --ff-only origin/main` (only when that checkout is clean and on `main`), since a fast-forward can't reset anyone's branch. Never set `GT_SYNC_RESET_OK`.
3. `gt checkout <bottom branch of the stack>`, then `gt restack`, and resolve any pause with the Phase 2 conflict procedure. Then `timeout 840 gt-audit`. Any finding here stops the loop, including one the Phase 2 diff check would clear, because a trunk restack changes every branch.
4. The full typecheck on the top branch, as in Phase 2.
5. `gt submit --stack --no-edit --no-interactive --force --ignore-out-of-sync-trunk`. The restack rewrote every branch, so the push needs `--force`.
6. Re-run the script. GitHub can report `DIRTY` for a few seconds after the push. If it comes back `SYNC_TRUNK` and step 1 says trunk hasn't moved, wait a minute and re-run. Stop and report in chat after the second time.

A sync round doesn't count toward `MAX_FIX_ROUNDS` and leaves `pending_replies` alone.

## Expected CI setup

Felix expects the repo to run two workflows. `.github/workflows/heal-zombie-cancels.yml` reruns the cancelled twin of a concurrency race on each push, so most cancels never reach felix. The `gathertown/stack-position` action skips each required check on a PR below the top of a Graphite stack. Those checks report `skipped`, which counts as passing. Without them, expect more `RESTART_CANCELLED` rounds and a full CI run on every PR in the stack.

## Handling cancelled required checks

Cancellations are common here (flaky shards, concurrent pushes from restacks, a test job SIGINT'd while a long E2E runs). A cancel is not a failure — no verdict was produced — so don't triage it as a failure or count it as a pass.

One push can create two workflow runs per required check for the same head SHA, and a concurrency group cancels one of them. That cancelled twin never reaches you as a signal: `normalizeCheckRuns` ranks a cancelled run last, below a live one and below anything the surviving run reported — including `skipped`, which GitHub counts as satisfied. So the pair reads `RUNNING` while the sibling is going and takes the sibling's answer once it lands. The sibling's jobs can take a minute or more to appear when they wait on a gate job. A workflow that reruns the cancelled twin cancels the survivor in turn. So `treatLiveTwinsAsRunning` also reads a cancelled check as `RUNNING` while another `pull_request` run of its workflow on the same head SHA hasn't completed. The check's own run doesn't count, so a job cancelled while a long E2E keeps that run going still reads `CANCELLED`, and your own `gh run rerun` stays tracked by `next_action_restart_counts`. Restarting the twin would be futile anyway — its sibling holds the concurrency group, so every attempt cancels again, and two rounds of that is enough to trip the twice-cancelled safeguard below on a PR where nothing is wrong. `nextAction.ts` already determined the effective state and returned `RESTART_CANCELLED` with the cancelled check(s) that are actually restartable this round (`prNumber`, `checkName`, `checkRunId`, `workflowRunId`) — review threads and comments go first, so it fires only when none are pending, and it's decided per check: a check that's already cancelled twice or has no restartable workflow run never blocks a genuinely fresh cancellation on a different check. Your job:

```bash
gh run rerun <workflow_run_id> --failed        # rerun failed/cancelled jobs in a run
# if a long E2E is hogging the run and blocking the rerun:
gh run cancel <workflow_run_id> && gh run rerun <workflow_run_id> --failed
```

Then, for each restarted check, set `next_action_restart_counts["<prNumber>:<checkName>"]` in `.felix-state.json` to that signal's `checkRunId` (the one you just restarted, from the payload — not a count, and not the workflow run id) **before** invoking the script again. This is the only way the script can tell "the run we already restarted is still propagating" from "that restart's replacement run also got cancelled" — it never calls `gh run rerun` itself and has no other record of what happened. A rerun creates a brand-new, higher check-run id; GitHub can keep reporting the OLD run as cancelled for a few seconds before the new one appears, so recording a plain counter (rather than the specific run id) would make Felix declare `HUMAN_REQUIRED` on the very next round even though nothing actually cancelled twice. Skipping this update entirely means the same flaky check can cancel forever without ever tripping the twice-cancelled safeguard below.

Never dispatch a fix subagent for a cancelled check — you restart it, you don't fix it. `HUMAN_REQUIRED` in place of `RESTART_CANCELLED` means nothing in the current cancelled set could be auto-restarted, for one of two reasons named in the `reason` string:

- **`workflowRunId` couldn't be determined** — the check's details URL didn't match the expected GitHub Actions job URL shape. There's nothing to `gh run rerun` — restart it manually (or from the GitHub UI) and tell the human what happened; don't retry the same lookup yourself.
- **Cancelled twice this session** — the run you already restarted for that PR/check pair has since been replaced by a new one, and the new one cancelled too. Likely infrastructure, not flake — see §"Exit conditions", don't restart it again. (If instead the script is just seeing the _same_ run you already restarted still reporting cancelled, that's normal propagation lag — it returns `POLL` internally, not `HUMAN_REQUIRED`, and needs no action from you.)

Either way, this only blocks the checks actually named in the reason — a genuinely fresh cancellation on a _different_ check still comes back as its own `RESTART_CANCELLED` on a later round once you've handled this one.

## Percolated CI failures

A bug in a lower branch is present in every branch above it (each branch contains the commits below it), so one root cause fails the same required check on several PRs at once. Fix it once, on the lowest branch, and let the Phase 2 restack carry the fix upward.

Under §"One branch per round" that comes for free. Percolation means every branch from the root cause upward reports the failure, so the bottom-most branch with FIXABLE signals always holds the lowest copy of it — fix that branch and the copies above it disappear on the next round's restack. There is nothing to dedup, and no reason to fetch a log for a check on a branch this round isn't touching. One copy that survives the restack was an independent failure all along, and routes to its own branch on a later round.

The exception is a failure whose root cause sits in a branch _below_ the lowest one reporting it — a path filter kept the check from running downstack. Check out the branch that owns the code rather than the one the check went red on, so the restack carries the fix to every branch above.

Review threads and issue comments are never grouped or dropped this way; each stays on the PR it was left on.

## Signal filter rules

`nextAction.ts` (`filterReviewThreads`, `filterIssueComments`, `filterCiChecks` in [nextActionCore.ts](nextActionCore.ts)) already applied these before a `TRIAGE`/`RESTART_CANCELLED` payload reaches you — this documents what it did, for context when reading a payload or debugging the script:

- Resolved review threads are dropped.
- A thread's disposition is derived live from the newest comment on it, not from any persisted ID — see §"The `nextAction.ts` script" and `disposeReviewThread`. Concretely: an unresolved thread whose newest comment is a plain `[felix]` reply is dropped (addressed); one whose newest comment starts the exact `[felix] Decision needed —` marker is pending ambiguous, not actionable, and rides along in the payload's `ambiguousSignals` field; anything else unresolved is actionable, including a thread where a human replied after felix's own last reply.
- CI checks outside the required list are dropped (if the list is empty, this drops every CI signal by design — felix gates on `mergeStateStatus` instead; see §"CI scope" empty-list fallback).
- Issue comments are **not** filtered by author — the human reviews from the same account felix posts from. Triage by content; felix's own `[felix]`-prefixed comments don't match any FIXABLE pattern and drop out naturally.
- Bot-authored issue comments are dropped (e.g. dependency-scan summaries, coverage bots) — actionable bot feedback arrives as review threads or required-check failures, never as timeline issue comments. This is distinct from a `Bot`-authored **review thread** (a review bot's finding, say), which is a different signal type and is never dropped.
- Graphite's stack-dependency comment is dropped by its trailing `<!-- Current dependencies on/for this PR: -->` marker, even though it's posted from the PR author's own `User` account (so neither the bot filter nor the `[felix]` prefix would otherwise catch it).

## Triage classification

- **FIXABLE** — clear, scoped change within the PR's intent.
- **UNHANDLEABLE** — too large, architectural, out of scope, or attempted and failed 2+ times before. For a review thread, Felix files a ticket in the repo's issue tracker for the deferred work, then replies on-thread with a `[felix]` deferral that links it — the plain `[felix]` prefix is enough for the next `nextAction.ts` round to see the thread as addressed and drop it, no ID to record anywhere. A reply that only says "noted", "filed for later", "out of scope for this PR", or anything else without a ticket link is forbidden: that's dropped work, and the thread disappears from triage the moment the reply lands. File it in Triage rather than the backlog, where it gets noticed. Give it the same parent as the PR's linked ticket and mark it related to that ticket. Don't nest it under the linked ticket, because sub-issues of sub-issues pile up and get lost. repo.md names the tracker and any field conventions. A PR with no linked ticket can't take a deferral: treat the thread as AMBIGUOUS instead and ask the author for a ticket in the `[felix] Decision needed —` reply, so it keeps surfacing until they answer. For a `ci_failure` signal, there's no thread to reply on, so instead set `next_action_dismissed_ci_failures` for it (§"The `nextAction.ts` script", Phase 1).
- **AMBIGUOUS** — can't confidently tell what's wanted, or the right fix needs a decision only the PR author can make. Felix replies on-thread with a comment that starts with the exact marker `[felix] Decision needed —` followed by an @-mention of the PR author, then states three things: what it verified, why it isn't auto-fixing, and the concrete question to answer. The exact marker matters: `nextAction.ts` re-derives the pending-decision status from it every round (see §"The `nextAction.ts` script"), so a thread you've already flagged this way keeps showing up in `ambiguousSignals` — not `signals` — until the author answers or resolves it, and it's what lets a `DONE` exit correctly say "N decisions still waiting on you" instead of an unqualified success. A bare bot thread with no felix reply is indistinguishable from a missed thread when the author reviews the PR — chat-side reporting is invisible at review time, so the thread itself must carry the marker.

A signal is not UNHANDLEABLE merely because CI is running or felix recently pushed.

**Bias toward action, not deferral.** UNHANDLEABLE and AMBIGUOUS are the expensive classifications — each one costs the author a round trip. Default to fixing. Size alone isn't a reason to defer: a large changeset usually belongs in a new branch at the TOP of the stack, where it can't conflict with the branches below, so reach for that before deferring. When genuinely torn between fixing and deferring, ask the author rather than picking deferral by default.

## Verifying fix claims

Before replying to a thread, confirm the fix subagent actually addressed it — its self-reporting is the weak point (two threads with identical "and here" bodies on adjacent lines can both get claimed after a single edit). Per claimed signal:

- The staged diff must touch the signal's file. If not → drop the claim.
- **Single-line pin**: a touched hunk within a few lines of the signal's line counts (subagents legitimately rewrite surrounding code).
- **Range** (`start_line..line`): the touched hunks must cover the whole range, not clip one end — a reviewer who highlights ten lines and says "remove" wants all ten gone. A partial touch means mid-trim; leave it open.
- **Outdated** (base SHA drifted, line numbers may be stale): judge by content — does the diff plausibly address what the comment asked, per the subagent's summary? If you can't tell, drop it.

Dropping a claim means: don't add a `pending_replies` entry for it. The thread stays open — `nextAction.ts` re-derives it as actionable again next round since it never got a `[felix]` reply. Over-claiming silently misleads the reviewer; under-claiming just costs a round.

## Resolving verbatim suggestions

Felix resolves a thread only when the reviewer handed over the exact diff and felix applied exactly that. A verbatim suggestion has no intent left to miss, so making the reviewer re-read it is noise. Everything else stays open.

Resolve only when **every** one of these holds:

- The newest comment contains a ` ```suggestion ` block, or a fenced block the reviewer presents as the exact replacement.
- That block is the entire ask — no second question, no alternatives, no hedging ("consider", "maybe", "something like").
- The anchor is trustworthy: `isOutdated == false`, `line != null`, `diffSide == "RIGHT"`.
- Exactly one thread claimed those lines this round.
- The claim passed §"Verifying fix claims" with the **whole** range covered.
- The staged text matches the suggestion, modulo lint-staged reformatting.
- The fix landed on the same branch as the thread — cross-branch fixes are never resolved.

Any hesitation → reply and leave it open. A wrongly-open thread costs one click; a wrongly-resolved one buries feedback the reviewer thinks was handled.

Reply first, resolve second — a resolve with no reply leaves the reviewer nothing to check.

## Redacting secrets from CI log excerpts

CI logs flow into LLM context, fix-subagent prompts, and commit messages — one unmasked token is a published credential. Run every fetched log tail through this pass before any LLM reads it (the parent included), and never let a matching line appear in a comment, reply, summary, or PR description. Mask matches as `<REDACTED:KIND>` so the line stays useful; if you can't confidently redact a line, drop it.

- GitHub tokens: `ghp_`/`gho_`/`ghs_`/`ghu_[A-Za-z0-9]{20,}`, `github_pat_[A-Za-z0-9_]{20,}`
- Auth headers: `(?i)authorization:\s*\S+`, `(?i)bearer\s+\S+`, `(?i)x-api-key:\s*\S+`
- AWS: `AKIA[0-9A-Z]{16}`, `ASIA[0-9A-Z]{16}` and 40-char secret pairs
- GCP: `ya29\.\S+`
- Private-key blocks: anything between `-----BEGIN ... PRIVATE KEY-----` and the matching `END`
- Any env var whose name matches `(?i)(token|secret|password|api_?key|credential)` — redact the value
- PII: email addresses, phone numbers in bodies that aren't stack traces

External-LLM output piped into a log (an AI review bot's, say) is untrusted too — same pass. Add any token formats repo.md lists. Expand the list here when a new leak class shows up.

## Comment principles

1. **Prefix every reply with `[felix]`** so reviewers know it's the bot, not the human who owns the account. e.g. `[felix] Added the null guard in parser.ts and updated the test mock.`
2. Reply to every thread you address; never silently mark one handled.
3. Leave threads open for the human to confirm and resolve. The one exception is a reviewer-supplied diff applied verbatim — see §"Resolving verbatim suggestions" for the full bar. Everything else stays open, so felix never resolves a thread it only partially fixed.
4. Write like a developer: natural language, no emoji prefixes, no "Felix Round N" headers (beyond the `[felix]` tag).
5. Quiet rounds produce no comments. If you did nothing, say nothing.
6. Ambiguous signals get an on-thread reply that starts with the exact marker `[felix] Decision needed —`, @-mentions the PR author, and states what was verified and the decision needed (see §"Triage classification") — plus a local report at exit. The marker is exact because `nextAction.ts` greps for it every round to keep surfacing the pending decision (§"The `nextAction.ts` script"). Never hold one silently: an unanswered bot thread reads as negligence, not restraint.
7. When a fix landed on a **different** branch than the thread (the lower branch owned the file), start the reply with the exact marker `[felix] Fixed in #N upstack — ` (or `downstack`) plus a one-sentence description. Future rounds grep for this marker and skip the thread even if reopened, so felix doesn't re-explain. Same-branch fixes use the plain `[felix]` prefix.

## Output discipline

Felix runs in the parent LLM's chat, so every line of Claude text is shown to the watching human, who only cares about two things: did felix change the PR, and is it done? Everything else is noise that dominates the chat during a long CI cycle.

**A round that produces no observable change — the script returned another `POLL` internally and kept going, or came back `KEEP_POLLING` — emits zero Claude prose.** `nextAction.ts` runs in the foreground and blocks through all of that on its own; its stderr heartbeat is the status channel, not something to narrate. Don't narrate phase names, decision-tree restatements, check-by-check readouts, or "now polling" trailers appended to otherwise-fine prose.

Claude text is reserved for: a one-or-two-sentence summary of a real action _just_ taken (push landed, reply posted) — stop after the action, no "now polling" trailer; errors that stop the loop; the startup line; the final exit message.

## Cross-worktree gt lock

`gt` writes are serialized across worktrees by the `gt` wrapper (see the `graphite-workflow` skill). Felix is
the most likely source of contention: a long CI wait ends in a flurry of restacking, so two loops
converge on writing at nearly the same moment.

- **Waiting is normal.** `gt: waiting on ...` on stderr during Phase 2 or 3 means another worktree
  holds the lock. Don't narrate it, don't retry, don't reach for `GT_NO_LOCK`.
- **A failed acquire is a stop-and-report.** `gt: timed out after ...` means the holder ran longer
  than the wait. Post what the message says about the holder and stop; don't re-run this session.
- **Never `gt-unlock --kill`.** Ending another worktree's in-flight `gt` can leave it
  half-rebased. Defer to the human.

## Safety guardrails

| Guard                                    | Threshold | Action                                                                                                                                                                                                                      |
| ---------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files changed in one fix round           | > 10      | Abort the round, post comment for human review                                                                                                                                                                              |
| Net lines changed in one fix round       | > 200     | Flag in chat output (don't abort)                                                                                                                                                                                           |
| New dependency added                     | Any       | Flag in chat output                                                                                                                                                                                                         |
| Test file deleted                        | Any       | Abort that specific fix, flag                                                                                                                                                                                               |
| Same signal attempted 2+ times           | 2 prior   | Skip on the third attempt, mark for human                                                                                                                                                                                   |
| File outside the PR diff touched         | Any       | Flag; require explicit intent                                                                                                                                                                                               |
| CI/infra path touched                    | Any       | Abort the round, post comment for human review                                                                                                                                                                              |
| Test-fix subagent fails                  | 1 attempt | STOP, post on PR, don't re-run the script this session                                                                                                                                                                      |
| `gt restack` conflict                    | Any       | Resolve import/unrelated-line conflicts directly; dispatch the Conflict Resolution Subagent only for related-line conflicts. If any hunk can't be resolved, STOP, post on affected PR, don't re-run the script this session |
| `gt submit` reports remote divergence    | Any       | STOP, post comment on top PR, don't re-run the script this session                                                                                                                                                          |
| `nextAction.ts` returns `HUMAN_REQUIRED` | Any       | Handled entirely by the script (untracked branch, twice-cancelled check) — post per §"Exit conditions", don't re-run                                                                                                        |
| Branches fixed in one round              | > 1       | Finish the current branch, push, re-gather (§"One branch per round") — never drain a stack from one payload                                                                                                                 |
| Stack shape changes mid-round            | Any       | `nextAction.ts` detects the `stack_signature` change and restarts state itself                                                                                                                                              |

`gt sync --no-restack` runs only for a `SYNC_TRUNK` result (§"Syncing trunk"), never as a fix for anything else.

### Off-limits paths

Off-limits unless the PR explicitly touches them — reject and flag any fix-subagent change to:

- `.github/workflows/**` — workflow tampering
- `**/credentials*` — secret-adjacent
- any path repo.md adds

### Forbidden commands

From graphite-workflow's defer-to-human list: `gt sync` in any form but `gt sync --no-restack` for a `SYNC_TRUNK` result (never `-f`, never answer yes to an overwrite prompt), `gt delete`, `git push --force`/`--force-with-lease` on a tracked branch, `git rebase` on a tracked branch (use `gt restack`). Also `gt-unlock --kill` and `GT_NO_LOCK=1` (§"Cross-worktree gt lock").

### Regression detection

Felix does NOT auto-revert. New CI failures after a push get picked up by the next round's gather and fixed forward. If the test-fix subagent can't resolve a regression on one attempt, STOP (a regression cascades up the stack via restack). Reverting and pushing-another-broken-commit are both destructive human decisions.

## Exit conditions

Once you've reacted to a terminal `nextAction.ts` result — or you've stopped for a fix-round safety guardrail — the session is over: don't re-run the script again until the condition below is resolved (usually by a human).

| Condition                                    | `nextAction.ts` result | Final comment                                                                         |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| QUIET_EXIT consecutive clean rounds          | `DONE`                 | "All feedback addressed and required checks passing." (top PR) — see the caveat below |
| Every PR merged or closed during loop        | `STACK_LANDED`         | None                                                                                  |
| Untracked branch, twice-cancelled check      | `HUMAN_REQUIRED`       | The `reason` string, posted on the named PR if it's PR-facing (twice-cancelled)       |
| Green stack BLOCKED on review (§ above)      | `HUMAN_REQUIRED`       | None — report the `reason` in chat; a PR comment just nags reviewers                  |
| Only dismissed CI failures left, stack quiet | `HUMAN_REQUIRED`       | None — report the `reason` in chat                                                    |
| POLL_TIMEOUT elapsed with nothing actionable | `HUMAN_REQUIRED`       | None — report the `reason` in chat                                                    |
| MAX_FIX_ROUNDS exhausted                     | (parent-tracked)       | Per-PR summary of remaining items                                                     |
| Unresolvable merge conflict or restack fail  | (parent-tracked)       | Explanation on the affected PR                                                        |
| Test regression not auto-fixable             | (parent-tracked)       | Summary on the owning PR + preserved state                                            |
| Remote stack divergence on push              | (parent-tracked)       | Explanation on the top PR                                                             |
| Repeated subagent failures                   | (parent-tracked)       | Explanation on the top PR                                                             |

**Before posting a `DONE` comment:** check the decision's `ambiguousSignals` (it rides along even on a clean exit — see "The `nextAction.ts` script" above). If non-empty, verify each one already has its on-thread `[felix] Decision needed —` reply (see "Triage classification") — post any that are missing — and say so in the exit comment ("required checks passing; N decisions still waiting on you" with the thread locations) instead of the unqualified "Ready for you to land." Decision replies come BEFORE the exit comment so the timeline never claims success and then sprouts open questions. `pending_replies` in `.felix-state.json` should also be empty before declaring done — flush any that are left first.

## Parallelism rules

Stack discovery, per-PR gathering, filtering, and polling all happen inside `nextAction.ts` — parallelized in code (`Promise.all`), not an LLM concern. What's left for the parent to sequence:

| Step                                    | Parallel? | Reason                              |
| --------------------------------------- | --------- | ----------------------------------- |
| Fix subagents (across or within branch) | No        | Bottom-up topology + file conflicts |
| `gt restack` / `gt submit`              | No        | Serial / atomic                     |
| Tests, commit, bookkeeping              | No        | CPU-bound / ordering matters        |

## Skill dependencies

- **graphite-workflow** — every `gt` command and the non-negotiable defer-to-human list. Felix has standing permission for one item on it, resolving `gt restack` conflicts.
