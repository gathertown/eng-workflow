// Pure decision logic for the Felix skill's next-action script (see nextAction.ts for the I/O
// shell that gathers GitHub/Graphite data and calls into this file). No filesystem, network,
// subprocess, sleep, or `Date.now()` reads belong here — every function takes plain data in and
// returns plain data out, which is what makes the behavior unit-testable without a live PR.
//
// This intentionally implements only the "is there anything actionable right now" decision from
// the felix-loop skill (SKILL.md's trunk-drift check, signal gathering/filtering, and the
// settling/quiet gates). CI-log diagnosis, cross-PR error-signature dedup, fix grouping, and
// claim verification stay with the LLM — they only run on rounds that are already actionable,
// which is not the token bottleneck this script targets.

// Felix's two on-disk files, relative to the repo root. Neither may live under `.repo/local`:
// that whole directory is symlinked to the main checkout in every worktree, so two felix sessions
// would silently overwrite each other's state with another stack's. `.repo/<tool>/` and the repo
// root are per-worktree. Guarded by a test in nextActionCore.test.ts.
export const STATE_FILE = ".felix-state.json"
export const PAYLOAD_FILE = ".repo/felix/next-action.json"

export const CheckEffectiveState = {
  Success: "SUCCESS",
  Failed: "FAILED",
  Cancelled: "CANCELLED",
  Running: "RUNNING",
  Unknown: "UNKNOWN",
  Absent: "ABSENT",
} as const satisfies Record<string, string>
export type CheckEffectiveState = (typeof CheckEffectiveState)[keyof typeof CheckEffectiveState]

// ABSENT (no check-run posted for a required name yet) counts as terminal — matching the
// felix-loop skill's documented terminal list (SUCCESS / FAILURE / CANCELLED / absent). A
// required check that simply never ran for this SHA (path-filtered workflow, fail-fast skip)
// must not block triaging an unrelated FAILED sibling forever, nor block a quiet exit forever —
// see `isChecksAllPassing`, which counts it as passing for exactly that reason.
const TERMINAL_CHECK_STATES: ReadonlySet<CheckEffectiveState> = new Set([
  CheckEffectiveState.Success,
  CheckEffectiveState.Failed,
  CheckEffectiveState.Cancelled,
  CheckEffectiveState.Absent,
])

export type RawCheckRun = {
  name: string
  id: number
  status: string
  conclusion: string | null
  detailsUrl: string | null
}

export type NormalizedCheck = {
  name: string
  effectiveState: CheckEffectiveState
  checkRunId: number | null
  workflowRunId: number | null
  detailsUrl: string | null
}

// GitHub Actions details URLs look like `.../actions/runs/<workflow-run-id>/job/<job-id>`. The
// workflow run id (not the check-run id) is what `gh run rerun`/`gh run view` need, so it's worth
// getting this exactly right rather than guessing from the check-run id.
const WORKFLOW_RUN_URL_PATTERN = /\/actions\/runs\/(\d+)\/job\/\d+/

const parseWorkflowRunId = (detailsUrl: string | null): number | null => {
  if (detailsUrl === null) return null
  const match = WORKFLOW_RUN_URL_PATTERN.exec(detailsUrl)
  return match ? Number(match[1]) : null
}

const effectiveStateOf = (run: RawCheckRun): CheckEffectiveState => {
  if (run.status !== "completed") return CheckEffectiveState.Running
  switch (run.conclusion) {
    case "success":
    case "skipped":
    case "neutral":
      return CheckEffectiveState.Success
    case "cancelled":
    case "stale":
      return CheckEffectiveState.Cancelled
    case "failure":
    case "timed_out":
    case "action_required":
    case "startup_failure":
      return CheckEffectiveState.Failed
    // `conclusion` is GitHub's raw string, not a closed set from our POV — a future
    // conclusion value we don't recognize falls through to UNKNOWN (poll) rather than crash.
    default:
      return CheckEffectiveState.Unknown
  }
}

// One push creates more than one run per check name for the same head SHA — a second workflow
// run whose concurrency group cancels the first, and a `gh run rerun` attempt that adds another
// check-run id to a run we already saw. Every raw run here belongs to the current commit (they
// come from `/commits/<headSha>/check-runs`), so which of them speaks for the check is a
// question of what each one established, not of recency. In order:
//
//   Live, because a run still going means the check has no verdict yet. Restarting the cancelled
//   twin instead is guaranteed to cancel again — its sibling holds the concurrency group — which
//   burns the "cancelled twice" safeguard on a healthy PR.
//
//   A verdict, because both twins usually finish with one cancelled. Ranked by id alone, the
//   cancelled one often wins and a green twin reads as a cancellation to restart. `success` and
//   `failure` rank together here and separate by id, which is what keeps a check that reruns
//   green reading as SUCCESS and a green one whose later attempt fails reading as FAILED.
//
//   Skipped, because that is how the surviving run of a concurrency pair can report its jobs,
//   and GitHub counts a skipped required check as satisfied. A head SHA can hold a check name
//   only as a `cancelled` run in the killed workflow and a `skipped` one in the survivor. Ranked
//   by id, that check would read as a restart on every round, though it's already satisfied.
//
//   Cancelled last, the one reading that establishes nothing at all.
//
// Ranking never uses started_at/completed_at, which are null on queued runs.
const SelectionRank = { Live: 0, Verdict: 1, Cancelled: 2 } as const satisfies Record<
  string,
  number
