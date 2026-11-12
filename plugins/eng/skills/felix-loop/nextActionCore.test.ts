// Pure tests for nextActionCore.ts — no live GitHub, git, Graphite, sleeps, or subprocesses, every
// case is plain data in, plain data out. Fixtures are deliberately minimal; only the fields each
// rule reads are set. Runs as the `felix-loop` Jest project (see jest.config.js in this
// directory).

import {
  disposeReviewThread,
  evaluateNextAction,
  filterCiChecks,
  filterIssueComments,
  filterReviewThreads,
  isTransientGhFailure,
  type NextActionDecision,
  normalizeCheckRuns,
  type NormalizedCheck,
  PAYLOAD_FILE,
  planPollWait,
  pollDelayMs,
  type PrSnapshot,
  pruneResolvedRestartCounts,
  type RawCheckRun,
  type RawIssueComment,
  type RawReviewThread,
  type RawWorkflowRun,
  STATE_FILE,
  ThreadDisposition,
  treatLiveTwinsAsRunning,
} from "./nextActionCore"

// Jest's `toEqual` isn't declared as a TypeScript assertion function, so it doesn't narrow a
// discriminated union the way `just()` narrows a nullable elsewhere in this codebase's tests.
// This is the same idea adapted to a `kind` discriminant: assert and narrow in one step so the
// rest of the test can read the matched variant's fields directly.
function assertDecisionKind<K extends NextActionDecision["kind"]>(
  decision: NextActionDecision,
  kind: K,
): asserts decision is Extract<NextActionDecision, { kind: K }> {
  expect(decision.kind).toEqual(kind)
}

describe("#normalizeCheckRuns", () => {
  const checkRun = (overrides: Partial<RawCheckRun>): RawCheckRun => ({
    name: "test",
    id: 1,
    status: "completed",
    conclusion: "success",
    detailsUrl: null,
    ...overrides,
  })

  it("selects the latest check run by numeric id, not by timestamp order", () => {
    const runs = [
      checkRun({ id: 5, conclusion: "failure" }),
      checkRun({ id: 12, conclusion: "success" }),
    ]

    const [normalized] = normalizeCheckRuns(["test"], runs)

    expect(normalized?.effectiveState).toEqual("SUCCESS")
    expect(normalized?.checkRunId).toEqual(12)
  })

  it("prefers a live run over a cancelled twin with a higher id", () => {
    const runs = [
      checkRun({ id: 40, status: "queued", conclusion: null }),
      checkRun({ id: 99, conclusion: "cancelled" }),
    ]

    const [normalized] = normalizeCheckRuns(["test"], runs)

    expect(normalized?.effectiveState).toEqual("RUNNING")
    expect(normalized?.checkRunId).toEqual(40)
  })

  it.each([
    ["success", "SUCCESS"],
    ["failure", "FAILED"],
  ])(
    "prefers a twin that concluded %s over a cancelled one with a higher id",
    (conclusion, state) => {
      const runs = [checkRun({ id: 40, conclusion }), checkRun({ id: 99, conclusion: "cancelled" })]

      const [normalized] = normalizeCheckRuns(["test"], runs)

      expect(normalized?.effectiveState).toEqual(state)
      expect(normalized?.checkRunId).toEqual(40)
    },
  )

  /**
   * How the surviving run of a concurrency pair can report a job: the killed run
   * leaves a cancelled check-run and the survivor a skipped one, with no `success` for that name
   * anywhere on the SHA. GitHub counts skipped as satisfied, so the cancellation must not speak.
   */
  it("prefers a skipped twin over a cancelled one, whichever id is higher", () => {
    const runs = [
      checkRun({ id: 40, conclusion: "skipped" }),
      checkRun({ id: 99, conclusion: "cancelled" }),
    ]

    const [normalized] = normalizeCheckRuns(["test"], runs)

    expect(normalized?.effectiveState).toEqual("SUCCESS")
    expect(normalized?.checkRunId).toEqual(40)
  })

  it("keeps the newest attempt when a green check is rerun and fails", () => {
    const runs = [
      checkRun({ id: 40, conclusion: "success" }),
      checkRun({ id: 99, conclusion: "failure" }),
    ]

    const [normalized] = normalizeCheckRuns(["test"], runs)

    expect(normalized?.effectiveState).toEqual("FAILED")
  })

  it("keeps the newest attempt when a rerun of a failed check goes green", () => {
    const runs = [
      checkRun({ id: 40, conclusion: "failure" }),
      checkRun({ id: 99, conclusion: "success" }),
    ]

    const [normalized] = normalizeCheckRuns(["test"], runs)

    expect(normalized?.effectiveState).toEqual("SUCCESS")
  })

  it.each(["success", "skipped", "neutral"])(
    "maps a completed %s conclusion to SUCCESS",
    (conclusion) => {
      const [normalized] = normalizeCheckRuns(["test"], [checkRun({ conclusion })])
      expect(normalized?.effectiveState).toEqual("SUCCESS")
    },
  )

  it.each(["failure", "timed_out", "action_required", "startup_failure"])(
    "maps a completed %s conclusion to FAILED",
    (conclusion) => {
      const [normalized] = normalizeCheckRuns(["test"], [checkRun({ conclusion })])
      expect(normalized?.effectiveState).toEqual("FAILED")
    },
  )

  it.each(["cancelled", "stale"])("maps a completed %s conclusion to CANCELLED", (conclusion) => {
    const [normalized] = normalizeCheckRuns(["test"], [checkRun({ conclusion })])
    expect(normalized?.effectiveState).toEqual("CANCELLED")
  })

  it("maps a non-completed run to RUNNING regardless of conclusion", () => {
    const [normalized] = normalizeCheckRuns(
      ["test"],
      [checkRun({ status: "in_progress", conclusion: null })],
    )
    expect(normalized?.effectiveState).toEqual("RUNNING")
  })

  it("maps an unrecognized conclusion to UNKNOWN", () => {
    const [normalized] = normalizeCheckRuns(
      ["test"],
      [checkRun({ conclusion: "some_future_value" })],
    )
    expect(normalized?.effectiveState).toEqual("UNKNOWN")
  })

  it("reports a required check with no matching run as ABSENT", () => {
    const [normalized] = normalizeCheckRuns(["build"], [])
    expect(normalized?.effectiveState).toEqual("ABSENT")
    expect(normalized?.checkRunId).toEqual(null)
  })

  it("drops runs for checks outside the required list", () => {
    const runs = [checkRun({ name: "dependency-scan" })]
    expect(normalizeCheckRuns(["test"], runs)).toEqual([
      {
        name: "test",
        effectiveState: "ABSENT",
        checkRunId: null,
        workflowRunId: null,
        detailsUrl: null,
      },
    ])
  })

  it("parses the workflow run id out of an Actions details URL", () => {
    const [normalized] = normalizeCheckRuns(
      ["test"],
      [checkRun({ detailsUrl: "https://github.com/o/r/actions/runs/999/job/111" })],
    )
    expect(normalized?.workflowRunId).toEqual(999)
  })

  it("leaves workflowRunId null when the details URL doesn't match the expected shape", () => {
    const [normalized] = normalizeCheckRuns(
      ["test"],
      [checkRun({ detailsUrl: "https://example.com" })],
    )
    expect(normalized?.workflowRunId).toEqual(null)
  })
})

