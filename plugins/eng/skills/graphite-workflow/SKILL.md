---
name: graphite-workflow
description: Manage Graphite stacked PRs and git worktrees. TRIGGER when (1) creating git worktrees, (2) pushing commits to any PR branch, (3) addressing PR review feedback, or (4) doing any git push on a non-main branch.
---

# Graphite Stacked PR Workflow

If `repo.md` sits next to this file, or `.claude/eng/graphite-workflow/repo.md` exists in this repo, read it first. It holds this repo's commands and conventions. Where it conflicts with this skill, follow it.

`gt` is the Graphite CLI; use it for every stack operation. `gt help <command>` for flags.

Load on demand:

- [pr-content.md](pr-content.md) — PR titles, descriptions, test plans, the `gh pr edit` heredoc.
- [review-feedback.md](review-feedback.md) — fetching, addressing, and replying to review comments.

## First: is the branch tracked?

```bash
gt-stack list
```

Exit 0 or 1 means tracked, since 1 is a branch that forks upstack. Exit 2 means it isn't. Any other exit means the check failed, so stop and report it (full table in `gt-stack list --help`).

- **Tracked** → push with `gt submit --no-edit --no-interactive`, or `gt submit --stack --no-edit --no-interactive` for the whole stack. Never raw `git push` — it skips restacking upstack branches and PR dependencies, and the stack silently drifts.
- **Not tracked** → plain `git push` is fine.

If anything sits upstack of the branch you changed, run `gt restack` before you submit. `gt submit` checks that every branch is restacked and aborts if one isn't — it won't rebase them for you unless you pass `--restack`.

Check before every push on a PR branch, including review-feedback pushes.

## Rules for existing stacks

1. **Survey first.** `gt-stack list --json` (fields in `gt-stack list --help`), then read each PR's description (`gh pr view <n>`). Know what every branch owns before you touch anything.
2. **Put the change where it belongs** — the branch that introduced the bug or owns that layer, not whatever is checked out.
3. **`gt restack` after every change**, before navigating up.
4. **Work bottom-to-top:** lowest branch needing changes → change, commit, validate → `gt restack` → `gt up` → repeat.
5. **Validate on each branch** before moving on, with the repo's typecheck and test commands (see AGENTS.md or CLAUDE.md). Update the PR description if the change was substantial.

## Defer to human

Never on your own initiative:

- **Merging/landing a stack** — see below.
- **Resolving rebase conflicts** — warn, offer to hand over, proceed only if explicitly told to. The `felix-loop` skill has standing permission for `gt restack` conflicts.
- **Force pushing over a diverged remote** — if `gt submit` warns about divergence, stop and ask. Force pushing with raw git during this workflow means something is wrong.
- **`gt delete` on a branch with an open PR.**
- **`gt sync`** — triggers interactive conflict, overwrite, and branch-deletion prompts, and a yes to an overwrite resets other worktrees' branches (see "Worktrees share Graphite's state"). Ask first. Exception: `gt sync --no-restack` when the felix-loop skill gets a `SYNC_TRUNK` result.

## Rebase conflicts (only with permission)

Resume with `gt continue`, **never `git rebase --continue`** — raw git desyncs the stack metadata and breaks later `gt` operations. Applies to any paused rebase (`gt restack`, `sync`, `absorb`, `edit` steps).

1. `git status` for the conflicted files.
2. Resolve each, remove `<<<<<<<` / `=======` / `>>>>>>>` markers.
3. `git add <file>`.
4. `gt continue`; repeat for later conflicts.
5. `gt-stack list` to verify the stack.

Ambiguous conflict — both sides plausible, intent unclear from the diff, or the right answer is a third option — stop and ask. Resolve autonomously only when the merge has one mechanical answer.