>

const rankOf = (run: RawCheckRun): number => {
  switch (effectiveStateOf(run)) {
    case CheckEffectiveState.Running:
      return SelectionRank.Live
    case CheckEffectiveState.Cancelled:
      return SelectionRank.Cancelled
    default:
      return SelectionRank.Verdict
  }
}

const speaksForCheck = (candidate: RawCheckRun, incumbent: RawCheckRun): boolean => {
  const candidateRank = rankOf(candidate)
  const incumbentRank = rankOf(incumbent)
  if (candidateRank !== incumbentRank) return candidateRank < incumbentRank
  return candidate.id > incumbent.id
}

export const normalizeCheckRuns = (
  requiredNames: string[],
  rawCheckRuns: RawCheckRun[],
): NormalizedCheck[] => {
  const latestByName = new Map<string, RawCheckRun>()
  for (const run of rawCheckRuns) {
    if (!requiredNames.includes(run.name)) continue
    const current = latestByName.get(run.name)
    if (current === undefined || speaksForCheck(run, current)) latestByName.set(run.name, run)
  }

  return requiredNames.map((name) => {
    const run = latestByName.get(name)
    if (run === undefined) {
      return {
        name,
        effectiveState: CheckEffectiveState.Absent,
        checkRunId: null,
        workflowRunId: null,
        detailsUrl: null,
      }
    }
    return {
      name,
      effectiveState: effectiveStateOf(run),
      checkRunId: run.id,
      workflowRunId: parseWorkflowRunId(run.detailsUrl),
      detailsUrl: run.detailsUrl,
    }
  })
}

export type RawWorkflowRun = { id: number; workflowId: number; status: string; event: string }

// A canceled check-run can stand alone for a minute while the survivor waits on its gate job, or
// after rerunning the twin cancels the survivor. A live replacement run of the same workflow means
// the check has no verdict yet.
export const treatLiveTwinsAsRunning = (
  checks: NormalizedCheck[],
  workflowRuns: RawWorkflowRun[],
): NormalizedCheck[] =>
  checks.map((check) =>
    hasLiveTwin(check, workflowRuns)
      ? { ...check, effectiveState: CheckEffectiveState.Running }
      : check,
  )

const hasLiveTwin = (check: NormalizedCheck, workflowRuns: RawWorkflowRun[]): boolean => {
  if (check.effectiveState !== CheckEffectiveState.Cancelled) return false
  const cancelledRun = workflowRuns.find((run) => run.id === check.workflowRunId)
  return cancelledRun !== undefined && workflowRuns.some((run) => isLiveTwinOf(run, cancelledRun))
}

// The canceled check's own run never counts, because a job canceled while E2E keeps the run going
// has no replacement coming, and restartCounts tracks felix's own reruns. A manual dispatch is in
// another concurrency group.
const isLiveTwinOf = (run: RawWorkflowRun, cancelledRun: RawWorkflowRun): boolean => {
  if (run.id === cancelledRun.id || !isLivePullRequestRun(run)) return false
  return run.workflowId === cancelledRun.workflowId
}

const isLivePullRequestRun = (run: RawWorkflowRun): boolean =>
  run.status !== "completed" && run.event === "pull_request"

const isChecksTerminal = (checks: NormalizedCheck[]): boolean =>
  checks.every((check) => TERMINAL_CHECK_STATES.has(check.effectiveState))

// ABSENT counts as passing here, not just terminal: a required check whose workflow never
// triggers for this diff (e.g. a path-filtered workflow skipped for a docs-only PR) will *never*
// post a run, and GitHub's own `mergeable`/`mergeStateStatus` computation already treats such a
// PR as clean — it never expected that check to run in the first place. Refusing to count it as
// passing would poll forever past QUIET_EXIT on an otherwise-done PR.
//
// This alone is NOT enough to prevent a false quiet exit, though: right after a push, a check
// that WILL run just hasn't had its check-run created yet either, and that's indistinguishable
// from the permanently-absent case from this function's inputs alone — both simply read ABSENT.
// `decideSettledCiOnlyRound`'s `UNKNOWN`-mergeStateStatus guard is what actually closes that gap
// (GitHub itself hasn't finished computing mergeability yet in that same window), not a RUNNING
// flip here — don't rely on this function alone to rule out a premature DONE.
const isCheckPassing = (check: NormalizedCheck): boolean =>
  check.effectiveState === CheckEffectiveState.Success ||
  check.effectiveState === CheckEffectiveState.Absent

const isChecksAllPassing = (checks: NormalizedCheck[]): boolean => checks.every(isCheckPassing)

// --- Review threads -------------------------------------------------------

export type RawReviewComment = {
  author: string
  authorType: string
  body: string
  createdAt: string
}

export type RawReviewThread = {
  id: string
  isResolved: boolean
  isOutdated: boolean
  path: string
  startLine: number | null
  line: number | null
  originalStartLine: number | null
  originalLine: number | null
  diffSide: "LEFT" | "RIGHT"
  comments: RawReviewComment[]
}

export const ThreadDisposition = {
  Resolved: "RESOLVED",
  Ambiguous: "AMBIGUOUS",
  Addressed: "ADDRESSED",
  Actionable: "ACTIONABLE",
} as const satisfies Record<string, string>
export type ThreadDisposition = (typeof ThreadDisposition)[keyof typeof ThreadDisposition]

