<!--
Micro-test for the semicolon and sentence-shape rules. Dispatch 5 fresh subagents with:
"Read the write-like-andrew skill, then follow the Procedure exactly to
rewrite this fixture. Write only the rewritten artifacts to <out>."
Score each output with grep -c ';' (target 0) and words per sentence in the PR body (target mean
under 20, none over 30). 2026-09-09 baseline with the skill: 3, 1, 2, 2, 1. After the fix: 0 x5.
No-skill control: 3, 4, 3.
-->

# Draft to rewrite

Rewrite everything below so Andrew Smith can sign it. Keep the facts. Output the rewritten PR title, PR description, and the three code comments (each comment as a fenced ts block, in the same order).

## PR title (draft)

feat(mobile): Add retry handling for failed chat attachment uploads [ABC-123]

## PR description (draft)

Linear: https://tracker.example.com/ABC-123

This PR introduces a robust retry mechanism for chat attachment uploads on mobile. Previously, when an upload failed due to a transient network error, the attachment tile would remain in a permanent error state and the user had no recourse other than removing the attachment and picking the file again. With this change, the tile now exposes a retry affordance which re-issues the upload using the original `FormData` body, leveraging the existing `PendingUpload` state machine rather than introducing a parallel one.

At its core, the change is about ownership: the composer owns the pending list, while each tile owns only its own progress. What the tile draws is derived entirely from the upload's status, so a retry simply resets the status to `pending` and the existing progress rendering takes over seamlessly.

It's worth noting that we deliberately do not retry automatically. An automatic retry loop could hammer the upload endpoint on a flaky connection, and the honest truth is that the user is a better judge of whether their network has recovered.

## AI Slop Details

- Retry re-uses the original `FormData` rather than re-reading the file from disk, because the picker's temporary URI may have been reclaimed by iOS by the time the user taps retry.
- Failure counts are not persisted; a retry after app restart starts fresh.
- The `uploadAttachment` service method was not changed; the retry path calls it identically to the first attempt.

## Test Plan

- [x] Mark this box if automated tests would suffice for the test plan (preferred)
- [x] Verified on iOS simulator with Network Link Conditioner set to 100% loss, then restored, and tapped retry.

## Code comments (draft)

Comment 1, on the retry handler in `MessageComposer.presenter.ts`:

```ts
/**
 * Re-issues the upload for a failed attachment. We keep the original FormData around rather than
 * re-reading from the picker URI; iOS may have reclaimed the temp file by the time the user retries,
 * so re-reading would surface a confusing ENOENT instead of the network error they actually hit.
 */
```

Comment 2, on the `failedUploads` getter in the same presenter:

```ts
/** Attachments whose most recent upload attempt failed. Derived from status so it never drifts. */
```

Comment 3, in `AttachmentTile.test.tsx`:

```ts
// On native the picker returns a file:// URI and on web it returns a File, which is why the
// fixture here constructs a FormData directly instead of going through the picker mock.
```
