# Gather's engineering skills for Claude Code

Skills we use at Gather to improve our engineering workflow. They take a change from design to a stack of PRs, then land it with Graphite and keep each PR green. They ship as one plugin, `eng`, in the `gather` marketplace.

## Install

In Claude Code:

```
/plugin marketplace add gathertown/eng-workflow
/plugin install eng@gather
```

The skills run as `/eng:<skill>`, and Claude also loads one on its own when a task matches its description. Claude Code doesn't auto-update a marketplace like this one by default. Turn auto-update on for `gather` under `/plugin` > Marketplaces, or run `claude plugin update eng@gather` now and then.

## Skills

| Skill                    | What it does                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/eng:gather-design`     | Turns an idea into a design one question at a time, settles the PR stack, and publishes the design as a page. `checkArtifact.ts` renders that page at desktop and phone width and reports layout defects. |
| `/eng:gather-plan`       | Writes the implementation plan for an approved design, with every diff, every PR description, and a handoff for the agent that builds it.                                                                 |
| `/eng:gather-build`      | Builds the PR stack from an approved plan. A subagent writes the code from the plan's diffs, and Claude reviews each PR against the plan before it submits the stack.                                     |
| `/eng:pr-stack`          | Rules for splitting work into a stack of PRs, one kind of change per PR.                                                                                                                                  |
| `/eng:graphite-workflow` | Creates, restacks and submits Graphite stacks, and works through review feedback on them.                                                                                                                 |
| `/eng:felix-loop`        | Watches a PR or a whole stack and fixes failed CI, review comments, lint and merge conflicts until it can merge.                                                                                          |
| `/eng:write-like-andrew` | Writes and rewrites prose in Andrew Smith's voice, then scores the draft with `tests/score.ts`.                                                                                                           |
| `/eng:writing-code`      | Applies our coding standards, `STANDARDS.md`, and the architecture building blocks. Both docs ship with the skill.                                                                                        |
| `/eng:unit-testing`      | Writes and reviews tests against our testing style guide, `testingStyleGuide.md`, which ships with the skill.                                                                                             |

## The `gt` tools

Claude Code 2.1.91 and later put a plugin's `bin/` on the Bash tool's `PATH`, so Claude gets these with no setup.

- `gt` wraps Graphite's own `gt`, which you still install yourself. It takes a lock so two worktrees can't write Graphite's state at once. It also refuses a `gt sync` that would reset another worktree's unpushed work.
- `gt-sync-check` runs that sync check without syncing.
- `gt-unlock` shows who holds the lock, and breaks it if you ask.
- `gt-audit` reports branch moves whose commits can't be found in reachable history. It reads the log that the hook in [Log branch moves for `gt-audit`](#log-branch-moves-for-gt-audit) writes.
- `gt-unstick` repairs a branch Graphite thinks was updated remotely without a squash.
- `gt-stack list` prints the current stack, top to bottom, and `--json` adds each branch's PR. `gt-stack merge` lands the stack onto trunk, bottom to top, once the whole stack restacks cleanly onto the latest trunk. It squash-merges each PR with `gh pr merge --admin`, which can bypass branch protection, and it checks neither CI nor approvals. `--help` on either one documents its flags and exit codes.

The Bash tool's `PATH` only applies inside Claude Code. To run them from your own terminal, put the marketplace copy on your shell's `PATH`, which keeps its path across updates:

```bash
export PATH="$HOME/.claude/plugins/marketplaces/gather/plugins/eng/bin:$PATH"
```

## Log branch moves for `gt-audit`

`gt-audit` and the `gt sync` check read a log of every branch move. A `reference-transaction` git hook writes it into your repo's git directory. Git runs hooks outside Claude Code, so the plugin can't install one, and your repo runs it through [husky](https://typicode.github.io/husky/) 9 instead:

1. Copy the hook body into `.husky/`. It sources nothing else from the plugin, so the copy runs as is:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/gathertown/eng-workflow/main/plugins/eng/bin/lib/gt-reference-transaction.sh -o .husky/gt-reference-transaction.sh
   ```