export const FELIX_PREFIX = "[felix]"
export const AMBIGUOUS_MARKER = "[felix] Decision needed —"

const newestComment = (thread: RawReviewThread): RawReviewComment | undefined =>
  thread.comments.reduce<RawReviewComment | undefined>((newest, comment) => {
    if (newest === undefined) return comment
    return comment.createdAt > newest.createdAt ? comment : newest
  }, undefined)

// A review thread's disposition is derived entirely from live GitHub state (the resolved flag
// plus the newest comment's prefix) — never from persisted `addressed_signal_ids`. This is
// exactly what the felix-loop skill's "state reconstruction" already does on a cold start;
// running it unconditionally means threads self-heal after a human unresolves one, replies past
// a stale Felix marker, or the local state file is lost — there is no separate "normal
// operation" code path that could drift out of sync with the reconstruction path.
export const disposeReviewThread = (
  thread: RawReviewThread,
): { disposition: ThreadDisposition; reason?: string } => {
  if (thread.isResolved) return { disposition: ThreadDisposition.Resolved }

  const newest = newestComment(thread)
  if (newest === undefined) return { disposition: ThreadDisposition.Actionable }
  if (newest.body.startsWith(AMBIGUOUS_MARKER)) {
    return { disposition: ThreadDisposition.Ambiguous, reason: newest.body }
  }
  if (newest.body.startsWith(FELIX_PREFIX)) return { disposition: ThreadDisposition.Addressed }
  return { disposition: ThreadDisposition.Actionable }
}

export type ReviewThreadSignal = {
  type: "review_thread"
  id: string
  prNumber: number
  branch: string
  path: string
  startLine: number | null
  line: number | null
  originalStartLine: number | null
  originalLine: number | null
  diffSide: "LEFT" | "RIGHT"
  isOutdated: boolean
  author: string
  body: string
}

// `path` is included so the parent can name a thread's location in the DONE exit comment
// (§"Exit conditions") without re-fetching the thread just to find out where it lives.
export type AmbiguousSignal = { id: string; prNumber: number; path: string; reason: string }

export const filterReviewThreads = (
  prNumber: number,
  branch: string,
  threads: RawReviewThread[],
): { actionable: ReviewThreadSignal[]; ambiguous: AmbiguousSignal[] } => {
  const actionable: ReviewThreadSignal[] = []
  const ambiguous: AmbiguousSignal[] = []

  for (const thread of threads) {
    const { disposition, reason } = disposeReviewThread(thread)
    if (disposition === ThreadDisposition.Ambiguous) {
      ambiguous.push({ id: thread.id, prNumber, path: thread.path, reason: reason ?? "" })
      continue
    }
    if (disposition !== ThreadDisposition.Actionable) continue

    // The newest comment, not the first — a thread reopens as ACTIONABLE when a human replies
    // after felix's own last comment (see `disposeReviewThread`), and that reply is the actual
    // ask a fix subagent needs to see, not the thread's original (possibly already-addressed)
    // opening comment.
    const latest = newestComment(thread)
    actionable.push({
      type: "review_thread",
      id: thread.id,
      prNumber,
      branch,
      path: thread.path,
      startLine: thread.startLine,
      line: thread.line,
      originalStartLine: thread.originalStartLine,
      originalLine: thread.originalLine,
      diffSide: thread.diffSide,
      isOutdated: thread.isOutdated,
      author: latest?.author ?? "unknown",
      body: latest?.body ?? "",
    })
  }

  return { actionable, ambiguous }
}

// --- Issue (timeline) comments ---------------------------------------------

export type RawIssueComment = {
  id: string
  author: string
  authorType: string
  body: string
  createdAt: string
}

export type IssueCommentSignal = {
  type: "issue_comment"
  id: string
  prNumber: number
  branch: string
  author: string
  body: string
  createdAt: string
}

// Graphite's per-PR stack comment is posted from the PR author's own `User` account, so neither
// the bot-author filter nor the `[felix]` prefix catches it — it needs its own marker check.
const GRAPHITE_STACK_COMMENT_MARKER = "<!-- Current dependencies on/for this PR: -->"

const isBotChrome = (comment: RawIssueComment): boolean =>
  comment.authorType === "Bot" || comment.body.includes(GRAPHITE_STACK_COMMENT_MARKER)

const isFelixOwnComment = (comment: RawIssueComment): boolean =>
  comment.body.startsWith(FELIX_PREFIX)

// Issue (timeline) comments have no per-comment "addressed" marker the way a review thread has
// a `[felix]` reply — GitHub's issue-comments API isn't threaded, so there's no reliable signal
// that a *specific* human comment was handled. `last_check_timestamp` is therefore parent-owned:
// this script only ever fetches comments after it and never advances it itself (see nextAction.ts
// — it deliberately leaves that field alone). Only the felix-loop skill's Phase 9 bookkeeping
// advances it, and only once it has actually acted on (or explicitly triaged) this round's
// comments — otherwise an unaddressed comment would silently stop being fetched.
export const filterIssueComments = (
  prNumber: number,
  branch: string,
  comments: RawIssueComment[],
): IssueCommentSignal[] =>
  comments
    .filter((comment) => !isBotChrome(comment) && !isFelixOwnComment(comment))
    .map((comment) => ({
      type: "issue_comment",
      id: comment.id,
      prNumber,
      branch,
      author: comment.author,
      body: comment.body,
      createdAt: comment.createdAt,
    }))

