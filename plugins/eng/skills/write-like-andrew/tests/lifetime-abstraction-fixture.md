<!--
Micro-test for clause-stacking, lifetime-abstraction vocabulary, and coined terms.
Dispatch 5 fresh subagents with: "Read the write-like-andrew skill, then
follow the Procedure exactly to write the PR title and description for the facts in this file."
Score: grep -iwE 'owns?|owner|lifetime|lives|dies|outlives' (target 0, "their own copy" excepted);
max words per sentence (target <=30); max of and/so/because/or per sentence (target <=2);
max commas per sentence (target <=2).
The fact list below deliberately uses "owner of the ... lifetime" and "outlives any screen" —
agents lift that vocabulary straight out of source facts, which is the failure being tested.
2026-09-11 baseline BEFORE the fix: 5/5 reps emitted owns + lifetime + outlives.
AFTER: 0/5. Real-world specimen: the commit body in exemplars.md's "Not this" section.
-->

# Facts for a PR description

Write the PR title and PR description (body paragraph and Test Plan) for the change below.

## The change

- A calendar event tap does two things in sequence: start the event's meeting, then join this phone's AV if the start returned a meeting.
- That two-step was duplicated in `AgendaListPresenter` and `AgendaDetailPresenter`.
- It now lives in `RoomJoinService.joinFromEvent`. Both presenters call that in one line.
- Why it needed moving: a presenter is destroyed when its screen unmounts. The arrival rule navigates away while the start is still awaited, so the second half of the join executed after the presenter was disposed. It worked anyway only because `RootStore` is a global singleton, not because the presenter was still alive.
- `RoomJoinService` is already the owner of the meeting session's lifetime, and outlives any screen.
- No behavior change. No new tests; the existing presenter tests cover both call sites.
- Ticket: ABC-123. Ticket URL: https://tracker.example.com/ABC-123