2. Add `.husky/reference-transaction` with this one line. Husky runs hook files with `sh`, and the body needs bash:

   ```sh
   exec bash "$(dirname "$0")/gt-reference-transaction.sh" "$@"
   ```

3. Husky writes `.husky/_` dispatchers only for its own list of hooks, which leaves out `reference-transaction`. Have your `prepare` script (`postinstall` on Yarn 2 and later) copy one of the others:

   ```json
   "prepare": "husky && ([ ! -d .husky/_ ] || cp .husky/_/pre-commit .husky/_/reference-transaction)"
   ```

   The check skips the copy when husky skips its install, e.g. under `HUSKY=0` in CI.

4. Commit `package.json` and the two `.husky/` files, then run `npm run prepare`. Your next commit adds a line to `gather-ref-audit.log` in the git directory.

`.husky/_` is gitignored, so run `prepare` in each new worktree too. The copied body doesn't change when the plugin updates. Run the `curl` again to pick up a newer one.

## Link gitignored files into worktrees

`symlink-gitignored-files-for-worktree` links your main checkout's gitignored files into a worktree, so env configs and local settings follow you. Run it from the worktree's root. List the files in `.claude/eng/worktree-symlinks.txt`, one path or glob per line, with `#` for comments:

```text
.env
.claude/settings.local.json
```

For anything else a new worktree needs, add `.claude/eng/worktree-setup.sh`. The script runs it after linking, with `MAIN_REPO` and `WORKTREE_ROOT` set.

## Run CI only on the top of a stack

The [`gathertown/stack-position`](https://github.com/gathertown/stack-position) action runs CI once per stack, on its top PR. graphite-workflow's "CI runs on the top of the stack" section is written for it.

## Requirements

- Node 22.18 or later. The skills run `.ts` files with Node's built-in type stripping, which is on by default from 22.18.
- `gh` and Graphite's `gt` for `graphite-workflow` and `felix-loop`.
- husky 9, for the git hook that writes `gt-audit`'s log.
- Playwright, for `checkArtifact.ts`. The plugin doesn't install it. The script loads it from the root of the repo you run it in, so install it there with your package manager, e.g.:

  ```bash
  npm install --save-dev playwright
  npx playwright install chromium
  ```

  When Playwright is missing, `checkArtifact.ts` prints these two commands and exits 2.

## What your repo needs

The skills and the `gt` tools write their scratch files into the repo you run them in, at its root:

- `.repo/local/tmp/` holds gather-design's design pages, gather-plan's plans and probes, and gather-build's progress docs. `checkArtifact.ts` writes its screenshots to `.repo/local/tmp/artifact-check/`, and `gt-audit` builds its scratch repos there too.
- `.felix-state.json` and `.repo/felix/next-action.json` hold felix-loop's state between rounds. felix-loop creates `.repo/felix/` on its first run, and each worktree gets its own copy.

None of it belongs in git, so add these lines to your `.gitignore`:

```gitignore
.felix-state.json
.repo/felix/
.repo/local/
```

## Your repo's conventions

Each skill reads `.claude/eng/<skill>/repo.md` in your repo before anything else, when that file exists. Put your commands, CI details and PR template there, e.g. in `.claude/eng/gather-plan/repo.md`. Where it conflicts with the skill, Claude follows it. Without one, the skills look for commands in your repo's AGENTS.md or CLAUDE.md. The files sit in your repo, so a plugin update leaves them alone.

## Contributing

Issues are welcome. We publish this repo from our monorepo, so we port a PR by hand before it shows up here.

## License

MIT, see [LICENSE](LICENSE). `gather-design` and `gather-plan` adapt the brainstorming skill from [obra/superpowers](https://github.com/obra/superpowers), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) carries its license.