// --- CI checks --------------------------------------------------------------

export type CiFailureSignal = {
  type: "ci_failure"
  id: string
  prNumber: number
  branch: string
  checkName: string
  checkRunId: number
  workflowRunId: number | null
}

export type CiCancelledSignal = {
  type: "ci_cancelled"
  id: string
  prNumber: number
  branch: string
  checkName: string
  checkRunId: number
  workflowRunId: number | null
}

// Keyed by `restartKey(prNumber, checkName)` (same shape as `RestartCounts` — see that type).
// Value is the `checkRunId` of a `ci_failure` the parent already classified UNHANDLEABLE and
// deferred on. A CI failure has no thread to reply on and no timestamp to advance the way a
// review thread or issue comment self-heals, so without this, the exact same failed run would
// re-triage every single round with no poll sleep in between (Phase 1's "no FIXABLE signals:
// re-run nextAction.ts" path never goes through the sleeping POLL branch). Filtering it out of
// `failedSignals` here still leaves `isStackAllPassing` correctly false for that check, so a
// dismissal never reaches DONE. `decideDismissedRound` returns HUMAN_REQUIRED for it instead.
// Self-heals once a new push produces a different checkRunId for the same check name.
export type DismissedCiFailures = Record<string, number>

export const filterCiChecks = (
  prNumber: number,
  branch: string,
  checks: NormalizedCheck[],
  dismissedCiFailures: DismissedCiFailures,
): { failed: CiFailureSignal[]; cancelled: CiCancelledSignal[] } => {
  const failed: CiFailureSignal[] = []
  const cancelled: CiCancelledSignal[] = []

  for (const check of checks) {
    if (check.checkRunId === null) continue
    if (check.effectiveState === CheckEffectiveState.Failed) {
      if (dismissedCiFailures[restartKey(prNumber, check.name)] === check.checkRunId) continue
      failed.push({
        type: "ci_failure",
        id: `${prNumber}:${check.name}:${check.checkRunId}`,
        prNumber,
        branch,
        checkName: check.name,
        checkRunId: check.checkRunId,
        workflowRunId: check.workflowRunId,
      })
    } else if (check.effectiveState === CheckEffectiveState.Cancelled) {
      cancelled.push({
        type: "ci_cancelled",
        id: `${prNumber}:${check.name}:${check.checkRunId}`,
        prNumber,
        branch,
        checkName: check.name,
        checkRunId: check.checkRunId,
        workflowRunId: check.workflowRunId,
      })
    }
  }

  return { failed, cancelled }
}

export type Signal = ReviewThreadSignal | IssueCommentSignal | CiFailureSignal

// --- Next-action decision ---------------------------------------------------

export type PrState = "OPEN" | "CLOSED" | "MERGED"

export type PrSnapshot = {
  prNumber: number
  branch: string
  state: PrState
  // Raw GitHub `mergeStateStatus` string (CLEAN, DIRTY, UNSTABLE, BLOCKED, BEHIND, UNKNOWN, ...).
  // Left as `string`, not a closed union — it's GitHub's vocabulary, not ours, and a value this
  // code doesn't recognize should fall through to "not clean" (poll) rather than crash.
  mergeStateStatus: string
  // Raw GitHub `reviewDecision` (APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED), or `null` when the
  // base branch requires no review at all. Loosely typed for the same reason as
  // `mergeStateStatus`: a value this code doesn't recognize must fall through to polling rather
  // than escalate to a human on a state it doesn't understand.
  reviewDecision: string | null
  reviewThreads: RawReviewThread[]
  issueComments: RawIssueComment[]
  // Already normalized against the current required-check list via `normalizeCheckRuns`.
  checks: NormalizedCheck[]
}

// Keyed by `restartKey(prNumber, checkName)`. Value is the `checkRunId` this session last told
// the parent to restart for that PR/check pair — NOT a count. A restarted run gets a brand new,
// higher check-run id; GitHub's check-runs API can still report the OLD (pre-rerun) run as
// CANCELLED for a few seconds before the new one appears, so "restarted once" must be compared
// against the specific run we restarted, not treated as "this check name is now blocked" — see
// `decideCancelled`.
export type RestartCounts = Record<string, number>

export const restartKey = (prNumber: number, checkName: string): string =>
  `${prNumber}:${checkName}`

// A restart-tracking entry only needs to live as long as the cancellation episode it tracks is
// still unresolved. Once a check reaches a genuinely resolved, non-cancelled terminal state
// (SUCCESS or FAILED) that episode is over — an entry left behind after that would make a much
// later, entirely unrelated cancellation of the same PR/check pair misread as "cancelled again"
// by `decideCancelled`, permanently blocking a fresh restart with a stale HUMAN_REQUIRED.
// RUNNING is deliberately NOT pruned: that's the in-flight replacement run the entry is tracking,
// and if IT cancels too, `decideCancelled` needs the entry still present to recognize that as a
// genuine second failure rather than a fresh one.
export const pruneResolvedRestartCounts = (
  prs: PrSnapshot[],
  restartCounts: RestartCounts,
): RestartCounts => {
  const resolvedKeys = new Set<string>()
  for (const pr of prs) {
    for (const check of pr.checks) {
      if (
        check.effectiveState === CheckEffectiveState.Success ||
        check.effectiveState === CheckEffectiveState.Failed
      ) {
        resolvedKeys.add(restartKey(pr.prNumber, check.name))
      }
    }
  }

  return Object.fromEntries(Object.entries(restartCounts).filter(([key]) => !resolvedKeys.has(key)))
}

