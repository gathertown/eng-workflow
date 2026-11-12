# Writing PR Titles and Descriptions

## Titles

Format: `<type>: <summary> [<TEAM>-XXX]` — a type from the list in the `pr-stack` skill, then the human-readable summary, ticket tag last. The summary starts with a capital letter. Team prefix comes from the ticket in play (`ABC`, `OPS`, ...). Omit the tag when there's no ticket. No scope.

- Correct: `fix: Show an error banner when the config file fails to parse [ABC-1281]`
- Correct: `feat: Add a seat limit warning to the checkout page [OPS-4821]`
- Wrong: `fix: [ABC-1281] Show an error banner...` — tag at the start
- Wrong: `fix(cli): Stop docker containers on shutdown [ABC-1287]` — scope

## Descriptions

Start from the repo's PR template, usually `.github/pull_request_template.md`. Read it, then fill in:

1. **Ticket link** — real issue URL, or drop it.
2. **Summary** — what and why, concise.
3. **Details** — design decisions, tradeoffs, constraints a reviewer can't get from the diff. Nothing substantive? Delete the whole `## Details` section rather than padding it.
4. **Test Plan** — see below.
5. Delete any instructions the template leaves in HTML comments.

Rules:

- Reviewers skim. No extra sections. Never list commits.
- Never insert arbitrary line breaks. One long line per paragraph — GitHub renders single newlines as `<br>`, so hard-wrapped prose breaks mid-sentence. Line breaks only where markdown needs them: between paragraphs, list items, headings, fences.
- No stack position ("stacked on #123", "part 2 of 3") — Graphite shows it and it goes stale.
- Write for a reviewer with zero session context. Don't reference conversation examples as shared knowledge; ground claims in the code, and present examples concretely (before/after output).
  - Bad: "...which made logs like the nightly export summary useless for local debugging." Reviewer has no idea what that is.
  - Good: "`logger.info(msg, { context })` sends the context only to the log backend — the local formatter printed it only for errors, so info and warn logs showed a bare message." Then a before/after log sample.

### Renames and file moves

Pure rename/move PRs: no `## Details`, one line per change.

```
No-op refactor:

- Rename `foo` -> `bar`: reason
- Move `.../src/foo.ts` -> `.../src/foo/foo.ts`: reason
```

### Test Plan

Checkboxes only. No prose, ever.

Automated tests cover the change — you wrote a failing test then watched it pass, or breaking the new behavior would fail an existing test — then the whole section is one checked box and nothing else:

```
## Test Plan

- [x] Automated tests cover this change
```

When the template has its own line for this box, use that line word for word.

A pre-existing unchanged test is not coverage for new behavior. Typecheck and lint are not coverage unless types are the protection.

Automated tests don't fully cover it: keep that line and add the manual steps under it:

```
## Test Plan

- [x] Automated tests cover this change
- [x] Manual step you performed
- [ ] Manual step the human still has to do
```

Check a step only if you performed it. Do as many as you can yourself (local stack, CLI, endpoint); leave the rest unchecked for the human.

Never write out what you verified, which test files you ran, or how many tests passed. `yarn test path/to/Foo.test.ts`, "14 passed, 0 failed", "new tests cover the recovery path" — all noise. CI runs the suite and the reviewer reads the diff. Never list CI, or any check it runs, as a step. And drop a low-fidelity step when a higher-fidelity one subsumes it.

## `gh pr edit --body` heredoc

```bash
gh pr edit <PR-number> \
  --title "<type>: <summary> [<TEAM>-XXX]" \
  --body "$(cat <<'EOF'
<filled-in template>
EOF
)"
```

Don't escape backticks — `'EOF'` is already literal; `` \` `` renders as `\``. And the no-arbitrary-line-breaks rule above applies here too: never wrap paragraphs to fit the heredoc.