const reviewThread = (overrides: Partial<RawReviewThread>): RawReviewThread => ({
  id: "PRT_1",
  isResolved: false,
  isOutdated: false,
  path: "src/foo.ts",
  startLine: null,
  line: 10,
  originalStartLine: null,
  originalLine: null,
  diffSide: "RIGHT",
  comments: [
    { author: "reviewer", authorType: "User", body: "fix this", createdAt: "2026-01-01T00:00:00Z" },
  ],
  ...overrides,
})

describe("#disposeReviewThread", () => {
  it("a resolved thread is RESOLVED regardless of its newest comment", () => {
    const thread = reviewThread({
      isResolved: true,
      comments: [
        {
          author: "bot",
          authorType: "Bot",
          body: "still broken",
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
    })

    expect(disposeReviewThread(thread).disposition).toEqual(ThreadDisposition.Resolved)
  })

  it("an unresolved thread with no [felix] reply is ACTIONABLE", () => {
    const thread = reviewThread({
      comments: [
        { author: "r", authorType: "User", body: "please fix", createdAt: "2026-01-01T00:00:00Z" },
      ],
    })

    expect(disposeReviewThread(thread).disposition).toEqual(ThreadDisposition.Actionable)
  })

  it("an unresolved thread whose newest comment is a plain [felix] reply is ADDRESSED", () => {
    const thread = reviewThread({
      comments: [
        { author: "r", authorType: "User", body: "please fix", createdAt: "2026-01-01T00:00:00Z" },
        {
          author: "felix",
          authorType: "User",
          body: "[felix] fixed it",
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
    })

    expect(disposeReviewThread(thread).disposition).toEqual(ThreadDisposition.Addressed)
  })

  it("an unresolved thread whose newest comment starts the decision-needed marker is AMBIGUOUS", () => {
    const thread = reviewThread({
      comments: [
        { author: "r", authorType: "User", body: "please fix", createdAt: "2026-01-01T00:00:00Z" },
        {
          author: "felix",
          authorType: "User",
          body: "[felix] Decision needed — @r which approach do you want?",
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
    })

    const result = disposeReviewThread(thread)

    expect(result.disposition).toEqual(ThreadDisposition.Ambiguous)
    expect(result.reason).toMatch(/Decision needed/)
  })

  it("a reply after felix's decision-needed marker re-opens the thread as ACTIONABLE", () => {
    const thread = reviewThread({
      comments: [
        {
          author: "felix",
          authorType: "User",
          body: "[felix] Decision needed — @r which approach do you want?",
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          author: "r",
          authorType: "User",
          body: "let's go with option 2",
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
    })

    expect(disposeReviewThread(thread).disposition).toEqual(ThreadDisposition.Actionable)
  })

  it("resolving an ambiguous thread without a reply settles it as RESOLVED, not ambiguous", () => {
    const thread = reviewThread({
      isResolved: true,
      comments: [
        {
          author: "felix",
          authorType: "User",
          body: "[felix] Decision needed — @r which approach do you want?",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    })

    expect(disposeReviewThread(thread).disposition).toEqual(ThreadDisposition.Resolved)
  })
})

describe("#filterReviewThreads", () => {
  it("splits actionable signals from pending ambiguous decisions", () => {
    const actionableThread = reviewThread({ id: "PRT_actionable" })
    const ambiguousThread = reviewThread({
      id: "PRT_ambiguous",
      comments: [
        {
          author: "felix",
          authorType: "User",
          body: "[felix] Decision needed — pick one",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    })
    const resolvedThread = reviewThread({ id: "PRT_resolved", isResolved: true })

    const result = filterReviewThreads(1, "feature", [
      actionableThread,
      ambiguousThread,
      resolvedThread,
    ])

    expect(result.actionable.map((signal) => signal.id)).toEqual(["PRT_actionable"])
    expect(result.ambiguous.map((signal) => signal.id)).toEqual(["PRT_ambiguous"])
    // The exit comment needs a location to point the author at, not just the thread's id.
    expect(result.ambiguous[0]?.path).toEqual("src/foo.ts")
  })

  it("a reopened thread's signal carries the human's reply, not the original opening comment", () => {
    const thread = reviewThread({
      comments: [
        {
          author: "felix",
          authorType: "User",
          body: "[felix] fixed it",
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          author: "r",
          authorType: "User",
          body: "still broken, see line 42",
          createdAt: "2026-01-02T00:00:00Z",
        },
      ],
    })

    const result = filterReviewThreads(1, "feature", [thread])

    expect(result.actionable[0]?.author).toEqual("r")
    expect(result.actionable[0]?.body).toEqual("still broken, see line 42")
  })
})

describe("#filterIssueComments", () => {
  const issueComment = (overrides: Partial<RawIssueComment>): RawIssueComment => ({
    id: "IC_1",
    author: "someone",
    authorType: "User",
    body: "hello",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  })

  it("drops bot-authored issue comments", () => {
    const comments = [issueComment({ authorType: "Bot", body: "Scan found 0 issues" })]

    expect(filterIssueComments(1, "feature", comments)).toEqual([])
  })

  it("keeps a human issue comment even when it looks like feedback", () => {
    const comments = [issueComment({ body: "can you also handle the empty case?" })]

    expect(filterIssueComments(1, "feature", comments)).toHaveLength(1)
  })

  it("drops Graphite's stack-dependency comment by its marker even though it's posted as a User", () => {
    const comments = [
      issueComment({
        authorType: "User",
        body: "Current dependencies\n<!-- Current dependencies on/for this PR: -->",
      }),
    ]

    expect(filterIssueComments(1, "feature", comments)).toEqual([])
  })

  it("drops felix's own prior comments", () => {
    const comments = [issueComment({ body: "[felix] Addressed the null check." })]

    expect(filterIssueComments(1, "feature", comments)).toEqual([])
  })
})

const normalizedCheck = (overrides: Partial<NormalizedCheck>): NormalizedCheck => ({
  name: "test",
  effectiveState: "SUCCESS",
  checkRunId: 1,
  workflowRunId: null,
  detailsUrl: null,
  ...overrides,
})

describe("#filterCiChecks", () => {
  it("separates failed and cancelled checks", () => {
    const checks = [
      normalizedCheck({ name: "lint", effectiveState: "SUCCESS" }),
      normalizedCheck({ name: "test", effectiveState: "FAILED", checkRunId: 2 }),
      normalizedCheck({ name: "build", effectiveState: "CANCELLED", checkRunId: 3 }),
    ]

    const result = filterCiChecks(1, "feature", checks, {})

    expect(result.failed.map((signal) => signal.checkName)).toEqual(["test"])
    expect(result.cancelled.map((signal) => signal.checkName)).toEqual(["build"])
  })

  it("carries the workflow run id onto a failure signal", () => {
    const checks = [
      normalizedCheck({ effectiveState: "FAILED", checkRunId: 2, workflowRunId: 999 }),
    ]

    const result = filterCiChecks(1, "feature", checks, {})

    expect(result.failed[0]?.workflowRunId).toEqual(999)
  })

  it("ignores an ABSENT required check (never started yet, not a failure)", () => {
    const checks = [normalizedCheck({ effectiveState: "ABSENT", checkRunId: null })]

    const result = filterCiChecks(1, "feature", checks, {})

    expect(result).toEqual({ failed: [], cancelled: [] })
  })

  it("drops a failed check whose checkRunId matches a dismissed (UNHANDLEABLE) entry", () => {
    const checks = [normalizedCheck({ name: "lint", effectiveState: "FAILED", checkRunId: 5 })]

    const result = filterCiChecks(1, "feature", checks, { "1:lint": 5 })

    expect(result).toEqual({ failed: [], cancelled: [] })
  })

  it("re-surfaces a failed check once a new push produces a different checkRunId than the dismissed one", () => {
    const checks = [normalizedCheck({ name: "lint", effectiveState: "FAILED", checkRunId: 6 })]

    const result = filterCiChecks(1, "feature", checks, { "1:lint": 5 })

    expect(result.failed.map((signal) => signal.checkRunId)).toEqual([6])
  })
})

const pr = (overrides: Partial<PrSnapshot>): PrSnapshot => ({
  prNumber: 1,
  branch: "feature",
  state: "OPEN",
  mergeStateStatus: "CLEAN",
  reviewDecision: null,
  reviewThreads: [],
  issueComments: [],
  checks: [normalizedCheck({})],
  ...overrides,
})

describe("#treatLiveTwinsAsRunning", () => {
  const cancelled = normalizedCheck({
    effectiveState: "CANCELLED",
    checkRunId: 9,
    workflowRunId: 900,
  })

  const workflowRun = (overrides: Partial<RawWorkflowRun>): RawWorkflowRun => ({
    id: 900,
    workflowId: 7,
    status: "completed",
    event: "pull_request",
    ...overrides,
  })

  it("reads a cancelled check as running while its twin run is going", () => {
    const runs = [workflowRun({}), workflowRun({ id: 901, status: "in_progress" })]

    const [check] = treatLiveTwinsAsRunning([cancelled], runs)

    expect(check?.effectiveState).toEqual("RUNNING")
  })

  it("keeps a cancellation while only its own run is still going", () => {
    const [check] = treatLiveTwinsAsRunning([cancelled], [workflowRun({ status: "in_progress" })])

    expect(check?.effectiveState).toEqual("CANCELLED")
  })

  it("keeps a cancellation while only a manual dispatch of its workflow is going", () => {
    const runs = [
      workflowRun({}),
      workflowRun({ id: 901, status: "queued", event: "workflow_dispatch" }),
    ]

    const [check] = treatLiveTwinsAsRunning([cancelled], runs)

    expect(check?.effectiveState).toEqual("CANCELLED")
  })

  it("keeps a cancellation once only another workflow is still going", () => {
    const runs = [workflowRun({}), workflowRun({ id: 902, workflowId: 8, status: "in_progress" })]

    const [check] = treatLiveTwinsAsRunning([cancelled], runs)

    expect(check?.effectiveState).toEqual("CANCELLED")
  })
})

describe("#pruneResolvedRestartCounts", () => {
  it("drops an entry once its check resolves to SUCCESS", () => {
    const prs = [pr({ checks: [normalizedCheck({ name: "lint", effectiveState: "SUCCESS" })] })]

    const result = pruneResolvedRestartCounts(prs, { "1:lint": 9 })

    expect(result).toEqual({})
  })

  it("drops an entry once its check resolves to FAILED", () => {
    const prs = [pr({ checks: [normalizedCheck({ name: "lint", effectiveState: "FAILED" })] })]

    const result = pruneResolvedRestartCounts(prs, { "1:lint": 9 })

    expect(result).toEqual({})
  })

  it("keeps an entry while its check is still RUNNING (the in-flight replacement run)", () => {
    const prs = [
      pr({
        checks: [normalizedCheck({ name: "lint", effectiveState: "RUNNING", checkRunId: null })],
      }),
    ]

    const result = pruneResolvedRestartCounts(prs, { "1:lint": 9 })

    expect(result).toEqual({ "1:lint": 9 })
  })

  it("keeps an entry while its check is still CANCELLED (decideCancelled needs it to detect a genuine second failure)", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({
            name: "lint",
            effectiveState: "CANCELLED",
            checkRunId: 15,
            workflowRunId: 901,
          }),
        ],
      }),
    ]

    const result = pruneResolvedRestartCounts(prs, { "1:lint": 9 })

    expect(result).toEqual({ "1:lint": 9 })
  })

  it("leaves unrelated entries (other PRs/checks not in this snapshot) untouched", () => {
    const prs = [
      pr({
        checks: [normalizedCheck({ name: "lint", effectiveState: "RUNNING", checkRunId: null })],
      }),
    ]

    const result = pruneResolvedRestartCounts(prs, { "2:test": 3 })

    expect(result).toEqual({ "2:test": 3 })
  })

  it("lets a later, unrelated cancellation restart fresh once the caller prunes the resolved entry in between (nextAction.ts's actual per-round flow)", () => {
    // Round 1: "lint" cancels (check-run 9), gets restarted, and later succeeds — nextAction.ts
    // prunes the now-resolved entry before persisting state, per this function's contract.
    const resolvedRound = pruneResolvedRestartCounts(
      [pr({ checks: [normalizedCheck({ name: "lint", effectiveState: "SUCCESS" })] })],
      { "1:lint": 9 },
    )

    // Round 2, weeks later: "lint" cancels again for an unrelated reason (check-run 50). Without
    // the prune above, this would be misread as "cancelled again" (see decideCancelled) and wrongly
    // escalate to HUMAN_REQUIRED instead of restarting.
    const result = evaluateNextAction({
      requiredChecks: ["lint"],
      consecutiveQuietRounds: 0,
      quietExit: 3,
      topPrNumber: 1,
      restartCounts: resolvedRound,
      dismissedCiFailures: {},
      prs: [
        pr({
          checks: [
            normalizedCheck({
              name: "lint",
              effectiveState: "CANCELLED",
              checkRunId: 50,
              workflowRunId: 950,
            }),
          ],
        }),
      ],
    })

    assertDecisionKind(result, "RESTART_CANCELLED")
    expect(result.signals.map((signal) => signal.checkRunId)).toEqual([50])
  })
})

describe("#evaluateNextAction", () => {
  const baseInput = {
    requiredChecks: ["test"],
    consecutiveQuietRounds: 0,
    quietExit: 3,
    restartCounts: {},
    dismissedCiFailures: {},
    topPrNumber: 1,
  }

  it("returns STACK_LANDED when every PR is merged or closed", () => {
    const result = evaluateNextAction({
      ...baseInput,
      prs: [pr({ state: "MERGED" }), pr({ prNumber: 2, state: "CLOSED" })],
    })

    expect(result).toEqual({ kind: "STACK_LANDED" })
  })

  it("returns SYNC_TRUNK naming the DIRTY PR", () => {
    const result = evaluateNextAction({ ...baseInput, prs: [pr({ mergeStateStatus: "DIRTY" })] })

    expect(result).toEqual({ kind: "SYNC_TRUNK", prNumber: 1 })
  })

  it("triages review feedback while required checks are still running, excluding CI failures", () => {
    const prs = [
      pr({
        reviewThreads: [reviewThread({})],
        checks: [normalizedCheck({ effectiveState: "RUNNING", checkRunId: null })],
      }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs })

    assertDecisionKind(result, "TRIAGE")
    expect(result.signals.map((signal) => signal.type)).toEqual(["review_thread"])
  })

  it("includes terminal CI failures alongside review signals once required checks settle", () => {
    const prs = [
      pr({
        reviewThreads: [reviewThread({})],
        checks: [normalizedCheck({ effectiveState: "FAILED", checkRunId: 9 })],
      }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs })

    assertDecisionKind(result, "TRIAGE")
    expect(new Set(result.signals.map((signal) => signal.type))).toEqual(
      new Set(["review_thread", "ci_failure"]),
    )
  })

  it("polls without incrementing the quiet counter while required checks are still running", () => {
    const prs = [pr({ checks: [normalizedCheck({ effectiveState: "RUNNING", checkRunId: null })] })]

    const result = evaluateNextAction({ ...baseInput, prs })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("triages a terminal CI failure when there are no review signals", () => {
    const prs = [pr({ checks: [normalizedCheck({ effectiveState: "FAILED", checkRunId: 9 })] })]

    const result = evaluateNextAction({ ...baseInput, prs })

    assertDecisionKind(result, "TRIAGE")
    expect(result.signals.map((signal) => signal.type)).toEqual(["ci_failure"])
  })

  it("banks a quiet round instead of re-triaging a CI failure already dismissed as UNHANDLEABLE", () => {
    const prs = [
      pr({ checks: [normalizedCheck({ name: "test", effectiveState: "FAILED", checkRunId: 9 })] }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs, dismissedCiFailures: { "1:test": 9 } })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: true })
  })

  it("re-triages a dismissed check name once a new push produces a different checkRunId", () => {
    const prs = [
      pr({ checks: [normalizedCheck({ name: "test", effectiveState: "FAILED", checkRunId: 10 })] }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs, dismissedCiFailures: { "1:test": 9 } })

    assertDecisionKind(result, "TRIAGE")
    expect(result.signals).toEqual([expect.objectContaining({ checkRunId: 10 })])
  })

  it("returns HUMAN_REQUIRED naming each dismissed failure once the rest of the stack stays quiet", () => {
    const prs = [
      pr({
        prNumber: 1234,
        checks: [normalizedCheck({ name: "e2e", effectiveState: "FAILED", checkRunId: 7 })],
      }),
      pr({
        prNumber: 1235,
        checks: [normalizedCheck({ name: "e2e", effectiveState: "FAILED", checkRunId: 8 })],
      }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      requiredChecks: ["e2e"],
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
      dismissedCiFailures: { "1234:e2e": 7, "1235:e2e": 8 },
    })

    expect(result).toEqual({
      kind: "HUMAN_REQUIRED",
      prNumber: 1234,
      reason:
        "Required checks dismissed as UNHANDLEABLE are still red: e2e on #1234, #1235. Nothing else is failing or running, so this needs a human.",
    })
  })

  it("keeps polling without a quiet round while a cancelled check waits beside a dismissed failure", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({ name: "test", effectiveState: "FAILED", checkRunId: 9 }),
          normalizedCheck({
            name: "lint",
            effectiveState: "CANCELLED",
            checkRunId: 4,
            workflowRunId: 40,
          }),
        ],
      }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      requiredChecks: ["test", "lint"],
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
      restartCounts: { "1:lint": 4 },
      dismissedCiFailures: { "1:test": 9 },
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("keeps polling a dismissed failure while another PR's mergeability is still UNKNOWN", () => {
    const prs = [
      pr({ checks: [normalizedCheck({ effectiveState: "FAILED", checkRunId: 9 })] }),
      pr({ prNumber: 2, mergeStateStatus: "UNKNOWN" }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
      dismissedCiFailures: { "1:test": 9 },
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("triages a failure even when a required sibling check never posted a run (ABSENT)", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({ name: "test", effectiveState: "FAILED", checkRunId: 9 }),
          normalizedCheck({ name: "lint", effectiveState: "ABSENT", checkRunId: null }),
        ],
      }),
    ]

    const result = evaluateNextAction({ ...baseInput, requiredChecks: ["test", "lint"], prs })

    assertDecisionKind(result, "TRIAGE")
    expect(result.signals.map((signal) => signal.type)).toEqual(["ci_failure"])
  })

  it("reaches DONE when a required check is ABSENT (path-filtered, never triggered) with nothing else outstanding", () => {
    // A required check whose workflow never runs for this diff (e.g. paths-ignore) will never
    // post a run — GitHub's own mergeable computation already treats that as clean, so felix must
    // not poll forever waiting for a check that's never coming.
    const prs = [
      pr({
        checks: [
          normalizedCheck({ name: "test", effectiveState: "SUCCESS" }),
          normalizedCheck({ name: "lint", effectiveState: "ABSENT", checkRunId: null }),
        ],
      }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      requiredChecks: ["test", "lint"],
      consecutiveQuietRounds: 2,
      quietExit: 3,
      prs,
    })

    expect(result).toEqual({ kind: "DONE", topPrNumber: 1, ambiguousSignals: [] })
  })

  it("does not declare DONE when every required check reads ABSENT but mergeStateStatus is still UNKNOWN", () => {
    // Right after a push, GitHub often hasn't created check-runs for the new SHA yet, so every
    // required check reads ABSENT exactly like the permanently-absent (path-filtered) case above
    // -- indistinguishable from this snapshot alone. mergeStateStatus is the tell: GitHub itself
    // hasn't finished computing mergeability yet (UNKNOWN), unlike the settled CLEAN case above.
    const prs = [
      pr({
        mergeStateStatus: "UNKNOWN",
        checks: [
          normalizedCheck({ name: "test", effectiveState: "ABSENT", checkRunId: null }),
          normalizedCheck({ name: "lint", effectiveState: "ABSENT", checkRunId: null }),
        ],
      }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      requiredChecks: ["test", "lint"],
      consecutiveQuietRounds: 2,
      quietExit: 3,
      prs,
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("keeps polling when a required check is CANCELLED (settled but no verdict) with nothing else outstanding", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({ name: "test", effectiveState: "SUCCESS" }),
          // Already restarted once this session and still cancelled on the same run — propagation
          // lag, not a fresh cancellation — so `decideCancelled` returns null and this falls
          // through to the CI-only path, which must not count it as passing.
          normalizedCheck({
            name: "lint",
            effectiveState: "CANCELLED",
            checkRunId: 9,
            workflowRunId: 900,
          }),
        ],
      }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      requiredChecks: ["test", "lint"],
      consecutiveQuietRounds: 2,
      quietExit: 3,
      restartCounts: { "1:lint": 9 },
      prs,
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("returns RESTART_CANCELLED for a first-time cancellation with no failure", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({ effectiveState: "CANCELLED", checkRunId: 9, workflowRunId: 900 }),
        ],
      }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs })

    expect(result.kind).toEqual("RESTART_CANCELLED")
  })

  it("triages review feedback before restarting a cancelled check", () => {
    const prs = [
      pr({
        reviewThreads: [reviewThread({})],
        checks: [
          normalizedCheck({ effectiveState: "CANCELLED", checkRunId: 9, workflowRunId: 900 }),
        ],
      }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs })

    assertDecisionKind(result, "TRIAGE")
    expect(result.signals.map((signal) => signal.type)).toEqual(["review_thread"])
  })

  it("returns HUMAN_REQUIRED when the restarted run cancelled again under a new check-run id", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({ effectiveState: "CANCELLED", checkRunId: 20, workflowRunId: 901 }),
        ],
      }),
    ]

    // restartCounts records check-run 10 as the one we already restarted; the current signal is
    // a different, newer run (20) that also came back cancelled -- a genuine second failure.
    const result = evaluateNextAction({ ...baseInput, prs, restartCounts: { "1:test": 10 } })

    expect(result.kind).toEqual("HUMAN_REQUIRED")
  })

  it("does not restart again or give up while GitHub still reports the exact run we just restarted as cancelled", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({ effectiveState: "CANCELLED", checkRunId: 9, workflowRunId: 900 }),
        ],
      }),
    ]

    // restartCounts records the SAME check-run id (9) as the current signal -- GitHub hasn't yet
    // surfaced the new run created by the restart. Not a second failure, and nothing fresh to
    // restart either.
    const result = evaluateNextAction({ ...baseInput, prs, restartCounts: { "1:test": 9 } })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("returns HUMAN_REQUIRED when a cancelled check has no workflow run id to restart", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({ effectiveState: "CANCELLED", checkRunId: 9, workflowRunId: null }),
        ],
      }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs })

    assertDecisionKind(result, "HUMAN_REQUIRED")
    expect(result.reason).toMatch(/couldn't be determined/)
  })

  it("restarts a fresh cancellation even when another check has already cancelled twice", () => {
    const prs = [
      pr({
        checks: [
          normalizedCheck({
            name: "test",
            effectiveState: "CANCELLED",
            checkRunId: 9,
            workflowRunId: 900,
          }),
          normalizedCheck({
            name: "lint",
            effectiveState: "CANCELLED",
            checkRunId: 10,
            workflowRunId: 901,
          }),
        ],
      }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      requiredChecks: ["test", "lint"],
      prs,
      // "lint" was already restarted as check-run 5; the current signal (10) is a different,
      // newer run that also cancelled -- a genuine second failure for lint specifically.
      restartCounts: { "1:lint": 5 },
    })

    assertDecisionKind(result, "RESTART_CANCELLED")
    expect(result.signals.map((signal) => signal.checkName)).toEqual(["test"])
  })

  it("never treats an empty required-check list as vacuously green", () => {
    const prs = [pr({ mergeStateStatus: "UNSTABLE", checks: [] })]

    const result = evaluateNextAction({ ...baseInput, requiredChecks: [], prs })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("falls back to mergeStateStatus CLEAN as green when the required-check list is empty", () => {
    const prs = [pr({ mergeStateStatus: "CLEAN", checks: [] })]

    const result = evaluateNextAction({ ...baseInput, requiredChecks: [], quietExit: 1, prs })

    expect(result).toEqual({ kind: "DONE", topPrNumber: 1, ambiguousSignals: [] })
  })

  it.each(["BEHIND", "UNKNOWN"])(
    "keeps polling on a %s mergeStateStatus with an empty required-check list",
    (mergeStateStatus) => {
      const prs = [pr({ mergeStateStatus, checks: [] })]
      const result = evaluateNextAction({ ...baseInput, requiredChecks: [], prs })
      expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
    },
  )

  it.each([null, "APPROVED"])(
    "polls without incrementing the quiet counter when a BLOCKED PR's reviewDecision is %s",
    (reviewDecision) => {
      const prs = [pr({ mergeStateStatus: "BLOCKED", reviewDecision })]

      const result = evaluateNextAction({ ...baseInput, prs })

      expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
    },
  )

  it("returns HUMAN_REQUIRED once a PR blocked awaiting approval has stayed green for QUIET_EXIT rounds", () => {
    const prs = [pr({ mergeStateStatus: "BLOCKED", reviewDecision: "REVIEW_REQUIRED" })]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
    })

    assertDecisionKind(result, "HUMAN_REQUIRED")
    expect(result.reason).toMatch(/blocked awaiting approval/)
  })

  it("returns HUMAN_REQUIRED when a settled green PR still has changes requested and no thread to act on", () => {
    const prs = [pr({ mergeStateStatus: "BLOCKED", reviewDecision: "CHANGES_REQUESTED" })]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
    })

    assertDecisionKind(result, "HUMAN_REQUIRED")
    expect(result.reason).toMatch(/waiting on a re-review/)
  })

  it("escalates a PR blocked awaiting approval whose required checks never ran for this diff", () => {
    const prs = [
      pr({
        mergeStateStatus: "BLOCKED",
        reviewDecision: "REVIEW_REQUIRED",
        checks: [normalizedCheck({ effectiveState: "ABSENT", checkRunId: null })],
      }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
    })

    assertDecisionKind(result, "HUMAN_REQUIRED")
    expect(result.reason).toMatch(/blocked awaiting approval/)
  })

  it("banks a quiet round instead of escalating a PR blocked awaiting approval below QUIET_EXIT", () => {
    const prs = [pr({ mergeStateStatus: "BLOCKED", reviewDecision: "REVIEW_REQUIRED" })]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 0,
      quietExit: 3,
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: true })
  })

  it("keeps polling when another PR's mergeability is still UNKNOWN", () => {
    const prs = [
      pr({ mergeStateStatus: "BLOCKED", reviewDecision: "REVIEW_REQUIRED" }),
      pr({ prNumber: 2, mergeStateStatus: "UNKNOWN", reviewDecision: "REVIEW_REQUIRED" }),
    ]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("keeps polling a PR blocked on something other than review even at QUIET_EXIT", () => {
    const prs = [pr({ mergeStateStatus: "BLOCKED", reviewDecision: "APPROVED" })]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: false })
  })

  it("triages an actionable review thread instead of escalating a PR blocked awaiting approval", () => {
    const prs = [
      pr({
        mergeStateStatus: "BLOCKED",
        reviewDecision: "CHANGES_REQUESTED",
        reviewThreads: [reviewThread({})],
      }),
    ]

    const result = evaluateNextAction({ ...baseInput, prs })

    assertDecisionKind(result, "TRIAGE")
    expect(result.signals.map((signal) => signal.type)).toEqual(["review_thread"])
  })

  it("increments the quiet counter on a clean round below QUIET_EXIT", () => {
    const prs = [pr({})]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 0,
      quietExit: 3,
    })

    expect(result).toEqual({ kind: "POLL", incrementQuietRound: true })
  })

  it("returns DONE once the quiet counter reaches QUIET_EXIT on a fresh clean round", () => {
    const prs = [pr({})]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
      topPrNumber: 42,
    })

    expect(result).toEqual({ kind: "DONE", topPrNumber: 42, ambiguousSignals: [] })
  })

  it("a fresh actionable signal after quiet rounds have accumulated preempts DONE", () => {
    const prs = [pr({ reviewThreads: [reviewThread({})] })]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
    })

    expect(result.kind).toEqual("TRIAGE")
  })

  it("DONE still reports a pending ambiguous decision so the exit comment isn't an unqualified success", () => {
    const ambiguousThread = reviewThread({
      id: "PRT_ambiguous",
      comments: [
        {
          author: "felix",
          authorType: "User",
          body: "[felix] Decision needed — pick one",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    })
    const prs = [pr({ reviewThreads: [ambiguousThread] })]

    const result = evaluateNextAction({
      ...baseInput,
      prs,
      consecutiveQuietRounds: 2,
      quietExit: 3,
      topPrNumber: 42,
    })

    assertDecisionKind(result, "DONE")
    expect(result.ambiguousSignals.map((signal) => signal.id)).toEqual(["PRT_ambiguous"])
    expect(result.ambiguousSignals[0]?.path).toEqual("src/foo.ts")
  })
})

