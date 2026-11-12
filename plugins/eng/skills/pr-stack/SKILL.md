---
name: pr-stack
description: Rules for splitting work into a stack of PRs. Use when designing or planning a PR stack, re-cutting one, splitting a PR a reviewer called too big, or checking whether a PR mixes kinds of change.
---

# PR stack

If `repo.md` sits next to this file, or `.claude/eng/pr-stack/repo.md` exists in this repo, read it first. It holds this repo's commands and conventions. Where it conflicts with this skill, follow it.

**One PR per kind of change.** The kind is the conventional commit type that opens the PR title. The types are build, chore, ci, docs, feat, fix, perf, refactor, revert, style, and test. A move, a rename, or a layer name like domain or UI describes the change and belongs in the title.

**Don't mix kinds:**

- A file move or rename PR has no other edits. Moving text from one file to another isn't a file move. The moved text keeps its wording, and the same PR can edit the text around it.
- Symbol renames are a separate PR. Related symbol renames can be grouped together into the same PR.
- One refactor operation per PR. Reorganizing methods and splitting them apart are two PRs.
- A refactor never carries a fix or a feature.
- A refactor PR with no test changes is the goal. A refactor with many test changes is cut wrong, unless the API changed.
- A fix carries as little refactoring as it can. When it needs a refactor first, the refactor is its own PR below it.
- A feature carries as little fixing or refactoring as it can, by the same rule.
- One feature per PR. One fix per PR. One refactor per PR.

**Separate domain logic from how it is surfaced.** Domain logic ships apart from the code that exposes it. On the frontend, models, value objects, repos, and services go in one PR, then presenters, components, and routes in the next. On the backend, models, repos, and services go apart from controllers and routes.

**Don't split what only makes sense together.** A route ships with the components it renders. A service ships with the value objects it takes. A repo ships with the model it manages. A split that leaves the reviewer holding half of one idea is arbitrary.

**Default to more atomicity.** When two PRs could go either way, keep them apart. Collapsing them is the engineer's call when building the stack. Edits toward one goal in the same files are one PR unless another rule here splits them. Moving part of a doc to another file and rewording the rest is one PR.

**One mechanical change is one PR, regardless of file count.** Swap every caller, add the same prop everywhere, replace a helper at all call sites. The reviewer checks one pattern and recognizes it across the entire PR. Don't subdivide into one diff per file.

**Tests for existing behavior get their own PR.** Tests that prove what the code does today ship directly below the refactor, fix, or feature they cover. They pass on trunk, so the PR above them shows what changed and what didn't. Tests for new behavior ship in the feature or fix that adds it. That PR keeps its feat or fix type.

**A PR that has to land apart from the rest of the stack carries a merge gate.** Usual reasons are a change that has to bake on prod first, or a client rollout that has to reach most users. Its title starts with `[do not merge] `, ahead of the type: `[do not merge] chore: Drop the old column [ABC-123]`. Its description gets a `## Merge gate` section with one checkbox per step that shows the PR is safe to merge.

```markdown
## Merge gate

- [ ] #1234 has been on prod for a week
- [ ] Every PR downstack is on main
```