export type NextActionDecision =
  | { kind: "STACK_LANDED" }
  | { kind: "HUMAN_REQUIRED"; prNumber: number; reason: string }
  | { kind: "SYNC_TRUNK"; prNumber: number }
  | { kind: "TRIAGE"; signals: Signal[]; ambiguousSignals: AmbiguousSignal[] }
  | { kind: "RESTART_CANCELLED"; signals: CiCancelledSignal[] }
  | { kind: "POLL"; incrementQuietRound: boolean }
  // `ambiguousSignals` rides along even on a quiet exit: a thread can sit at ACTIONABLE=false
  // (its `[felix] Decision needed —` reply is still the newest comment) while every other
  // signal is clean, and the caller must say "N decisions still waiting on you" instead of the
  // unqualified "ready to land" in that case.
  | { kind: "DONE"; topPrNumber: number; ambiguousSignals: AmbiguousSignal[] }

export type EvaluateNextActionInput = {
  prs: PrSnapshot[]
  requiredChecks: string[]
  consecutiveQuietRounds: number
  quietExit: number
  // Caller's responsibility to run through `pruneResolvedRestartCounts(prs, ...)` first — this
  // function trusts it's already current for `prs` and doesn't re-derive it, since a resolved
  // entry only matters for the persisted copy the next round reads, not this round's decision.
  restartCounts: RestartCounts
  dismissedCiFailures: DismissedCiFailures
  topPrNumber: number
}

// Empty required-check list means detection failed — fall back to `mergeStateStatus` as the sole
// signal (CLEAN = terminal and green, anything else = not) rather than treating "nothing to
// check" as vacuously green. See the felix-loop skill's "CI scope" §"Empty required-checks list".
const isStackRequiredTerminal = (prs: PrSnapshot[], requiredChecks: string[]): boolean =>
  requiredChecks.length === 0
    ? prs.every((pr) => pr.mergeStateStatus === "CLEAN")
    : prs.every((pr) => isChecksTerminal(pr.checks))

// Distinct from `isStackRequiredTerminal`: this is the "was it actually green" check, called
// only once every required check has already settled (see `decideCiOnlyRound`). CANCELLED
// settles (it's terminal) but never counts as passing here — a cancelled check produced no
// verdict and must be restarted or escalated, never silently treated as a pass.
const isStackAllPassing = (prs: PrSnapshot[], requiredChecks: string[]): boolean =>
  requiredChecks.length === 0
    ? prs.every((pr) => pr.mergeStateStatus === "CLEAN")
    : prs.every((pr) => isChecksAllPassing(pr.checks))

export const evaluateNextAction = (input: EvaluateNextActionInput): NextActionDecision => {
  const { prs, requiredChecks } = input

  if (isStackLanded(prs)) return { kind: "STACK_LANDED" }

  const dirtyPr = findDirtyPr(prs)
  if (dirtyPr !== undefined) return { kind: "SYNC_TRUNK", prNumber: dirtyPr.prNumber }

  const gathered = gatherSignals(prs, input.dismissedCiFailures)
  const hasReviewSignals = gathered.reviewSignals.length > 0 || gathered.commentSignals.length > 0
  const requiredTerminal = isStackRequiredTerminal(prs, requiredChecks)

  // Review feedback goes first, because a RESTART_CANCELLED payload carries only the canceled
  // checks. A cancellation that survives the fix round's push comes back on the next round.
  if (hasReviewSignals) return triageReviewRound(gathered, requiredTerminal)

  // Restarting a canceled check is a cheap, always-safe action that doesn't need the rest of the
  // stack to settle first. See the felix-loop skill's `Handling cancelled required checks`. A
  // clean FAILED check on the same landscape still takes priority over a cancel, so this only
  // fires once we know there's no failure to triage instead.
  if (gathered.failedSignals.length === 0) {
    const cancelledDecision = decideCancelled(gathered.cancelledSignals, input.restartCounts)
    if (cancelledDecision !== null) return cancelledDecision
  }

  if (!requiredTerminal) return { kind: "POLL", incrementQuietRound: false }

  return decideCiOnlyRound(input, gathered)
}

const isStackLanded = (prs: PrSnapshot[]): boolean =>
  prs.every((pr) => pr.state === "MERGED" || pr.state === "CLOSED")

const findDirtyPr = (prs: PrSnapshot[]): PrSnapshot | undefined =>
  prs.find((pr) => pr.mergeStateStatus === "DIRTY")

type GatheredSignals = ReturnType<typeof gatherSignals>

// Review threads and issue comments are actionable regardless of CI state (see the felix-loop
// skill's "Why CI doesn't gate review-fix rounds") — a terminal CI failure only rides along
// once the stack has actually settled, so a fix round doesn't triage a check that's still
// mid-flight.
const triageReviewRound = (
  gathered: GatheredSignals,
  requiredTerminal: boolean,
): NextActionDecision => {
  const signals: Signal[] = [...gathered.reviewSignals, ...gathered.commentSignals]
  if (requiredTerminal) signals.push(...gathered.failedSignals)
  return { kind: "TRIAGE", signals, ambiguousSignals: gathered.ambiguousSignals }
}

