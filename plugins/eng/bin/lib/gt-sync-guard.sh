#!/usr/bin/env bash

# Refuses a `gt sync` that would discard another worktree's unsubmitted work.
#
# `gt sync -f`, or a `gt sync` whose overwrite prompt gets a yes, resets every tracked branch that
# differs from origin/<branch> to the remote tip, repo-wide. It skips branches checked out in a
# worktree, so a restack another worktree hasn't submitted is the one at risk.
#
# The lock in bin/gt serializes writes. It does not scope them, so it cannot help here.
#
# The ref audit log that the reference-transaction hook writes says who moved what. A branch
# counts as somebody else's unsubmitted work when its latest logged move in the window came from
# another worktree. Its tip has to still equal that move and differ from its remote tip.
#
# Sourced, never executed. Defines constants and functions only.

# Long enough to cover a working session. Older unsubmitted work is stale by anyone's standard.
readonly SYNC_GUARD_WINDOW_HOURS=6

readonly SYNC_GUARD_ZERO_OID="0000000000000000000000000000000000000000"

# BSD date takes -v, GNU date takes -d.
sync_guard_since() {
  date -u -d "-$SYNC_GUARD_WINDOW_HOURS hours" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null ||
    date -u -v"-${SYNC_GUARD_WINDOW_HOURS}H" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null
}

# sync_guard_age prints how long ago $1 was, falling back to the timestamp when neither date
# dialect parses it.
sync_guard_age() {
  local timestamp="$1" moved_at now
  moved_at="$(date -u -d "$timestamp" +%s 2>/dev/null)" ||
    moved_at="$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$timestamp" +%s 2>/dev/null)" || {
    printf 'at %s' "$timestamp"
    return
  }
  now="$(date -u +%s)"
  printf '%dm ago' "$(((now - moved_at) / 60))"
}

# Sync fast-forwards trunk on purpose, so it is never somebody's unsubmitted work.
sync_guard_trunk() {
  local config="$1/.graphite_repo_config" trunk=""
  if [[ -r "$config" ]]; then
    trunk="$(sed -n 's/.*"trunk"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$config" | head -1)"
  fi
  printf '%s' "${trunk:-main}"
}

