#!/usr/bin/env bash

audit_snapshot_refs() {
  local output="$1" prefix="$2"
  local refs="$prefix.refs" worktrees="$prefix.worktrees" seeds="$prefix.seeds"

  audit_source_git for-each-ref \
    --format='%(refname)%09%(objectname)%09%(objecttype)%09%(*objectname)%09%(*objecttype)' \
    >"$refs" || return 1
  audit_source_git worktree list --porcelain >"$worktrees" || return 1

  {
    sort "$refs"
    echo --worktrees--
    sort "$worktrees"
  } >"$prefix.state"

  awk -F'\t' '$1 !~ /^refs\/replace\// {
    if ($3 == "commit") print $2
    else if ($5 == "commit") print $4
  }' "$refs" >"$seeds"
  awk '$1 == "HEAD" { print $2 }' "$worktrees" >>"$seeds"
  sort -u -o "$seeds" "$seeds"
  audit_source_git rev-list --no-walk=unsorted --stdin <"$seeds" >"$output" || return 1
  sort -u -o "$output" "$output"
}

build_surviving_index() {
  local snapshot="$1" output="$2"
  local main_oid raw="$ATTEMPT_DIR/surviving.raw"
  : >"$raw"

  main_oid="$(awk -F'\t' '$1 == "refs/heads/main" && $3 == "commit" { print $2; exit }' \
    "$SNAPSHOT_REF_RECORDS")"
  if [[ -n "$main_oid" ]] && grep -Fxq "$main_oid" "$snapshot"; then
    audit_git log --date-order --format='%H%x09%T%x09%s' \
      --since="$SURVIVING_HISTORY_WINDOW" "$main_oid" -- >>"$raw" || return 1
  fi
  audit_git log --date-order --format='%H%x09%T%x09%s' \
    --since="$SURVIVING_HISTORY_WINDOW" --stdin <"$snapshot" >>"$raw" || return 1
  awk -F'\t' '!seen[$1]++' "$raw" >"$output"
}

prioritize_surviving_commits() {
  local old_oid="$1" index="$2" output="$3" near_output="$4"
  local scored="$ATTEMPT_DIR/prioritized-scored"
  local hints="${OLD_HINT_FILES[$old_oid]}"

  awk -F'\t' '
    FNR == NR {
      subject = $0
      sub(/ \(#[0-9]+\)$/, "", subject)
      subjects[subject] = 1
      while (match(subject, /[A-Z][A-Z]+-[0-9]+/)) {
        tickets[substr(subject, RSTART, RLENGTH)] = 1
        subject = substr(subject, RSTART + RLENGTH)
      }
      next
    }
    {
      subject = $0
      sub(/^[^\t]*\t[^\t]*\t/, "", subject)
      normalized = subject
      sub(/ \(#[0-9]+\)$/, "", normalized)
      score = subjects[normalized] ? 0 : 2
      remaining = subject
      while (score == 2 && match(remaining, /[A-Z][A-Z]+-[0-9]+/)) {
        if (tickets[substr(remaining, RSTART, RLENGTH)]) score = 1
        remaining = substr(remaining, RSTART + RLENGTH)
      }
      print score "\t" $0
    }
  ' "$hints" "$index" >"$scored"
  sort -s -n -k1,1 "$scored" | cut -f2- >"$output"
  awk -F'\t' '$1 < 2 { print $2 }' "$scored" >"$near_output"
}