// Reached only once there are no review/comment signals to triage, every required check is
// terminal (ABSENT included — see TERMINAL_CHECK_STATES), and (per the caller) there's no
// cancelled check left to restart either.
const decideCiOnlyRound = (
  input: EvaluateNextActionInput,
  gathered: GatheredSignals,
): NextActionDecision => {
  if (gathered.failedSignals.length > 0) {
    return {
      kind: "TRIAGE",
      signals: gathered.failedSignals,
      ambiguousSignals: gathered.ambiguousSignals,
    }
  }

  // Terminal doesn't imply passing: a CANCELLED check settled without a verdict and must not
  // count toward a quiet exit (ABSENT does count — see `isChecksAllPassing`).
  if (!isStackAllPassing(input.prs, input.requiredChecks)) {
    const dismissed = dismissedFailuresOf(input.prs, input.dismissedCiFailures)
    const [firstDismissed] = dismissed
    if (
      firstDismissed === undefined ||
      !isPassingOrDismissed(input.prs, input.dismissedCiFailures)
    ) {
      return { kind: "POLL", incrementQuietRound: false }
    }
    return decideDismissedRound(input, dismissed, firstDismissed.prNumber)
  }

  return decideSettledCiOnlyRound(input, gathered.ambiguousSignals)
}

type DismissedFailure = { prNumber: number; checkName: string }

const isDismissedFailure = (
  prNumber: number,
  check: NormalizedCheck,
  dismissedCiFailures: DismissedCiFailures,
): boolean =>
  check.effectiveState === CheckEffectiveState.Failed &&
  dismissedCiFailures[restartKey(prNumber, check.name)] === check.checkRunId

const dismissedFailuresOf = (
  prs: PrSnapshot[],
  dismissedCiFailures: DismissedCiFailures,
): DismissedFailure[] =>
  prs.flatMap((pr) =>
    pr.checks
      .filter((check) => isDismissedFailure(pr.prNumber, check, dismissedCiFailures))
      .map((check) => ({ prNumber: pr.prNumber, checkName: check.name })),
  )

const isPassingOrDismissed = (
  prs: PrSnapshot[],
  dismissedCiFailures: DismissedCiFailures,
): boolean =>
  prs.every((pr) =>
    pr.checks.every(
      (check) =>
        isCheckPassing(check) || isDismissedFailure(pr.prNumber, check, dismissedCiFailures),
    ),
  )

// A dismissed failure stays red until a human acts, so more polling can't clear it.
const decideDismissedRound = (
  input: EvaluateNextActionInput,
  dismissed: DismissedFailure[],
  prNumber: number,
): NextActionDecision => {
  if (input.prs.some((pr) => pr.mergeStateStatus === "UNKNOWN")) {
    return { kind: "POLL", incrementQuietRound: false }
  }
  // A PR pushed seconds ago reads as passing until its check-runs exist, so this waits QUIET_EXIT
  // rounds first.
  if (input.consecutiveQuietRounds + 1 < input.quietExit) {
    return { kind: "POLL", incrementQuietRound: true }
  }
  return { kind: "HUMAN_REQUIRED", prNumber, reason: dismissedFailuresReason(dismissed) }
}

const dismissedFailuresReason = (dismissed: DismissedFailure[]): string => {
  const checkNames = [...new Set(dismissed.map((failure) => failure.checkName))]
  const perCheck = checkNames.map((checkName) => {
    const prNumbers = dismissed
      .filter((failure) => failure.checkName === checkName)
      .map((failure) => `#${failure.prNumber}`)
    return `${checkName} on ${prNumbers.join(", ")}`
  })
  return `Required checks dismissed as UNHANDLEABLE are still red: ${perCheck.join(" and ")}. Nothing else is failing or running, so this needs a human.`
}

// Reached with every required check green (ABSENT included — see `isChecksAllPassing`), so the
// only thing left to decide is which terminal state this is: ready to land, waiting on a reviewer,
// or blocked on something neither of those describes. Whichever it is, it has to survive
// QUIET_EXIT consecutive rounds first — a stack that just took a push looks exactly like a green
// one for a few seconds, and that settling requirement is what tells them apart.
const decideSettledCiOnlyRound = (
  input: EvaluateNextActionInput,
  ambiguousSignals: AmbiguousSignal[],
): NextActionDecision => {
  const { prs, consecutiveQuietRounds, quietExit, topPrNumber } = input

  // UNKNOWN is GitHub still computing mergeability right after a push. Check-runs for the new SHA
  // often haven't been created yet in this exact window, so every required check reads ABSENT (see
  // `isChecksAllPassing`) even though CI hasn't started — UNKNOWN is the tell that this snapshot
  // says nothing about the stack, so no quiet round is banked from it either.
  if (prs.some((pr) => pr.mergeStateStatus === "UNKNOWN")) {
    return { kind: "POLL", incrementQuietRound: false }
  }

  const reviewBlockedPr = prs.find(isWaitingOnReview)

  // BLOCKED for something other than review — GitHub's required-conversation-resolution rule, or a
  // check it still expects that Felix's required list doesn't cover. Nothing here to name a human
  // for and nothing to declare done, so this keeps polling exactly as before, banking no quiet
  // rounds.
  const blockedPr = prs.find((pr) => pr.mergeStateStatus === "BLOCKED")
  if (blockedPr !== undefined && reviewBlockedPr === undefined) {
    return { kind: "POLL", incrementQuietRound: false }
  }

  if (consecutiveQuietRounds + 1 < quietExit) return { kind: "POLL", incrementQuietRound: true }
  return reviewBlockedPr === undefined
    ? { kind: "DONE", topPrNumber, ambiguousSignals }
    : humanRequiredForReview(reviewBlockedPr)
}

