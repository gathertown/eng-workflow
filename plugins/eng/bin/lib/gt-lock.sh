#!/usr/bin/env bash

# The lock that serializes Graphite writes across every worktree sharing one git
# common directory. bin/gt holds it for the length of a mutating command, and
# everything else trial-acquires it to find out whether a gt is running.
#
# Sourced, never executed. Defines constants and functions only.

# shellcheck disable=SC2034 # Why: read by the scripts that source this file.
readonly LOCK_BASENAME="gather-gt.lock"

# The exit status both locking primitives use for "someone else holds it".
# Everything else is an operational failure and must not be retried.
readonly CONTENTION_STATUS=75

# select_lock_tool prints the locking primitive to use, or returns 1 when
# neither exists. Callers decide what that means for them.
select_lock_tool() {
  if command -v flock >/dev/null 2>&1; then
    echo flock
  elif command -v lockf >/dev/null 2>&1; then
    echo lockf
  else
    return 1
  fi
}

# lock_attempt blocks for at most $1 seconds on descriptor $2, using tool $3.
lock_attempt() {
  local seconds="$1" fd="$2" tool="$3"
  case "$tool" in
  flock) flock -w "$seconds" -E "$CONTENTION_STATUS" "$fd" ;;
  lockf) lockf -s -t "$seconds" "$fd" ;;
  esac
}