describe("#isTransientGhFailure", () => {
  it.each([
    {
      label: "a 502 from the API",
      failureText:
        'Command failed: gh pr view 123\ngh: HTTP 502: Bad Gateway (https://api.github.com/graphql)\n{"message":"Server Error"}',
    },
    {
      label: "a dropped connection",
      failureText:
        "Command failed: gh api /repos/o/r\nrequest failed: Get https://api.github.com: read tcp: connection reset by peer",
    },
    {
      label: "a DNS failure",
      failureText:
        "Command failed: gh api graphql\nerror connecting to api.github.com: dial tcp: lookup api.github.com: EAI_AGAIN",
    },
    {
      label: "a secondary rate limit",
      failureText:
        "Command failed: gh pr view 123\nHTTP 403: You have exceeded a secondary rate limit. Please wait a few minutes before you try again.",
    },
  ])("retries $label", ({ failureText }) => {
    expect(isTransientGhFailure(failureText)).toEqual(true)
  })

  it.each([
    {
      label: "a deleted or mistyped PR number",
      failureText:
        "Command failed: gh pr view 123\ngh: Could not resolve to a PullRequest with the number of 123. (HTTP 404)",
    },
    {
      label: "missing authentication",
      failureText:
        "Command failed: gh api /repos/o/r\ngh: To get started with GitHub CLI, please run: gh auth login (HTTP 401)",
    },
    {
      label: "insufficient permissions",
      failureText:
        "Command failed: gh api /repos/o/r\ngh: Resource not accessible by integration (HTTP 403)",
    },
    {
      label: "the primary hourly rate limit",
      failureText:
        "Command failed: gh pr view 123\ngh: API rate limit exceeded for user ID 1. (HTTP 403)",
    },
    {
      label: "a malformed GraphQL query",
      failureText:
        "Command failed: gh api graphql\ngh: Field 'reviewDecison' doesn't exist on type 'PullRequest' (HTTP 422)",
    },
  ])("reports $label without retrying", ({ failureText }) => {
    expect(isTransientGhFailure(failureText)).toEqual(false)
  })
})