// GitHub `reviewDecision` values that mean a human still has to act before this PR can merge:
// nobody has approved yet, or an approval was withdrawn by a changes-requested review. APPROVED
// and `null` (base branch requires no review) are excluded — a BLOCKED PR in either of those
// states is blocked on something else, and polling stays the right response.
const REVIEW_PENDING_DECISIONS: ReadonlySet<string> = new Set([
  "REVIEW_REQUIRED",
  "CHANGES_REQUESTED",
])

// A green PR that GitHub reports BLOCKED with review still outstanding is a state polling cannot
// resolve: no push, rerun, or fix Felix makes changes it, so the loop would otherwise poll until
// POLL_TIMEOUT for nothing.
const isWaitingOnReview = (pr: PrSnapshot): boolean =>
  pr.mergeStateStatus === "BLOCKED" &&
  pr.reviewDecision !== null &&
  REVIEW_PENDING_DECISIONS.has(pr.reviewDecision)

// Distinct reasons because the human's next move differs: an unapproved PR needs a reviewer at
// all, while a changes-requested one has a reviewer who already looked and whose re-review Felix
// has no way to prompt beyond the review re-request it already sent.
const humanRequiredForReview = (pr: PrSnapshot): NextActionDecision => ({
  kind: "HUMAN_REQUIRED",
  prNumber: pr.prNumber,
  reason:
    pr.reviewDecision === "CHANGES_REQUESTED"
      ? `Required checks are green on PR #${pr.prNumber}, but it still has changes requested and no review thread left to act on — waiting on a re-review.`
      : `Required checks are green on PR #${pr.prNumber}, but it's blocked awaiting approval — waiting on a reviewer.`,
})

const gatherSignals = (prs: PrSnapshot[], dismissedCiFailures: DismissedCiFailures) => {
  const reviewSignals: ReviewThreadSignal[] = []
  const commentSignals: IssueCommentSignal[] = []
  const failedSignals: CiFailureSignal[] = []
  const cancelledSignals: CiCancelledSignal[] = []
  const ambiguousSignals: AmbiguousSignal[] = []

  for (const pr of prs) {
    const threads = filterReviewThreads(pr.prNumber, pr.branch, pr.reviewThreads)
    reviewSignals.push(...threads.actionable)
    ambiguousSignals.push(...threads.ambiguous)
    commentSignals.push(...filterIssueComments(pr.prNumber, pr.branch, pr.issueComments))

    const ci = filterCiChecks(pr.prNumber, pr.branch, pr.checks, dismissedCiFailures)
    failedSignals.push(...ci.failed)
    cancelledSignals.push(...ci.cancelled)
  }

  return { reviewSignals, commentSignals, failedSignals, cancelledSignals, ambiguousSignals }
}

const CancelDisposition = {
  // Never restarted (for this key) before.
  Fresh: "FRESH",
  // We already told the parent to restart exactly this check-run id. GitHub hasn't caught up
  // yet — the rerun creates a brand new, higher check-run id, so seeing the SAME id still
  // CANCELLED is propagation lag, not a second failure. Nothing to do; wait for the new run.
  PendingRestart: "PENDING_RESTART",
  // The check-run id has changed since our last restart, and it's cancelled again — a
  // genuinely new failure on the run we already restarted once.
  CancelledAgain: "CANCELLED_AGAIN",
} as const satisfies Record<string, string>

const cancelDispositionOf = (
  signal: CiCancelledSignal,
  restartCounts: RestartCounts,
): (typeof CancelDisposition)[keyof typeof CancelDisposition] => {
  const lastRestartedRunId = restartCounts[restartKey(signal.prNumber, signal.checkName)]
  if (lastRestartedRunId === undefined) return CancelDisposition.Fresh
  return lastRestartedRunId === signal.checkRunId
    ? CancelDisposition.PendingRestart
    : CancelDisposition.CancelledAgain
}

