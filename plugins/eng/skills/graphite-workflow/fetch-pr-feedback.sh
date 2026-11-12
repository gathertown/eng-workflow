#!/usr/bin/env bash
# Fetch everything you need to address review feedback on a PR, in one call.
#
# Three sources have to be combined and each has a trap:
#   - reviewThreads (GraphQL) is the only place isResolved lives, and it pages
#     at 100 — REST review comments can't tell you what's already settled.
#   - REST timeline comments default to 30 per page, silently dropping the rest.
#   - latestReviews decides whether a re-request is owed at the end.
#
# Read-only: no writes, no replies, no resolution changes.
#
# Usage: fetch-pr-feedback.sh <PR_NUMBER> [author-login]
#   author-login   optional filter, matches the thread's first comment author
#
# Prints JSON: { unresolved_threads: [...], resolved_thread_count, timeline_comments: [...], latest_reviews: [...] }
# Each thread carries reply_to_id — the REST comment id for
# `gh api repos/{owner}/{repo}/pulls/{pr}/comments/{reply_to_id}/replies`.
set -euo pipefail

PR_NUMBER="${1:?usage: fetch-pr-feedback.sh <PR_NUMBER> [author-login]}"
AUTHOR="${2:-}"

read -r OWNER REPO <<<"$(gh repo view --json owner,name --jq '"\(.owner.login) \(.name)"')"

threads='[]'
cursor=""
while :; do
  after=$([ -n "$cursor" ] && echo ", after: \"$cursor\"" || echo "")
  page=$(gh api graphql -f query="
  query {
    repository(owner: \"$OWNER\", name: \"$REPO\") {
      pullRequest(number: $PR_NUMBER) {
        reviewThreads(first: 100$after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            isResolved isOutdated path line
            comments(first: 50) {
              nodes { databaseId author { login } body url createdAt }
            }
          }
        }
      }
    }
  }")
  threads=$(jq -n --argjson a "$threads" \
    --argjson b "$(jq '.data.repository.pullRequest.reviewThreads.nodes' <<<"$page")" '$a + $b')
  [ "$(jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage' <<<"$page")" = "true" ] || break
  cursor=$(jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor' <<<"$page")
done

# isOutdated threads stay in: outdated means the line moved, not that the point
# was answered. The author filter matches ANY comment in the thread, not just
# the first — a reply on someone else's thread is still their feedback.
unresolved=$(jq --arg author "$AUTHOR" '
  [ .[]
    | select(.isResolved | not)
    | select($author == "" or any(.comments.nodes[]; .author.login == $author))
    | { path, line, isOutdated,
        reply_to_id: .comments.nodes[0].databaseId,
        url: .comments.nodes[0].url,
        comments: [.comments.nodes[] | { id: .databaseId, author: .author.login, body, createdAt }] } ]
' <<<"$threads")

# A mistyped login yields an empty list that reads exactly like "no feedback",
# which is how a review round gets silently skipped. Say so instead.
if [ -n "$AUTHOR" ] && [ "$(jq 'length' <<<"$unresolved")" -eq 0 ]; then
  total_unresolved=$(jq '[.[] | select(.isResolved | not)] | length' <<<"$threads")
  if [ "$total_unresolved" -gt 0 ]; then
    echo "warning: no unresolved threads from '$AUTHOR', but $total_unresolved unresolved thread(s) exist." >&2
    echo "         Authors present: $(jq -r '[.[] | select(.isResolved | not) | .comments.nodes[].author.login] | unique | join(", ")' <<<"$threads")" >&2
    echo "         Check the login, or re-run with no filter." >&2
  fi
fi

timeline=$(gh api "repos/$OWNER/$REPO/issues/$PR_NUMBER/comments?per_page=100" --paginate \
  --jq '[.[] | {id, author: .user.login, body, url: .html_url, createdAt: .created_at}]' | jq -s 'add // []')

if [ -n "$AUTHOR" ]; then
  timeline=$(jq --arg author "$AUTHOR" '[.[] | select(.author == $author)]' <<<"$timeline")
fi

reviews=$(gh pr view "$PR_NUMBER" --json latestReviews \
  --jq '[.latestReviews[] | {author: .author.login, state}]')

jq -n \
  --argjson unresolved "$unresolved" \
  --argjson resolved_count "$(jq '[.[] | select(.isResolved)] | length' <<<"$threads")" \
  --argjson timeline "$timeline" \
  --argjson reviews "$reviews" \
  '{ unresolved_threads: $unresolved,
     resolved_thread_count: $resolved_count,
     timeline_comments: $timeline,
     latest_reviews: $reviews }'