# The hook logs the shell's own PWD, which keeps any symlink the caller walked through, so a move
# made in this worktree can be recorded under either spelling of its root. bin/gt-audit does the
# same comparison. $1 is the directory as the caller spelled it, $2 the same resolved, $3 the
# resolved root.
sync_guard_worktree_spelling() {
  local raw="$1" resolved="$2" root="$3" spelling
  case "$resolved" in
  "$root"/*)
    spelling="${raw%"${resolved#"$root"/}"}"
    printf '%s' "${spelling%/}"
    ;;
  *)
    printf '%s' "$raw"
    ;;
  esac
}

# sync_guard_candidates prints `ref<TAB>new<TAB>worktree<TAB>timestamp` for every branch whose most
# recent move in the window came from a worktree other than $2 or $3. Returns 1 when there is no log
# to read.
sync_guard_candidates() {
  local common_dir="$1" worktree="$2" worktree_real="$3" since="$4"
  local log="$common_dir/gather-ref-audit.log"
  set --
  [[ ! -f "$log.1" ]] || set -- "$@" "$log.1"
  [[ ! -f "$log" ]] || set -- "$@" "$log"
  [[ "$#" -gt 0 ]] || return 1

  awk -F'\t' -v since="$since" -v worktree="$worktree" -v worktree_real="$worktree_real" \
    -v zero="$SYNC_GUARD_ZERO_OID" '
    NF >= 8 && $1 >= since { new[$4] = $3; who[$4] = $6; when[$4] = $1 }
    END {
      for (ref in new) {
        if (new[ref] == zero) continue
        if (who[ref] == worktree || who[ref] == worktree_real) continue
        printf "%s\t%s\t%s\t%s\n", ref, new[ref], who[ref], when[ref]
      }
    }
  ' "$@"
}

sync_guard_checked_out_refs() {
  git -C "$1" worktree list --porcelain 2>/dev/null | awk '$1 == "branch" { print $2 }'
}

# sync_guard_remote_heads prints `sha<TAB>ref` for the branches in $2 that exist on origin. Asking
# the remote beats reading refs/remotes/origin/*, which goes stale the moment the other worktree
# submits and would refuse a sync that is safe.
sync_guard_remote_heads() {
  local cwd="$1" branches="$2" branch
  set --
  while IFS= read -r branch; do
    [[ -n "$branch" ]] || continue
    set -- "$@" "$branch"
  done <<<"$branches"
  [[ "$#" -gt 0 ]] || return 0
  git -C "$cwd" ls-remote --heads origin "$@" 2>/dev/null
}

# sync_guard_local_matches keeps the candidate lines whose branch is still worth asking origin
# about: not trunk, not checked out anywhere, and still pointing at the move that was logged.
sync_guard_local_matches() {
  local cwd="$1" trunk="$2" candidates="$3" checked_out
  local ref new who when tip
  checked_out="$(sync_guard_checked_out_refs "$cwd")"

  while IFS=$'\t' read -r ref new who when; do
    [[ -n "$ref" ]] || continue
    [[ "$ref" != "refs/heads/$trunk" ]] || continue
    [[ $'\n'"$checked_out"$'\n' != *$'\n'"$ref"$'\n'* ]] || continue
    tip="$(git -C "$cwd" rev-parse --verify --quiet "$ref" 2>/dev/null)" || continue
    [[ "$tip" == "$new" ]] || continue
    printf '%s\t%s\t%s\t%s\n' "$ref" "$new" "$who" "$when"
  done <<<"$candidates"
}

# sync_guard_report prints one line per branch that origin does not have at the logged tip, and
# returns 1 when it printed any.
sync_guard_report() {
  local matches="$1" remote_heads="$2"
  local ref new who when remote_sha printed=0

  while IFS=$'\t' read -r ref new who when; do
    [[ -n "$ref" ]] || continue
    remote_sha="$(awk -F'\t' -v ref="$ref" '$2 == ref { print $1; exit }' <<<"$remote_heads")"
    # A branch origin has never heard of is nothing for sync to reset it to.
    [[ -n "$remote_sha" ]] || continue
    [[ "$new" != "$remote_sha" ]] || continue
    if [[ "$printed" -eq 0 ]]; then
      printed=1
      echo "gt: sync would reset branches another worktree moved and has not pushed:" >&2
    fi
    printf '  %s  moved %s in %s  local %s, origin %s\n' \
      "${ref#refs/heads/}" "$(sync_guard_age "$when")" "$who" "${new:0:9}" "${remote_sha:0:9}" >&2
  done <<<"$matches"

  [[ "$printed" -eq 1 ]] || return 0
  echo "  gt submit from that worktree first, or rerun with GT_SYNC_RESET_OK=1" >&2
  return 1
}

# sync_guard_check refuses when `gt sync` in the checkout at $1 would reset a branch another
# worktree moved and has not pushed. 0 lets sync run, 1 refuses, 2 means the check could not run.
# Only 1 may stop a caller: a check that could not run is not evidence of anything.
#
# GT_SYNC_RESET_OK=1 is read here rather than by each caller, so bin/gt-sync-check and the
# wrapper honor the same escape hatch.
sync_guard_check() {
  local raw_cwd="$1" common_dir="$2"
  local resolved root spelling since trunk candidates matches remote_heads

  [[ "${GT_SYNC_RESET_OK:-}" != "1" ]] || return 0

  resolved="$(cd "$raw_cwd" 2>/dev/null && pwd -P)" || return 2
  root="$(git -C "$resolved" rev-parse --show-toplevel 2>/dev/null)" || return 2
  since="$(sync_guard_since)" || return 2
  spelling="$(sync_guard_worktree_spelling "$raw_cwd" "$resolved" "$root")"
  trunk="$(sync_guard_trunk "$common_dir")"

  candidates="$(sync_guard_candidates "$common_dir" "$spelling" "$root" "$since")" || {
    echo "gt: no ref audit log, so sync is not checked against other worktrees" >&2
    return 2
  }
  [[ -n "$candidates" ]] || return 0

  matches="$(sync_guard_local_matches "$resolved" "$trunk" "$candidates")"
  [[ -n "$matches" ]] || return 0

  remote_heads="$(sync_guard_remote_heads "$resolved" "$(cut -f1 <<<"$matches" |
    sed 's|^refs/heads/||')")" || {
    echo "gt: could not read origin, so sync is not checked against other worktrees" >&2
    return 2
  }

  sync_guard_report "$matches" "$remote_heads"
}
