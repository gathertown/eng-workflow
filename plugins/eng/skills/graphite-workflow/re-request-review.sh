#!/usr/bin/env bash
# Re-request review after addressing feedback — but ONLY from reviewers whose
# latest review state is CHANGES_REQUESTED (they formally blocked the PR).
# A reviewer who only commented, or already approved, is skipped: re-requesting
# them just clutters their review list. `latestReviews` collapses each reviewer
# to their most recent verdict, so a stale CHANGES_REQUESTED that was later
# approved won't match.
#
# Usage: re-request-review.sh <PR_NUMBER>
set -euo pipefail

PR_NUMBER="${1:?usage: re-request-review.sh <PR_NUMBER>}"

BLOCKERS=$(gh pr view "$PR_NUMBER" --json latestReviews \
  --jq '[.latestReviews[] | select(.state == "CHANGES_REQUESTED") | .author.login] | join(",")')

if [ -n "$BLOCKERS" ]; then
  gh pr edit "$PR_NUMBER" --add-reviewer "$BLOCKERS"
  echo "Re-requested: $BLOCKERS"
else
  echo "No CHANGES_REQUESTED reviewers; re-requested nobody."
fi