// A cancelled check with no verdict isn't a failure — restart it once per session. This script
// never calls `gh run rerun` itself (it stays read-only); the caller performs the restart and
// records it in `restartCounts` before the next invocation. Decided per check, not for the
// batch as a whole: one check that can't be restarted (or has already cancelled twice) must
// never block a genuinely fresh cancellation on a different check from restarting this round.
const decideCancelled = (
  cancelledSignals: CiCancelledSignal[],
  restartCounts: RestartCounts,
): NextActionDecision | null => {
  if (cancelledSignals.length === 0) return null

  const isFreshRestart = (signal: CiCancelledSignal): boolean =>
    signal.workflowRunId !== null &&
    cancelDispositionOf(signal, restartCounts) === CancelDisposition.Fresh

  const restartable = cancelledSignals.filter(isFreshRestart)
  if (restartable.length > 0) return { kind: "RESTART_CANCELLED", signals: restartable }

  // Nothing here is freshly restartable. Missing a workflow run id needs a human regardless of
  // restart history. Surface whichever applies first — the other case resolves itself once a
  // human clears this one and Felix re-gathers.
  const missingWorkflowRun = cancelledSignals.find((signal) => signal.workflowRunId === null)
  if (missingWorkflowRun !== undefined) {
    return {
      kind: "HUMAN_REQUIRED",
      prNumber: missingWorkflowRun.prNumber,
      reason: `Required check "${missingWorkflowRun.checkName}" was cancelled, but its workflow run id couldn't be determined — restart it manually.`,
    }
  }

  const cancelledAgain = cancelledSignals.find(
    (signal) => cancelDispositionOf(signal, restartCounts) === CancelDisposition.CancelledAgain,
  )
  if (cancelledAgain !== undefined) {
    return {
      kind: "HUMAN_REQUIRED",
      prNumber: cancelledAgain.prNumber,
      reason: `Required check "${cancelledAgain.checkName}" cancelled twice in this session — likely infrastructure, not flake.`,
    }
  }

  // Everything remaining is PENDING_RESTART: the exact run we already restarted, still
  // propagating on GitHub's side. Nothing to act on this round — the caller's terminal-but-not-
  // passing gate (CANCELLED isn't SUCCESS) keeps polling until a new run appears.
  return null
}

// --- Transient `gh` failures -------------------------------------------------

// `gh` reports every failure the same way — a non-zero exit with the detail on stderr — so
// deciding whether a failure is worth retrying is string matching over that output. It lives here,
// not in the retry loop that uses it, so the patterns are unit-testable: a pattern that's too
// broad silently retries a real failure (a bad query, a deleted PR) three times before reporting
// it, and one that's too narrow drops the whole loop on a blip.
const TRANSIENT_GH_FAILURE_PATTERNS: readonly RegExp[] = [
  // GitHub's own 5xx bodies, however gh phrases them ("HTTP 502: Bad Gateway (...)").
  /HTTP 5\d\d/,
  /Bad Gateway/i,
  /Service Unavailable/i,
  /Gateway Time-?out/i,
  /Internal Server Error/i,
  // Node/OS-level transport failures before any HTTP status exists.
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE/,
  /socket hang up/i,
  /connection reset/i,
  /TLS handshake/i,
  /unexpected EOF/i,
  /timed? ?out/i,
  // Secondary rate limits are explicitly documented as "wait and retry"; the primary hourly
  // limit is deliberately absent — it doesn't clear within any backoff worth sitting through.
  /secondary rate limit/i,
  /abuse detection/i,
]

export const isTransientGhFailure = (errorText: string): boolean =>
  TRANSIENT_GH_FAILURE_PATTERNS.some((pattern) => pattern.test(errorText))

// --- Rate limit pacing --------------------------------------------------------

export type RateLimitBucket = { remaining: number; resetAtMs: number }

// One round makes two GraphQL calls per PR (`gh pr view` and the review threads) and three REST
// calls per PR (issue comments, check-runs, workflow runs). The stack adds two of each.
const roundCostOf = (prCount: number): { core: number; graphql: number } => ({
  core: prCount * 3 + 2,
  graphql: prCount * 2 + 2,
})

// Kept back for the parent's own `gh` calls and for other felix sessions on the same token.
const RATE_LIMIT_RESERVE = 500

const spacingFor = (bucket: RateLimitBucket, roundCost: number, nowMs: number): number => {
  const msUntilReset = Math.max(0, bucket.resetAtMs - nowMs)
  const budget = bucket.remaining - RATE_LIMIT_RESERVE
  if (budget < roundCost) return msUntilReset
  return Math.ceil((msUntilReset * roundCost) / budget)
}

export type PollDelayInput = {
  pollIntervalMs: number
  nowMs: number
  prCount: number
  core: RateLimitBucket
  graphql: RateLimitBucket
}

export const pollDelayMs = (input: PollDelayInput): number => {
  const roundCost = roundCostOf(input.prCount)
  return Math.max(
    input.pollIntervalMs,
    spacingFor(input.core, roundCost.core, input.nowMs),
    spacingFor(input.graphql, roundCost.graphql, input.nowMs),
  )
}

// --- Poll waits -------------------------------------------------------------

export type PollWait = { sleepMs: number; next: "ROUND" | "KEEP_POLLING" | "TIMEOUT" }

export type PollWaitInput = {
  nowMs: number
  nextRoundAtMs: number
  callEndMs: number
  deadlineMs: number
}

export const planPollWait = (input: PollWaitInput): PollWait => {
  const wakeAtMs = Math.min(input.nextRoundAtMs, input.callEndMs, input.deadlineMs)
  const sleepMs = Math.max(0, wakeAtMs - input.nowMs)
  // `next` comes from the planned wake time, because a timer can fire a millisecond early and a
  // check after the sleep would read the round as not due yet.
  if (input.deadlineMs === wakeAtMs) return { sleepMs, next: "TIMEOUT" }
  if (input.nextRoundAtMs > input.callEndMs) return { sleepMs, next: "KEEP_POLLING" }
  return { sleepMs, next: "ROUND" }
}
