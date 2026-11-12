---
name: gather-plan
description: Write the implementation plan for an approved design. Use once the user approves a design artifact from the `gather-design` skill, says they reviewed a plan, or left @claude notes in one. Also use when a plan goes to another model for review or to a new agent.
---

Adapted from [obra/superpowers](https://github.com/obra/superpowers) 6.2.0, `skills/brainstorming/SKILL.md` at commit `44c9b2d6e889982ac18c27d05a19fefe335194e1`. MIT License, Copyright (c) 2025 Jesse Vincent.

# Writing the plan

If `repo.md` sits next to this file, or `.claude/eng/gather-plan/repo.md` exists in this repo, read it first. It holds this repo's commands and conventions. Where it conflicts with this skill, follow it.

Turn an approved design artifact into a `-plan.md` the engineer reads and approves. The plan has every diff, every PR description, and a `## Handoff` section. It never builds anything.

Inputs: the design artifact URL, the ticket with its comments, and the base branch when it isn't `main`. The user names the base.

<HARD-GATE>
Do NOT create a branch or write code in the repo. Do NOT start a progress doc or offer to build. The plan ends with the engineer reading it. Building happens in a new session with the `gather-build` skill.
</HARD-GATE>

## Have a ticket

If there's no ticket, ask. It's not strictly required, but generally there should be one.

## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Load and read.** Load the repo's code, test, and prose skills if it has them. Load `pr-stack` for the stack. Read the design artifact with the `Artifact` tool's `read` action, the ticket and its comments, and the repo's architecture doc if it has one.
2. **Research, all of it, before writing.** See [Research](#research).
3. **Re-cut the stack** with the `pr-stack` skill. Record every change from the design's stack and why.
4. **Write the doc.** See [The doc](#the-doc).
5. **Prose pass.** Run the repo's prose skill, if it has one, on the whole doc and on every code comment in the diffs.
6. **Self-review.** See [Self-review](#self-review).
7. **Add the plan to the ticket.** Attach it if your tracker is connected. With no ticket, skip this and say so when you stop.
8. **Stop.** See [Stop](#stop).

## Research

Finish the research before writing the doc. What to open is your call. Research is done when every symbol the plan touches has its call sites listed with `file:line`, every claim inherited from the design has been checked against the code, and anything only a run can settle has been run: a probe test, a typecheck, a query. Probes are throwaway, so the HARD-GATE doesn't cover them. Write one only in a gitignored scratch path such as `.repo/local/tmp` or in a throwaway worktree, delete it once you have the result, and record only the finding in the doc. Facts are your job, never the user's.

Fan out `Explore` subagents when the sweep is wide, one per independent area, each brief naming the output it returns. Spot-check their reports.

The doc may not contain "the agent will need to figure out", "TBD", or "verify during implementation". A fact that can't be settled becomes a Decisions row with the reason.

## The doc

Save it as `.repo/local/tmp/<YYYY-MM-DD>-<team>-<number>-<slug>-plan.md` next to the design's `-design.html`. Resolve the repo root with `git rev-parse --show-toplevel`.

Top to bottom, with these exact headings:

- **H1 `<TICKET>: <title>`**, then a links block. It lists the ticket and the design artifact URL. Then the plan's URL on the ticket once it exists, the base, and the future `-progress.md` path.
- **`## Versions`**, a `| Version | Date | What changed |` table, oldest first. Every row names what drove it: the user's notes, a review, a re-cut stack.
- **One scope paragraph.** "This doc plans X. It does not plan Y."
- **`## Summary`**, one short paragraph of three to five sentences: what the change does, why, and the approach. The PR stack table and the PR sections carry the per-PR detail, so don't walk the PRs here.
- **`## Decisions`**, a numbered `| # | Decision | Reason |` table. A row is a call the plan made that the rules and the user's ask don't settle, one a reviewer could push back on or ask why about. Research that contradicts the design lands here as a row too. A choice the stack rules or another skill already make isn't a row.
- **`## PR stack`**, bottom up, as a `| # | Kind | Title | Files | Lines |` table. `Kind` is the type that opens the title, per `pr-stack`. `Lines` is the count of `+` and `-` lines across that PR's diff blocks, rounded with `~`. Under the table go the base, the reviewers, and any merge note. No branch names.
- **`` ## PR N: `type: Title [TICKET]` ``** per PR. See [PR sections](#pr-sections).
- **`## Follow-ups`**, things seen and not done. Don't file a ticket for one unless the user asks.
- **`## Handoff`**. See [Handoff section](#handoff-section).
- **`## Review response`** and **`## Review`**, appended once an outside review lands. See [Outside review](#outside-review).

A small plan keeps the skeleton and drops what it doesn't need. It uses `## PR:` for a single PR and a Handoff of a few lines.

An earlier plan may sit next to where you save this one. If so, copy its shape for the PR sections and the Handoff. Copy its version and stack tables too. Follow this skill where they differ.

### PR sections

Each `## PR N` section has, in order:

- A scope line, one sentence on what the PR does.
- `### <path>` per file with a `diff` block. Show `-`/`+` lines with a line or two of context. `@@` markers name the method or test when a hunk sits far from the last one. A new file appears whole under `### <path> (new)`. Test diffs keep the existing variable names, so the diff is the setup plus the touched cases.
- `### PR description`, a fenced block holding the body in the repo's PR template. It links the ticket and the design artifact. The bottom PR adds a stack summary of five sentences at most: the motivation, the changes, the approach.
- `### Validation`. The repo's typecheck and test commands (see AGENTS.md or CLAUDE.md), with the tests narrowed to the files the PR touches. No full CI run.

### Handoff section

Write `## Handoff` with v1 and refresh it with every version. Nobody can tell which version is the last one, so the doc is always ready for a new agent. Every list is plain bullets, one item each, and the section has no narrative. It doesn't recount how the plan was reached.

- **Skills** to load in every session and subagent brief.
- **Memories** that apply.
- **Docs** read, each with a few words on why it matters.
- **Files** read, each with a few words on why it matters.
- **Facts** settled by running something, so nobody reruns them.
- **Reviewers, worktree, and what's been approved.**

## Self-review

In a subagent, read the doc with fresh eyes:

1. **Placeholders.** No "TBD", no unanswered question, no "verify during implementation".
2. **Architecture Blocks.** Every new file maps to one block from the `gather-design` skill's "Design with architecture blocks" section.
3. **Stack.** The PR stack follows all the rules in `pr-stack` skill.
4. **Test plans.** Checkboxes only, follows standards.
5. **Validation.** The typecheck and the test runs for the files each PR touches. A behavior change the tests can't reach gets a manual check step, written as what to do and what to see.
6. **PR descriptions.** Each one links the ticket and the design. The bottom one has the stack summary.
7. **Design link.** The links block has the design artifact URL.

Fix issues inline. No re-review.

## Numbered decisions and questions

Number everything you ask the user, so they can answer by number.

- **`D` rows are decisions.** `D1`, `D2`, ... in the Decisions table. Each row has the call you'd make and the reason. The user says yes or overrides.
- **`Q` rows are questions.** `Q1`, `Q2`, ... in their own list. Write one when the code can't settle the answer, e.g. a product call or a priority. List the options and what each costs.
- **Pick the letter honestly.** If you'd be fine with either answer, it's a `Q`, so don't put it in the Decisions table with a guess attached.
- **Numbers never change.** `D4` stays `D4` in every later version, even after rows above it are deleted, because the user's replies name the numbers.
- **Answers arrive in chat by number.** `D2 yes`, `D3 no, keep the service`, `Q1 the second one`, `D7 I don't understand`. On yes, add `<user>, <date>` to the reason. On no, rewrite the row to the user's call and their reason. An answered `Q` moves into the Decisions table as a `D` row. On "I don't understand", explain again in chat with the code behind it, and leave the row alone until they decide.
- **After the answers.** Add a version row naming which numbers changed, and end your message with the numbers still open.

## Stop

End the turn with this message:

> Plan written to `<path>`.
> Next: leave `@claude` notes in the doc and tell me when you've reviewed. Or say the plan is going to another model for review and I'll watch the file.
> Once it's approved, start a new session and run `/gather-build <path>`.

Never call ExitPlanMode. Never build in this session, even when asked. Point at `/gather-build` in a new session instead.

## After the plan is written

### `@claude` notes

When the user says they reviewed the doc or left feedback, grep it for `@claude`. Answer each note in chat with your take, the tradeoff, and the options.

Change the doc only for a note that is a plain instruction, or once the user makes the call. A changed doc gets a version row and loses the note. Its Decisions row cites the note, e.g. "the user's note on v2". When unsure whether a note is a question or a directive, it's a question.

### Outside review

When the user says the plan is going to another model for review, make one background Bash loop and nothing else:

```bash
pat='^## (Cross-model plan review|Review)$'
n=$(grep -cE "$pat" "<plan>" 2>/dev/null || true); i=0
until [ "$(grep -cE "$pat" "<plan>" 2>/dev/null || true)" -gt "${n:-0}" ]; do
  i=$((i+1)); [ "$i" -ge 36 ] && { echo "Timed out waiting for review" >&2; exit 1; }
  sleep 300
done; sleep 60
```

Run it with `run_in_background`, so the only notification is the one when it exits. The extra minute gives the reviewer time to finish writing. A timeout exits 1 before that minute, so a nonzero exit means no review landed: report it and write nothing. Once it exits 0:

1. Check each finding against the source before taking or rejecting it.
2. Write `## Review response` above the review as a `| # | Verdict | Where in vN |` table.
3. Leave the review text as it was, so its line references stay valid.
4. Add a version row with what was taken and what was rejected.
5. Update the plan's copy on the ticket, if it has one.

### Handoff

Nothing to do, because `## Handoff` is already in the doc. If the user sends a handoff prompt anyway, refresh the section and say it was already there.