describe("#pollDelayMs", () => {
  const fullBucket = { remaining: 5000, resetAtMs: 3_600_000 }

  it("keeps POLL_INTERVAL while the rate limit has room for a small stack", () => {
    const delay = pollDelayMs({
      pollIntervalMs: 60_000,
      nowMs: 0,
      prCount: 3,
      core: fullBucket,
      graphql: fullBucket,
    })

    expect(delay).toEqual(60_000)
  })

  it("spreads the calls left over the rest of the hour on a big stack", () => {
    const delay = pollDelayMs({
      pollIntervalMs: 60_000,
      nowMs: 0,
      prCount: 40,
      core: fullBucket,
      graphql: fullBucket,
    })

    expect(delay).toEqual(97_600)
  })

  it("waits for the reset once a round would dip into the reserve", () => {
    const delay = pollDelayMs({
      pollIntervalMs: 60_000,
      nowMs: 0,
      prCount: 40,
      core: { remaining: 600, resetAtMs: 1_200_000 },
      graphql: fullBucket,
    })

    expect(delay).toEqual(1_200_000)
  })
})

describe("#planPollWait", () => {
  it("sleeps until the next round when it comes before the call budget and the deadline", () => {
    const wait = planPollWait({
      nowMs: 0,
      nextRoundAtMs: 60_000,
      callEndMs: 600_000,
      deadlineMs: 1_800_000,
    })

    expect(wait).toEqual({ sleepMs: 60_000, next: "ROUND" })
  })

  it("returns KEEP_POLLING when the next round falls after the call budget", () => {
    const wait = planPollWait({
      nowMs: 0,
      nextRoundAtMs: 650_000,
      callEndMs: 600_000,
      deadlineMs: 1_800_000,
    })

    expect(wait).toEqual({ sleepMs: 600_000, next: "KEEP_POLLING" })
  })

  it("times out at the deadline when it comes before the next round", () => {
    const wait = planPollWait({
      nowMs: 0,
      nextRoundAtMs: 120_000,
      callEndMs: 600_000,
      deadlineMs: 90_000,
    })

    expect(wait).toEqual({ sleepMs: 90_000, next: "TIMEOUT" })
  })
})

describe("on-disk paths", () => {
  it.each([
    ["STATE_FILE", STATE_FILE],
    ["PAYLOAD_FILE", PAYLOAD_FILE],
  ])("keeps %s out of .repo/local, which every worktree on the machine shares", (_name, file) => {
    expect(file.startsWith(".repo/local")).toEqual(false)
  })
})