Bailing out with `git rebase --abort` is safe (it doesn't touch Graphite metadata), but ask first.

## Creating branches and stacks

Base branches on **local** refs, never `origin/*`. Graphite tracks against local refs; a branch cut from `origin/main` makes `gt track` record origin-only commits as yours, and a later `gt move`/restack replays them into the stack.

- Destined for an existing stack? Branch directly off its intended parent — don't branch off main and `gt move` it in.
- `gt create` prints `(includes N commits)`. N ≠ the number you authored → STOP and fix the base before anything else.
- After any `gt create`, `gt move`, or restack, verify with `git log --oneline <parent>..<branch>` — it must list exactly that branch's own commits. PR base branches are not sufficient proof.

`gt create` makes the branch and tracks it in one step. Run it on a clean tree so the branch starts empty, then edit and commit.

```bash
gt checkout main                    # local trunk, or the intended parent
gt create <user>/<feature-part1>    # empty branch first
# ...changes...
git add -A && git commit -m "feat: first part"
gt create <user>/<feature-part2>
# ...changes...
git add -A && git commit -m "feat: second part"
gt submit --stack --no-edit
```

**"New PR upstack"** means the true top of the whole stack: `gt top`, then `gt create`. Branching off a middle branch forks the stack (two children on one parent) and is annoying to unwind. If the request is ambiguous about where, default to the top and say so.

**Insert mid-stack** (only when explicitly asked for a specific position):

```bash
gt checkout <parent-branch>
gt create <user>/<new-middle-branch>
# ...changes, commit...
gt move --onto <new-middle-branch> --source <old-child-branch>
gt restack
gt submit --stack --no-edit
```

**Modify an existing branch:** `gt checkout <branch>` → changes → `gt modify -a` (amend into last commit) or `gt modify -cam "msg"` (new commit) → `gt restack` → `gt up` and verify each branch → `gt submit --stack --no-edit`.

## Navigation

| Task                        | Command                       |
| --------------------------- | ----------------------------- |
| List stack branches         | `gt-stack list`               |
| List stack with PR metadata | `gt-stack list --json`        |
| Go to specific branch       | `gt checkout <name>`          |
| Move up/down the stack      | `gt up` / `gt down`           |
| Go to top/bottom of stack   | `gt top` / `gt bottom`        |
| Submit full stack           | `gt submit --stack --no-edit` |
| Undo last gt operation      | `gt undo`                     |

## Creating a worktree

If the user didn't name a base branch, ask: `main` or the current branch. Then cut it from the **local** parent and track it:

```bash
git worktree add -b <user>/<branch-name> <path> <parent-branch>
cd <path> && gt track --parent <parent-branch>
```

Never use an `origin/*` ref as the parent. Graphite tracks local refs, so a branch cut from `origin/main` makes `gt track` record the origin-only commits as yours.

A new worktree lacks the main checkout's gitignored files, such as env configs and local settings. Run `symlink-gitignored-files-for-worktree` from its root. It links each path in `.claude/eng/worktree-symlinks.txt` from the main checkout, one path or glob per line. If `.claude/eng/worktree-setup.sh` exists, it runs that afterward for any setup your repo needs.

Once it exists, `cd` there and **stay in the worktree** — commits, validation, submitting — until the work is done. Don't substitute the Agent tool's `isolation: "worktree"`; it can leak uncommitted files back to the main tree.

Remove with `git worktree remove <path>` — the branch survives.

## Worktrees share Graphite's state

Every worktree of a repo has its own HEAD, index and rebase state, and they all share one set of
branch refs, one object store, and one copy of Graphite's metadata. Two worktrees running a `gt`
write at the same time can leave a branch pointing behind work the other just committed.

The `gt` wrapper in `bin/` serializes those writes. It takes a kernel lock on the shared git
directory, runs the real `gt`, and releases when the command exits. It sits ahead of Graphite's own
`gt` on `PATH`, so bare `gt` is already the wrapped one. Reads and navigation — `log`, `checkout`,
`up` — don't lock.

- A wait prints `gt: waiting on ...` to stderr after ten seconds and names who holds it. Expected;
  don't narrate it.
- `gt-unlock` says whether the lock is held and by which worktree. `--kill` ends the holder,
  which can leave that worktree half-rebased — a defer-to-human operation.
- **Never `rm`, `mv` or truncate `gather-gt.lock`.** Locks attach to an inode, so replacing the file
  leaves two processes locking two different things and serializing nothing.
- `GT_NO_LOCK=1 gt ...` skips the lock. It exists for emergencies; using it during known contention
  is how a branch loses a commit.

The lock serializes writes. It does not scope them, and `gt sync` can rewrite branches nobody asked
it about. With `-f`, or with a yes to its overwrite prompt, it resets every tracked branch that
differs from `origin/<branch>` to the remote tip, repo-wide, except the ones checked out in a
worktree. Without `-f`, `--no-interactive` and `--quiet` leave those branches alone. Never pass
`-f`, and answer no to an overwrite prompt unless you know the local tip is disposable. Restack and
submit in one step.

`gt sync` also restacks by default. It rebases every tracked branch in the repo that restacks
cleanly onto the new trunk. It doesn't push, so those branches come back ahead of their remotes and
block the next worktree's sync. Pass `--no-restack`, then `gt restack` on the stack you're on.

- The wrapper refuses a `sync` that would reset a branch another worktree moved in the last 6 hours
  and hasn't pushed, naming the branch and the worktree. `gt-sync-check` runs the same check on its
  own.
- `GT_SYNC_RESET_OK=1 gt sync` runs it anyway. Same footing as `GT_NO_LOCK`: don't, unless the other
  worktree's work is genuinely yours to throw away.

The lock is cooperative, so it only covers invocations that resolve through the wrapper. An absolute
`/opt/homebrew/bin/gt`, raw `git`, and IDE Git integrations still write refs. `gt-audit` covers
those. A `reference-transaction` hook logs every `refs/heads/*` move from every tool with the OID
the ref pointed at beforehand. The audit checks whether that tip's file changes appear in reachable
history. It matches complete trees and uses isolated virtual merges for earlier branch versions.
Every finding says `preservation not verified`. Git could not prove the content survived, which is
not the same as the content being gone, so read the `reason:` line. A reason of `comparison limit`
or `refs changed during both audit attempts` means the check never finished, and `conflict` or
`no matching tree` means Git compared and found nothing holding those changes. The audit prints
nothing when every move checks out, and never fails the command that ran it.

- `gt-audit` after a restack, sync or submit. Any output is a stop-and-report.
- It reads the moves made in this worktree. `--all-worktrees` reads every worktree sharing the
  git directory, for `--list` as well.
- `gt-audit --explain` prints the preserving commit or incomplete check details on stderr.
- `gt-audit --list` answers "which branches moved in the last half hour, and from where".
- The log lives in the shared git directory. To install the hook that writes it, see
  <https://github.com/gathertown/eng-workflow#log-branch-moves-for-gt-audit>.

## Submitting

`gt submit` creates **new** PRs as drafts with a derived title and empty body; fix both immediately after. **Never trust `--no-edit`'s title** — it's built from `local-main..tip`, so whenever local `main` is behind (stale in worktrees, or you branched off `origin/main`) it titles the PR from an already-merged commit.

It never changes the draft/ready state of a PR that already exists — only `gt submit --publish` does, and don't pass it unless asked. A resubmitted PR that comes back ready was published by a human; leave it alone.

```bash
gt submit --stack --no-edit
gh pr edit <PR-number> --title "<type>: <summary> [<TEAM>-XXX]" --body-file <path>
```

Title, body, and test-plan rules: [pr-content.md](pr-content.md). Never leave a PR on the Graphite-generated title or an empty body.

## Reporting PRs back

Link **Graphite**, not GitHub — it shows stack context GitHub omits.

```
https://app.graphite.com/github/pr/<org>/<repo>/<PR-number>
```

`gt submit` prints both; prefer the Graphite one. Translate GitHub URLs if that's all you have. Applies to every submit — new stacks, restacks, feedback pushes.

## CI runs on the top of the stack

In a repo whose workflows gate on the [`stack-position`](https://github.com/gathertown/stack-position) action, the gated jobs skip on a PR with an open PR stacked on it, draft or not. Their required checks report `skipped`. The top PR's run covers every PR below it.

To run full CI on a lower PR, add the `ci/run-full` label. Then re-run the skipped workflows from the PR's Checks tab. The gate reads labels at run time, so no new commit is needed, and every later push on that PR runs full while the label stays.

Merge a stack only once its top is green. A `skipped` check on a lower PR means CI ran on the top PR instead.

## Merging a stack (human-supervised)

Triggered by "merge the stack", "land the stack", "merge all". Only on explicit request, and only once the stack's required checks pass. `gt-stack merge` checks neither CI nor approvals, and it merges with `--admin`. When `repo.md` names a merge command, use it. Otherwise preview with `gt-stack merge --plan`, show the user, then run `gt-stack merge` once they say go. `--plan` runs `gt sync -d`, which deletes local branches whose PRs already landed.

A non-zero exit goes to the human with its error. Don't retry blindly.

## Review feedback

Full workflow in [review-feedback.md](review-feedback.md). Non-negotiables: fix on the branch the comment lives on, prefix replies with `[felix]`, and leave threads open for the human — the sole exception is a reviewer-supplied diff applied verbatim, which review-feedback.md gates.

## Agent notes

- **Track every new branch.** Created while on a tracked branch → `gt track --parent <current-branch>` (avoids the interactive parent picker). Applies to features, docs, config, skills alike. Unsure whether it should stack or sit on main? Ask.
- **Interactive commands hang.** `gt checkout` (no args), `gt move` (no args), `gt reorder`, `gt split`. Always pass explicit arguments.
- Pipe through `cat` to capture output: `gt submit --stack --no-edit 2>&1 | cat`.
- Inspect stacks with `gt-stack list`, not `gt log short`.
- Default submit: `gt submit --stack --no-edit` (`gt ss -n`).
- Default sync: `gt sync --no-restack`, then `gt restack` for your stack.
