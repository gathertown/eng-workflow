---
name: gather-build
description: Build the PR stack from an approved `-plan.md`. Use when the user hands you a plan doc to build, or says "build it" after a `gather-plan` session.
---

# Building a plan

If `repo.md` sits next to this file, or `.claude/eng/gather-build/repo.md` exists in this repo, read it first. It holds this repo's commands and conventions. Where it conflicts with this skill, follow it.

The plan from `gather-plan` holds every diff, every PR description, and a `## Handoff`. This skill turns it into a submitted stack. You are the coordinator. A Sonnet subagent, the builder, writes the code.

Run it in a new session. If this session wrote the plan, stop and tell the user to start one with `/gather-build <plan path>`, because the plan's Handoff carries everything a new session needs.

Input: the plan doc path. The links block at the top names the ticket and the design artifact. It also names the base and the `-progress.md` path.

<HARD-GATE>
The builder makes no code or design change the plan doesn't have until you approve it. That covers a new file or a changed signature. It also covers a skipped step, a moved test, and a comment the plan doesn't show.

You add nothing to the plan's code either. A comment missing from a plan snippet is missing on purpose, so don't add one in review or in a fix.

A comment the plan does show is not settled by being there. Review checks its wording like any other line, and a fix goes to the user as a plan fix.
</HARD-GATE>

## Checklist

Create a task for each item and do them in order:

1. **Load and read.** Load the skills below plus every skill the plan's Handoff lists. Read the whole plan, Handoff included.
   - The repo's code, test, and prose skills, if it has them
   - `graphite-workflow`
   - `pr-stack`
2. **Set up.** See [Setup](#setup).
3. **Brief the builder.** See [Builder brief](#builder-brief).
4. **Answer questions.** See [Approvals](#approvals).
5. **Review every PR.** See [Review](#review).
6. **Run the test plan.** See [Test plan](#test-plan).
7. **Submit.** See [Submit](#submit).
8. **Watch CI.** See [CI](#ci).
9. **Report.** See [Report](#report).

## Setup

- Stay in the current worktree. Use `gt checkout` to reach another stack's branch.
- Run `git fetch origin main:main` before any `gt create` or `gt track`.
- Run `git hook run pre-commit` once. If it can't find the hook, install the repo's hooks before any commit lands.
- Check that the local dev services serve this worktree before trusting a test result. When every worktree shares one local database, check with any other session that uses it before you reset or migrate it.

## Builder brief

Spawn one `general-purpose` agent with `model: "sonnet"` and `run_in_background: true`. The brief says:

- The plan path, the progress doc path, and the base branch.
- Load the skills from step 1.
- Build PR by PR, bottom up, with `gt create` and one commit per PR. Apply the plan's diffs as written.
- Commit messages and PR descriptions come from the plan. "No Co-Authored-By trailer, no attribution lines", verbatim.
- After each PR, run that PR's `### Validation` commands and record the results.
- Any change the plan doesn't have, however small, stops that PR. Record it under `## Open` and end the run with the question. Don't build past it.
- Resolve restack conflicts and keep going. Lint the resolved files before `gt continue`, because the rebase skips the pre-commit hook. Stop on a conflict that needs a design call.
- Never `git push`, `git rebase`, `git reset`, or `--no-verify`.
- Don't submit. The coordinator submits after review.

### The progress doc

The builder keeps it at the path from the plan's links block, with these headings:

- `## Branches`, each branch with its parent, commit SHA, and title.
- `## Validation`, each command per PR with its result. A command that didn't run to a result says why.
- `## Deviations from the plan`, each with the coordinator's approval.
- `## Open`, questions for the coordinator.
- `## Submitted`, PR numbers and Graphite URLs once they exist.

## Approvals

The builder's final message is either "done" or a question. Read the progress doc before you answer.

- **Code-level change** (a type the plan got wrong, a missed call site, a fixture the test needs): decide it yourself. Record the call in the doc and resume the builder with `SendMessage`.
- **Design-level change** (one that contradicts a `## Decisions` row, adds or drops a PR, or changes an API the plan defined): ask the user. Do everything else first.
- **Ambiguous restack conflict or deep debugging**: hand it to an `opus` subagent with the conflict and both sides of the plan.
- **A disputed check on a comment**: run the comment through the repo's prose skill before you approve the dispute. A comment that fails the prose skill goes to the user as a plan fix, even when the check's rule doesn't apply.

## Review

Review each PR on its own, from `git diff <parent>..<branch>`. A clean build proves nothing about style, and surviving an earlier pass proves nothing either. Apply every rule to every line.

1. **Plan match.** The diff matches the plan's diff for that PR. Every difference appears under `## Deviations from the plan` with an approval.
2. **No added comments.** Any comment the plan doesn't show gets deleted. Any comment the plan does show still has to earn its place. If the code answers every question the comment answers, or the comment fails the Prose check below, send it to the user as a plan fix.
3. **Code.** Every non-test line against the repo's code skill. Every test line against its test skill.
4. **Prose.** Every PR description, commit message, and code comment through the repo's prose skill when it has one. Run that skill's scorer on each PR description and fix every line it prints. Run its comment recipe on every comment the diff adds. That includes a comment copied from the plan or from existing code.
5. **Trailers.** `git log --format=%B <base>..HEAD | grep -i co-authored` prints nothing.

When another model reviews a PR, its prompt carries every rule above and names the prose skill.

Send findings back to the builder as one message per round, listed `path:line` with the fix. Re-review only what changed. You make no code edits yourself, except to carry out a plan diff the builder misapplied.

## Test plan

Run every step of every PR's `## Test Plan` that a machine can run. Running them once at the top of the stack is fine when the behavior is the same there. Then check each box in its own PR.

- A Sonnet subagent drives anything interactive, like a browser, a simulator, or a repair of the local dev services. You read its report and make the call.
- Start any run longer than about 15 minutes, like mobile E2E or a full suite, from the main thread with `run_in_background`. A background command started in a subagent dies when the subagent finishes.
- Check a box only for a step that ran and passed. Every checked box maps to a line under `## Validation`. A step you couldn't run stays unchecked, with the reason in the doc.
- A UI change gets screenshots in its PR description.
- A gated PR earns its gate line from the real command, e.g. `yarn verify:webhooks` for a `webhook-e2e-gate` check.

Before submitting, audit the boxes. Go through every checked box and find its run in the progress doc. Uncheck any box that has none.

## Submit

Submit once review and validation pass, without asking. New PRs land as drafts, and draft or ready state is the user's call.

- Titles, bodies, and reviewers come from the plan. Without reviewers in the plan, follow the repo's convention.
- The bottom PR carries the stack summary.
- Quote Graphite URLs. Record them under `## Submitted`.

## CI

Once the stack is up, check CI on the top PR. A real failure goes back to the builder through the progress doc, with the same approval rules. A flake gets one rerun. A failure from a stale parent gets a restack. Use `felix-loop` for review comments.

## Report

End with these:

- The Graphite URL for each PR.
- Each unchecked test plan box, with its reason.
- Every deviation you approved.
- The plan's follow-ups, plus any new ones.
