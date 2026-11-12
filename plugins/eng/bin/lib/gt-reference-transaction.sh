#!/usr/bin/env bash

# Appends every refs/heads/* move to the shared ref audit log.
#
# Git runs this for every ref transaction from every tool — gt, raw git, an IDE, an
# absolute-path gt — so the log covers the writers that bin/gt cannot intercept.
# `gt-audit` reads it.
#
# This hook must never fail a git command. A non-zero exit at the `prepared` stage
# aborts the transaction, so `set -e` is explicitly off and every path exits 0.
set +e

# Fields render into a tab-separated log, so control characters are flattened and
# long values truncated before they get there.
readonly MAX_FIELD=300
readonly MAX_LOG_BYTES=8388608
readonly ZERO_OID="0000000000000000000000000000000000000000"

sanitize_path() {
  local value="${1//[[:cntrl:]]/ }"
  printf '%s' "${value:0:MAX_FIELD}"
}

# sanitize_command keeps the program and its subcommand and drops the rest of
# argv, which is the only part of a command line worth logging and the only part
# that can't carry a credential. Deciding what to redact instead is a losing
# game: argv reaches here as `GH_TOKEN=... git push`, `--token=...`,
# `-c http.extraheader=...` and URLs with an inline password, and it also drags
# whole commit messages into a shared log.
#
# A word containing `=` is an inline assignment, and a word starting with `-` is
# a flag, so neither can be the program. The subcommand is the first following
# word that names one, matched against a list rather than judged by shape:
# `ps` flattens argv, so a quoted option value like
# `-c http.extraheader=Authorization: Basic <token>` arrives as separate words,
# and every shape rule admits some of them. A token cannot be on this list.
#
# An unrecognized subcommand logs the program alone, which is the safe way to be
# wrong. `gt-audit` only reads specific names out of this field anyway.
readonly KNOWN_SUBCOMMANDS="\
absorb abort aliases auth bottom changelog checkout children completion config continue create \
dash delete demo docs down feedback fish fold freeze get guide info init log merge modify move \
parent pop pr rename reorder restack revert split squash submit sync top track trunk undo \
unfreeze unlink untrack up \
add am apply bisect blame branch cherry-pick clone commit config diff fetch gc grep init log \
merge mv notes pack-refs pull push rebase reflog remote reset restore revert rm show stash \
status switch symbolic-ref tag update-index update-ref worktree"

sanitize_command() {
  local value="${1//[[:cntrl:]]/ }" word program="" subcommand=""
  # shellcheck disable=SC2086 # Why: intentional word splitting over argv.
  set -- $value
  for word in "$@"; do
    case "$word" in
    *=* | -*) continue ;;
    esac
    if [[ -z "$program" ]]; then
      program="$word"
      continue
    fi
    [[ " $KNOWN_SUBCOMMANDS " == *" $word "* ]] || continue
    subcommand="$word"
    break
  done
  [[ -n "$program" ]] || {
    printf '%s' "-"
    return
  }
  printf '%s' "${program:0:MAX_FIELD}${subcommand:+ $subcommand}"
}

# Git writes one "<old> <new> <ref>" line per ref. Drain stdin even when this
# invocation has nothing to do, so git never writes into a closed pipe.
declare -a moves=()
while read -r old new ref; do
  case "$ref" in
  refs/heads/*) moves+=("$old $new $ref") ;;
  esac
done

state="${1:-}"
[[ "$state" == "prepared" || "$state" == "committed" ]] || exit 0
[[ "${#moves[@]}" -gt 0 ]] || exit 0

# Git only reports a pre-image for an update it checked one against. `git branch
# -D` and the unconditional `git update-ref` that `gt restack` uses on upstack
# branches both report all-zeros, and by the committed phase the old value is
# gone — which would leave nothing recoverable for the two cases that need it
# most. Those are read while the transaction is still prepared, where the ref
# still resolves; everything else is read at committed, where it is final.
#
# A prepared transaction can still abort, logging a move that never happened.
# `gt-audit` reports nothing for one: the branch still holds those commits, so
# they are still reachable.
declare -a loggable=()
for move in "${moves[@]}"; do
  read -r old new ref <<<"$move"
  if [[ "$old" == "$ZERO_OID" ]]; then
    [[ "$state" == "prepared" ]] || continue
    old="$(git rev-parse --verify -q "$ref" 2>/dev/null)"
    old="${old:-$ZERO_OID}"
  else
    [[ "$state" == "committed" ]] || continue
  fi
  # `git pack-refs` reports every ref it packs as a fresh write, which resolves
  # to the value the ref already had. Nothing moved.
  [[ "$old" != "$new" ]] || continue
  loggable+=("$old $new $ref")
done
[[ "${#loggable[@]}" -gt 0 ]] || exit 0

common_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)"
[[ -n "$common_dir" && -d "$common_dir" ]] || exit 0
log="$common_dir/gather-ref-audit.log"

# Walk up from the hook to find the git process that owns this transaction and,
# above it, the tool that ran git. The tool is what tells a restack apart from a
# squash later, so it is worth the extra ps calls.
git_pid="$PPID"
git_cmd=""
tool_cmd=""
pid="$PPID"
for _ in 1 2 3 4 5 6 7 8; do
  read -r parent_pid cmd <<<"$(ps -o ppid=,args= -p "$pid" 2>/dev/null)"
  [[ -n "${parent_pid:-}" ]] || break
  case "$cmd" in
  git | git\ * | */git | */git\ *)
    if [[ -z "$git_cmd" ]]; then
      git_pid="$pid"
      git_cmd="$cmd"
    fi
    ;;
  gt | gt\ * | */gt | */gt\ *)
    [[ -n "$tool_cmd" ]] || tool_cmd="$cmd"
    ;;
  esac
  [[ -n "$git_cmd" && -n "$tool_cmd" ]] && break
  pid="$parent_pid"
done

timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)"
worktree="$(sanitize_path "$PWD")"
git_cmd="$(sanitize_command "${git_cmd:--}")"
tool_cmd="$(sanitize_command "${tool_cmd:--}")"

# One append per line, rather than one for the whole transaction. What matters
# is that no single line is torn: O_APPEND makes each write land at the end
# without another writer's offset interleaving, and a line is at most ~1kB under
# the field caps above, so each one goes out in a single write. Batching the
# transaction into one string would exceed the stdio buffer on a large restack
# and split mid-line. Lines from two worktrees interleaving is fine — they are
# independent moves and `gt-audit` reads line by line.
for move in "${loggable[@]}"; do
  read -r old new ref <<<"$move"
  printf '%s\n' "$timestamp	$old	$new	$ref	$git_pid	$worktree	$tool_cmd	$git_cmd" \
    >>"$log" 2>/dev/null
done

# Rotate to a single generation. Two worktrees can race here; the log is
# advisory, so the loser appending into the renamed inode is acceptable.
size="$(wc -c <"$log" 2>/dev/null)"
if [[ -n "${size// /}" && "${size// /}" -gt "$MAX_LOG_BYTES" ]]; then
  mv -f "$log" "$log.1" 2>/dev/null
fi

exit 0
