#!/usr/bin/env node
// Felix's read-only gather/filter/gate loop, extracted from the felix-loop skill's trunk-drift
// check, signal gathering, filtering, and polling so the parent LLM doesn't have to re-run them
// by hand every round. This is the I/O shell around the pure decisions in nextActionCore.ts: it
// gathers GitHub/Graphite state, normalizes it, calls the pure core, and sleeps through
// non-actionable rounds internally.
//
// Usage:
//   node nextAction.ts <PR_NUMBER> [QUIET_EXIT] [POLL_INTERVAL] [POLL_TIMEOUT]
//     [--once] [--continue]
//
// Prints exactly one JSON line to stdout when the LLM needs to act (or the loop ends); all
// progress goes to stderr. `--once` gathers and evaluates a single round without sleeping or
// looping — useful for smoke-testing against a real PR without blocking.
//
// A call returns `{"kind":"KEEP_POLLING"}` after 10 minutes of polling. `--continue` resumes with
// the POLL_TIMEOUT deadline and next round time the last call saved.
//
// This script never mutates GitHub or git: no comments, no reruns, no branch changes. Fixes,
// commits, `gt restack`/`gt submit`, thread replies, and PR comments stay with the LLM, driven
// by the felix-loop skill as before.

import { execFile, execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import { promisify } from "node:util"

import {
  type AmbiguousSignal,
  type CiCancelledSignal,
  type DismissedCiFailures,
  evaluateNextAction,
  isTransientGhFailure,
  type NextActionDecision,
  normalizeCheckRuns,
  type NormalizedCheck,
  PAYLOAD_FILE,
  planPollWait,
  pollDelayMs,
  type PrSnapshot,
  pruneResolvedRestartCounts,
  type RateLimitBucket,
  type RawCheckRun,
  type RawIssueComment,
  type RawReviewComment,
  type RawReviewThread,
  type RawWorkflowRun,
  type RestartCounts,
  type Signal,
  STATE_FILE,
  treatLiveTwinsAsRunning,
} from "./nextActionCore.ts"

type PayloadSignal = Signal | CiCancelledSignal

// owner/repo travel together everywhere below — bundled to avoid threading two primitives
// through every fetch function separately.
type RepoRef = { owner: string; repo: string }

const execFileAsync = promisify(execFile)

// A plugin install puts this script in Claude Code's plugin cache, so the state files go in the
// repo felix was started from.
const findRepoRoot = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    console.error("nextAction.ts must run inside a git repo, where it keeps its state files")
    process.exit(2)
  }
}

const REPO_ROOT = findRepoRoot()
const STATE_PATH = path.join(REPO_ROOT, STATE_FILE)
const PAYLOAD_PATH = path.join(REPO_ROOT, PAYLOAD_FILE)
const BOT_BRANCH_PREFIXES = ["ci/", "renovate/", "dependabot/", "graphite-readonly/"]
const EPOCH = "1970-01-01T00:00:00Z"

// --- CLI args ----------------------------------------------------------------

type Args = {
  prNumber: number
  quietExit: number
  pollIntervalMs: number
  pollTimeoutMs: number
  once: boolean
  resume: boolean
}

// `Number(someGarbageString)` is NaN, and `setTimeout(resolve, NaN)` resolves on the next tick
// in Node rather than throwing — a typo'd QUIET_EXIT/POLL_INTERVAL/POLL_TIMEOUT would silently
// busy-loop (or declare a false DONE) instead of failing loudly.
const parsePositiveInt = (value: string | undefined, fallback: number, label: string): number => {
  if (value === undefined) return fallback
  if (!/^\d+$/.test(value)) {
    console.error(`${label} must be numeric, got: ${value}`)
    process.exit(2)
  }
  return Number(value)
}

const parseArgs = (argv: string[]): Args => {
  const once = argv.includes("--once")
  const resume = argv.includes("--continue")
  const positional = argv.filter((arg) => arg !== "--once" && arg !== "--continue")
  const [prArg, quietExitArg, intervalArg, timeoutArg] = positional

  if (prArg === undefined || !/^\d+$/.test(prArg)) {
    console.error(`PR_NUMBER must be numeric, got: ${prArg ?? "(none)"}`)
    process.exit(2)
  }

  return {
    prNumber: Number(prArg),
    quietExit: parsePositiveInt(quietExitArg, 3, "QUIET_EXIT"),
    pollIntervalMs: parsePositiveInt(intervalArg, 60, "POLL_INTERVAL") * 1000,
    pollTimeoutMs: parsePositiveInt(timeoutArg, 1800, "POLL_TIMEOUT") * 1000,
    once,
    resume,
  }
}

// --- exec wrappers -------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Without this, a single 502 from any one of the ~5 gh calls per PR per round aborts the whole
// session and discards however long the loop has already been polling. Delays are long enough to
// outlast a GitHub blip (23s total) and short enough to stay well inside one POLL_INTERVAL.
const GH_RETRY_DELAYS_MS: readonly number[] = [2_000, 6_000, 15_000]
const GH_MAX_ATTEMPTS = GH_RETRY_DELAYS_MS.length + 1

// `gh` puts the HTTP status and GitHub's message on stderr and only a generic "Command failed" in
// the Error's message, so both halves are needed to classify the failure.
const ghFailureText = (thrown: unknown): string => {
  const error = thrown as { message?: string; stderr?: string }
  return `${error.message ?? String(thrown)}\n${error.stderr ?? ""}`
}

// GitHub's 5xx responses can carry a full HTML body, and this goes to the same stderr stream the
// heartbeat lines use — one readable line is all the retry needs to announce.
const GH_FAILURE_SUMMARY_LENGTH = 300

const summarizeGhFailure = (failureText: string): string =>
  failureText.trim().replace(/\s+/g, " ").slice(0, GH_FAILURE_SUMMARY_LENGTH)

const runGh = async (args: string[]): Promise<string> => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const { stdout } = await execFileAsync("gh", args, { maxBuffer: 32 * 1024 * 1024 })
      return stdout
    } catch (thrown) {
      const failureText = ghFailureText(thrown)
      const delayMs = GH_RETRY_DELAYS_MS[attempt - 1]
      if (delayMs === undefined || !isTransientGhFailure(failureText)) throw thrown
      console.error(
        `nextAction: transient gh failure (attempt ${attempt}/${GH_MAX_ATTEMPTS}), retrying in ${delayMs / 1000}s: ${summarizeGhFailure(failureText)}`,
      )
      await sleep(delayMs)
    }
  }
}

// `gt-stack` resolves from PATH, where Claude Code puts the eng plugin's bin/ and a repo can put
// its own. ENOENT means neither is on this process's PATH.
const runGtStack = async (
  args: string[],
): Promise<{ stdout: string; exitCode: number; missing: boolean }> => {
  try {
    const { stdout } = await execFileAsync("gt-stack", args, { maxBuffer: 32 * 1024 * 1024 })
    return { stdout, exitCode: 0, missing: false }
  } catch (thrown) {
    const error = thrown as { stdout?: string; code?: number | string }
    if (error.code === "ENOENT") return { stdout: "", exitCode: 1, missing: true }
    return {
      stdout: error.stdout ?? "",
      exitCode: typeof error.code === "number" ? error.code : 1,
      missing: false,
    }
  }
}

// --- state file ----------------------------------------------------------------

type FelixPrRecord = {
  pr_number: number
  branch: string
  base_branch: string
  last_check_timestamp?: string
  [key: string]: unknown
}

type FelixStateFile = {
  stack_signature?: string
  prs?: FelixPrRecord[]
  required_checks?: string[]
  consecutive_quiet_rounds?: number
  round?: number
  next_action_restart_counts?: RestartCounts
  next_action_dismissed_ci_failures?: DismissedCiFailures
  next_action_poll_deadline_ms?: number
  next_action_next_round_at_ms?: number
  [key: string]: unknown
}

// Order-independent: hashes the SORTED set of PR numbers, not the ordered branch list. A
// reparent (a branch's position in the stack changing) shouldn't discard `pending_replies` or
// `fix_rounds` — only actual membership changes (a PR added, removed, or merged) should, and
// this also survives `gt-stack list` returning the same set in a different order between
// calls, which the previous ordered-branch-string hash did not.
const stackSignatureOf = (prNumbers: number[]): string =>
  createHash("sha256")
    .update(
      prNumbers
        .slice()
        .sort((a, b) => a - b)
        .join("|"),
    )
    .digest("hex")

const loadState = (): FelixStateFile | null => {
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8")) as FelixStateFile
  } catch {
    return null
  }
}

const saveState = (state: FelixStateFile): void => {
  const tmpPath = `${STATE_PATH}.tmp`
  writeFileSync(tmpPath, JSON.stringify(state, null, 2))
  renameSync(tmpPath, STATE_PATH)
}

// Only the fields this script owns are read/written here (stack_signature, required_checks,
// consecutive_quiet_rounds, round, next_action_restart_counts, next_action_dismissed_ci_failures,
// and each PR's branch/base_branch metadata). `pending_replies` (per PR), `ambiguous_signals`,
// `fix_rounds`, and `last_check_timestamp` are the felix-loop skill's — this script never writes
// them (see nextActionCore.ts's `filterIssueComments` and `disposeReviewThread` for why).
// `next_action_dismissed_ci_failures` is recorded only by the parent too (see `filterCiChecks`),
// but this function still resets it to empty on a stack-shape change below, same as
// next_action_restart_counts — infra bookkeeping against the old shape, not recording a new
// dismissal on the parent's behalf.
//
// A same-membership call takes the fast path below and preserves everything untouched. On a
// signature mismatch — including the one-time case of an existing state file written under a
// previous version of this signature algorithm — this PRUNES rather than wipes: PR records for
// numbers no longer in the stack are dropped (their pending_replies would reference branches
// that may not even exist anymore), but records for PRs that are STILL present keep their
// pending_replies/last_check_timestamp, and top-level parent-owned fields like fix_rounds are
// left alone entirely. Only the round-scoped counters below are reset, since a "quiet" streak
// measured against the old shape isn't meaningful against the new one.
const resolveState = (
  existing: FelixStateFile | null,
  prNumbers: number[],
  requiredChecks: string[],
): FelixStateFile => {
  const signature = stackSignatureOf(prNumbers)
  if (existing !== null && existing.stack_signature === signature) {
    return { ...existing, required_checks: requiredChecks }
  }

  if (existing !== null) {
    console.error("nextAction: stack shape changed — pruning PRs no longer in the stack")
  }
  const survivingPrs = (existing?.prs ?? []).filter((record) =>
    prNumbers.includes(record.pr_number),
  )

  return {
    ...existing,
    stack_signature: signature,
    prs: survivingPrs,
    required_checks: requiredChecks,
    consecutive_quiet_rounds: 0,
    round: 0,
    next_action_restart_counts: {},
    next_action_dismissed_ci_failures: {},
  }
}

const prRecordFor = (state: FelixStateFile, prNumber: number): FelixPrRecord | undefined =>
  (state.prs ?? []).find((record) => record.pr_number === prNumber)

const lastCheckTimestampFor = (state: FelixStateFile, prNumber: number): string =>
  prRecordFor(state, prNumber)?.last_check_timestamp ?? EPOCH

type PrRecordUpdate = {
  prNumber: number
  branch: string
  baseBranch: string
  // Omit to leave whatever's already on the record untouched — see `syncPrRecords` below,
  // which never sets this because `last_check_timestamp` is parent-owned.
  lastCheckTimestamp?: string
}

const withUpdatedPrRecord = (state: FelixStateFile, update: PrRecordUpdate): FelixStateFile => {
  const existingPrs = state.prs ?? []
  const existingIndex = existingPrs.findIndex((record) => record.pr_number === update.prNumber)
  const existingRecord = existingIndex === -1 ? undefined : existingPrs[existingIndex]
  const updatedRecord: FelixPrRecord = {
    ...existingRecord,
    pr_number: update.prNumber,
    branch: update.branch,
    base_branch: update.baseBranch,
    last_check_timestamp: update.lastCheckTimestamp ?? existingRecord?.last_check_timestamp,
  }
  const prs =
    existingIndex === -1
      ? [...existingPrs, updatedRecord]
      : existingPrs.map((record, index) => (index === existingIndex ? updatedRecord : record))
  return { ...state, prs }
}

// --- Graphite stack discovery ----------------------------------------------------

type StackEntry = { branch: string; prNumber: number; baseRefName: string; headRefName: string }

type HumanRequiredDecision = Extract<NextActionDecision, { kind: "HUMAN_REQUIRED" }>
type StackLandedDecision = Extract<NextActionDecision, { kind: "STACK_LANDED" }>

const fetchStackEntries = async (
  prNumber: number,
): Promise<StackEntry[] | HumanRequiredDecision | StackLandedDecision> => {
  const prView = JSON.parse(
    await runGh(["pr", "view", String(prNumber), "--json", "headRefName,state"]),
  ) as { headRefName: string; state: string }

  // Checked before ever asking Graphite: once this PR merges or closes, its branch is commonly
  // deleted, and a deleted branch makes `gt-stack list` fail in ways indistinguishable from
  // a genuinely untracked one (exit 2) — misreporting a landed stack as HUMAN_REQUIRED ("run
  // `gt track`") instead of stopping silently. Mirrors the deleted poller's approach of checking
  // GitHub state directly. Known gap: this only catches the anchor PR itself landing — a
  // multi-PR stack whose other members are still open while this specific PR number merged needs
  // a still-open PR passed as the anchor instead; see the felix-loop skill's Exit conditions.
  if (prView.state === "MERGED" || prView.state === "CLOSED") {
    return { kind: "STACK_LANDED" }
  }

  const { stdout, exitCode, missing } = await runGtStack([
    "list",
    "--from",
    prView.headRefName,
    "--json",
  ])
  if (missing) {
    return { kind: "HUMAN_REQUIRED", prNumber, reason: "`gt-stack` isn't on PATH." }
  }
  // Exit codes per `gt-stack list --help`: 0 = tracked and resolved, 1 = tracked but forked
  // (multiple children — stdout is a disambiguation message, NOT JSON), 2 = untracked, 3 =
  // bad/missing Graphite config. Only 0 has JSON on stdout to parse below.
  if (exitCode === 1) {
    return {
      kind: "HUMAN_REQUIRED",
      prNumber,
      reason: `Branch '${prView.headRefName}' has a fork upstack (multiple children) — run \`gt-stack list\` locally and pick a branch to disambiguate.`,
    }
  }
  if (exitCode === 2) {
    return {
      kind: "HUMAN_REQUIRED",
      prNumber,
      reason: `Branch '${prView.headRefName}' isn't tracked by Graphite — run \`gt track\`.`,
    }
  }
  if (exitCode === 3) {
    return {
      kind: "HUMAN_REQUIRED",
      prNumber,
      reason: "Graphite repo config not found or invalid.",
    }
  }
  if (exitCode !== 0) {
    return {
      kind: "HUMAN_REQUIRED",
      prNumber,
      reason: `\`gt-stack list\` failed with exit code ${exitCode}.`,
    }
  }

  type RawEntry = {
    branch: string
    prNumber: number | null
    baseRefName: string | null
    headRefName: string | null
  }
  const entries = JSON.parse(stdout) as RawEntry[]

  return entries
    .filter((entry) => entry.prNumber !== null)
    .filter((entry) => !BOT_BRANCH_PREFIXES.some((prefix) => entry.branch.startsWith(prefix)))
    .map((entry) => ({
      branch: entry.branch,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      prNumber: entry.prNumber as number,
      baseRefName: entry.baseRefName ?? "main",
      headRefName: entry.headRefName ?? entry.branch,
    }))
}

// --- required-check detection ------------------------------------------------------

const fetchRequiredChecks = async (repo: RepoRef, baseBranch: string): Promise<string[]> => {
  type Ruleset = {
    type: string
    parameters?: { required_status_checks?: Array<{ context: string }> }
  }
  try {
    const rulesets = JSON.parse(
      await runGh(["api", `/repos/${repo.owner}/${repo.repo}/rules/branches/${baseBranch}`]),
    ) as Ruleset[]
    const fromRulesets = rulesets
      .filter((rule) => rule.type === "required_status_checks")
      .flatMap(
        (rule) => rule.parameters?.required_status_checks?.map((check) => check.context) ?? [],
      )
    if (fromRulesets.length > 0) return fromRulesets
  } catch {
    // fall through to classic branch protection
  }

  type ClassicProtection = { checks?: Array<{ context: string }>; contexts?: string[] }
  try {
    const classic = JSON.parse(
      await runGh([
        "api",
        `/repos/${repo.owner}/${repo.repo}/branches/${baseBranch}/protection/required_status_checks`,
      ]),
    ) as ClassicProtection
    return classic.checks?.map((check) => check.context) ?? classic.contexts ?? []
  } catch {
    return []
  }
}

// --- per-PR gathering ---------------------------------------------------------

type PrViewResult = {
  state: "OPEN" | "CLOSED" | "MERGED"
  mergeStateStatus: string
  // `gh` marshals this field as a plain string, so GraphQL's null (base branch requires no review)
  // arrives as "" rather than JSON null — normalized at the PrSnapshot boundary in `gatherOnePr`.
  reviewDecision: string
  headRefOid: string
  title: string
  body: string
}

const fetchPrView = async (prNumber: number): Promise<PrViewResult> =>
  JSON.parse(
    await runGh([
      "pr",
      "view",
      String(prNumber),
      "--json",
      "state,mergeStateStatus,reviewDecision,headRefOid,title,body",
    ]),
  ) as PrViewResult

type GraphQlThreadNode = {
  id: string
  isResolved: boolean
  isOutdated: boolean
  path: string
  startLine: number | null
  line: number | null
  originalStartLine: number | null
  originalLine: number | null
  diffSide: "LEFT" | "RIGHT"
  comments: { nodes: Array<{ author: { login: string } | null; body: string; createdAt: string }> }
}

const REVIEW_THREADS_QUERY = `
  query($owner:String!, $repo:String!, $pr:Int!, $cursor:String) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100, after:$cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id isResolved isOutdated path startLine line originalStartLine originalLine diffSide
            # disposeReviewThread and filterReviewThreads both read the NEWEST comment, and
            # GitHub returns this connection oldest-first — "first:N" would silently return the
            # OLDEST N and could miss the newest reply entirely on a long thread. "last:100"
            # always includes the true newest comment no matter how long the thread is; neither
            # consumer needs the oldest comment anymore, so there's no remaining correctness gap.
            comments(last:100) { nodes { author { login } body createdAt } }
          }
        }
      }
    }
  }
`

// LEFT-side threads point at the base file's line space, which can't be coverage-checked
// against the diff, and a null `line` means the anchor didn't survive at all — both need
// content-based verification by whoever triages them, same as a GraphQL-reported outdated
// thread. See github-commands.md §"Unresolved Review Threads".
const isEffectivelyOutdated = (node: GraphQlThreadNode): boolean =>
  node.isOutdated || node.diffSide === "LEFT" || node.line === null

const toRawReviewThread = (node: GraphQlThreadNode): RawReviewThread => ({
  id: node.id,
  isResolved: node.isResolved,
  isOutdated: isEffectivelyOutdated(node),
  path: node.path,
  startLine: node.startLine,
  line: node.line,
  originalStartLine: node.originalStartLine,
  originalLine: node.originalLine,
  diffSide: node.diffSide,
  comments: node.comments.nodes.map(
    (comment): RawReviewComment => ({
      author: comment.author?.login ?? "unknown",
      authorType: "",
      body: comment.body,
      createdAt: comment.createdAt,
    }),
  ),
})

type ReviewThreadsResponse = {
  data: {
    repository: {
      pullRequest: {
        reviewThreads: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null }
          nodes: GraphQlThreadNode[]
        }
      }
    }
  }
}

const fetchReviewThreads = async (repo: RepoRef, prNumber: number): Promise<RawReviewThread[]> => {
  const threads: RawReviewThread[] = []
  let cursor: string | null = null

  while (true) {
    const args = [
      "api",
      "graphql",
      "-f",
      `query=${REVIEW_THREADS_QUERY}`,
      "-F",
      `owner=${repo.owner}`,
      "-F",
      `repo=${repo.repo}`,
      "-F",
      `pr=${prNumber}`,
      "-F",
      // `-F` (capital) sniffs the literal string "null" into a real JSON null for gh's request
      // body; an empty string is NOT null and GitHub's GraphQL API rejects it as an invalid
      // Relay cursor for `after`. See github-commands.md §"Unresolved Review Threads", which
      // documents `-F cursor=null` for exactly this first-page case.
      `cursor=${cursor ?? "null"}`,
    ]
    const response = JSON.parse(await runGh(args)) as ReviewThreadsResponse
    const { nodes, pageInfo } = response.data.repository.pullRequest.reviewThreads
    threads.push(...nodes.map(toRawReviewThread))
    if (!pageInfo.hasNextPage) break
    cursor = pageInfo.endCursor
  }

  return threads.filter((thread) => !thread.isResolved)
}

const fetchIssueComments = async (
  repo: RepoRef,
  prNumber: number,
  since: string,
): Promise<RawIssueComment[]> => {
  type RawComment = {
    id: number
    user: { login: string; type: string } | null
    body: string
    created_at: string
  }
  const comments: RawIssueComment[] = []
  let page = 1

  while (true) {
    const raw = JSON.parse(
      await runGh([
        "api",
        `/repos/${repo.owner}/${repo.repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
      ]),
    ) as RawComment[]
    comments.push(
      ...raw
        .filter((comment) => comment.created_at > since)
        .map((comment) => ({
          id: String(comment.id),
          author: comment.user?.login ?? "unknown",
          authorType: comment.user?.type ?? "User",
          body: comment.body,
          createdAt: comment.created_at,
        })),
    )
    if (raw.length < 100) break
    page += 1
  }

  return comments
}

const fetchCheckRuns = async (repo: RepoRef, headSha: string): Promise<RawCheckRun[]> => {
  type RawRun = {
    name: string
    id: number
    status: string
    conclusion: string | null
    details_url: string | null
  }
  // Unpaginated, this returns every check-run for the SHA across ALL names (not just required
  // ones), so a busy SHA with many jobs/reruns can push a required check's latest run past page
  // 1 — normalizeCheckRuns would then see an older run (or none) for that name and gate on
  // stale data. Paginate until a short page proves there's nothing left.
  const runs: RawRun[] = []
  let page = 1
  while (true) {
    const response = JSON.parse(
      await runGh([
        "api",
        `/repos/${repo.owner}/${repo.repo}/commits/${headSha}/check-runs?per_page=100&page=${page}`,
      ]),
    ) as { check_runs: RawRun[] }
    runs.push(...response.check_runs)
    if (response.check_runs.length < 100) break
    page += 1
  }

  return runs.map((run) => ({
    name: run.name,
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    detailsUrl: run.details_url,
  }))
}

// Paginated like fetchCheckRuns, because every workflow on the SHA comes back.
const fetchWorkflowRuns = async (repo: RepoRef, headSha: string): Promise<RawWorkflowRun[]> => {
  type RawRun = { id: number; workflow_id: number; status: string; event: string }
  const runs: RawRun[] = []
  let page = 1
  while (true) {
    const response = JSON.parse(
      await runGh([
        "api",
        `/repos/${repo.owner}/${repo.repo}/actions/runs?head_sha=${headSha}&per_page=100&page=${page}`,
      ]),
    ) as { workflow_runs: RawRun[] }
    runs.push(...response.workflow_runs)
    if (response.workflow_runs.length < 100) break
    page += 1
  }

  return runs.map((run) => ({
    id: run.id,
    workflowId: run.workflow_id,
    status: run.status,
    event: run.event,
  }))
}

// --- one gather round ----------------------------------------------------------

type GatherRoundInput = {
  repo: RepoRef
  stackEntries: StackEntry[]
  requiredChecks: string[]
  priorState: FelixStateFile
}

type GatherResult = { prs: PrSnapshot[]; topPrNumber: number }

const gatherOnePr = async (
  repo: RepoRef,
  entry: StackEntry,
  requiredChecks: string[],
  priorState: FelixStateFile,
): Promise<PrSnapshot> => {
  const view = await fetchPrView(entry.prNumber)
  const since = lastCheckTimestampFor(priorState, entry.prNumber)
  const [reviewThreads, issueComments, rawCheckRuns, workflowRuns] = await Promise.all([
    fetchReviewThreads(repo, entry.prNumber),
    fetchIssueComments(repo, entry.prNumber, since),
    fetchCheckRuns(repo, view.headRefOid),
    fetchWorkflowRuns(repo, view.headRefOid),
  ])

  return {
    prNumber: entry.prNumber,
    branch: entry.branch,
    state: view.state,
    mergeStateStatus: view.mergeStateStatus,
    reviewDecision: view.reviewDecision === "" ? null : view.reviewDecision,
    reviewThreads,
    issueComments,
    checks: treatLiveTwinsAsRunning(normalizeCheckRuns(requiredChecks, rawCheckRuns), workflowRuns),
  }
}

const gatherRound = async (input: GatherRoundInput): Promise<GatherResult> => {
  const { repo, stackEntries, requiredChecks, priorState } = input
  const bottomToTop = stackEntries.slice().reverse()

  const prs = await Promise.all(
    bottomToTop.map((entry) => gatherOnePr(repo, entry, requiredChecks, priorState)),
  )

  return { prs, topPrNumber: stackEntries[0]?.prNumber ?? bottomToTop[0]?.prNumber ?? 0 }
}

// --- payload writing -------------------------------------------------------------

type StackDescriptor = {
  prNumber: number
  branch: string
  baseBranch: string
  title: string
  body: string
}

const writePayload = (
  stackDescriptors: StackDescriptor[],
  signals: PayloadSignal[],
  ambiguousSignals: AmbiguousSignal[],
): void => {
  mkdirSync(path.dirname(PAYLOAD_PATH), { recursive: true })
  writeFileSync(
    PAYLOAD_PATH,
    JSON.stringify({ stack: stackDescriptors, signals, ambiguousSignals }, null, 2),
  )
}

// --- session setup ---------------------------------------------------------------

const resolveRepo = async (): Promise<RepoRef> => {
  const repoInfo = JSON.parse(await runGh(["repo", "view", "--json", "owner,name"])) as {
    owner: { login: string }
    name: string
  }
  return { owner: repoInfo.owner.login, repo: repoInfo.name }
}

const fetchDefaultBranch = async (): Promise<string> => {
  const response = JSON.parse(await runGh(["repo", "view", "--json", "defaultBranchRef"])) as {
    defaultBranchRef: { name: string }
  }
  return response.defaultBranchRef.name
}

// `/rate_limit` doesn't count against the rate limit, so reading it every round is free.
const fetchRateLimits = async (): Promise<{ core: RateLimitBucket; graphql: RateLimitBucket }> => {
  type RawBucket = { remaining: number; reset: number }
  const { resources } = JSON.parse(await runGh(["api", "rate_limit"])) as {
    resources: { core: RawBucket; graphql: RawBucket }
  }
  const toBucket = (raw: RawBucket): RateLimitBucket => ({
    remaining: raw.remaining,
    resetAtMs: raw.reset * 1000,
  })
  return { core: toBucket(resources.core), graphql: toBucket(resources.graphql) }
}

type Session = {
  repo: RepoRef
  stackEntries: StackEntry[]
  requiredChecks: string[]
  state: FelixStateFile
  quietExit: number
}

type StackRefresh =
  | { kind: "READY"; stackEntries: StackEntry[] }
  | { kind: "TERMINAL"; decision: NextActionDecision }

const stackPrNumbers = (stackEntries: StackEntry[]): number[] =>
  stackEntries.map((entry) => entry.prNumber)

// Re-resolves the stack from scratch (`gt-stack list`, not a cached list) — a PR merging
// mid-session, a new PR joining the stack, or the branch losing Graphite tracking are all only
// visible this way. Called once at startup and again at the top of every round; when the shape
// actually changed, `resolveState` (see below) discards the stale state on its own.
const refreshStackEntries = async (prNumber: number): Promise<StackRefresh> => {
  const stackEntries = await fetchStackEntries(prNumber)
  if (!Array.isArray(stackEntries)) return { kind: "TERMINAL", decision: stackEntries }
  if (stackEntries.length === 0) {
    return {
      kind: "TERMINAL",
      decision: { kind: "HUMAN_REQUIRED", prNumber, reason: "No open PR found for this branch." },
    }
  }
  return { kind: "READY", stackEntries }
}

// Detection can come back empty on a transient ruleset API failure (see the felix-loop skill's
// "CI scope" §"Empty required-checks list") — retry every round rather than caching the first
// result forever, so a startup hiccup recovers and a required check ADDED to branch protection
// mid-session gets picked up too. But once detection has ever succeeded, a later empty result
// must not wipe out that known-good list; an empty result only ever means "couldn't detect right
// now", never "there truly are zero required checks now" (rulesets aren't removed by a flake).
const refreshRequiredChecks = async (
  repo: RepoRef,
  previousRequiredChecks: string[],
): Promise<string[]> => {
  const requiredChecks = await fetchRequiredChecks(repo, await fetchDefaultBranch())
  return requiredChecks.length > 0 ? requiredChecks : previousRequiredChecks
}

type InitResult =
  | { kind: "READY"; session: Session }
  | { kind: "TERMINAL"; decision: NextActionDecision }

const initializeSession = async (prNumber: number, quietExit: number): Promise<InitResult> => {
  const repo = await resolveRepo()
  const refresh = await refreshStackEntries(prNumber)
  if (refresh.kind === "TERMINAL") return refresh

  const requiredChecks = await refreshRequiredChecks(repo, [])
  const state = resolveState(loadState(), stackPrNumbers(refresh.stackEntries), requiredChecks)

  return {
    kind: "READY",
    session: { repo, stackEntries: refresh.stackEntries, requiredChecks, state, quietExit },
  }
}

// --- one round, start to finish ---------------------------------------------------

// Refreshes each PR's branch/base_branch bookkeeping after a gather round. Deliberately does
// NOT touch `last_check_timestamp` — that field is parent-owned (see `filterIssueComments` in
// nextActionCore.ts); this script only ever reads it via `lastCheckTimestampFor`.
const syncPrRecords = (
  state: FelixStateFile,
  prs: PrSnapshot[],
  stackEntries: StackEntry[],
): FelixStateFile => {
  let next = state
  for (const pr of prs) {
    const entry = stackEntries.find((candidate) => candidate.prNumber === pr.prNumber)
    if (entry === undefined) continue
    next = withUpdatedPrRecord(next, {
      prNumber: pr.prNumber,
      branch: entry.branch,
      baseBranch: entry.baseRefName,
    })
  }
  return next
}

type SessionRefresh =
  | { kind: "READY"; session: Session }
  | { kind: "TERMINAL"; decision: NextActionDecision }

const refreshSessionForRound = async (
  session: Session,
  prNumber: number,
): Promise<SessionRefresh> => {
  const refresh = await refreshStackEntries(prNumber)
  if (refresh.kind === "TERMINAL") return refresh

  const requiredChecks = await refreshRequiredChecks(session.repo, session.requiredChecks)
  const state = resolveState(session.state, stackPrNumbers(refresh.stackEntries), requiredChecks)
  return {
    kind: "READY",
    session: { ...session, stackEntries: refresh.stackEntries, requiredChecks, state },
  }
}

type RoundOutcome = { decision: NextActionDecision; state: FelixStateFile }

const runOneRound = async (session: Session): Promise<RoundOutcome> => {
  const { repo, stackEntries, requiredChecks, state: priorState, quietExit } = session
  const { prs, topPrNumber } = await gatherRound({ repo, stackEntries, requiredChecks, priorState })

  // Pruned before every decision — `evaluateNextAction` trusts its caller for this (see the
  // doc comment on `EvaluateNextActionInput.restartCounts`) — and the pruned copy is what gets
  // persisted below, so a resolved episode's entry doesn't linger in .felix-state.json forever
  // either. See `pruneResolvedRestartCounts` for why staleness matters.
  const restartCounts = pruneResolvedRestartCounts(prs, priorState.next_action_restart_counts ?? {})

  const decision = evaluateNextAction({
    prs,
    requiredChecks,
    consecutiveQuietRounds: priorState.consecutive_quiet_rounds ?? 0,
    quietExit,
    restartCounts,
    dismissedCiFailures: priorState.next_action_dismissed_ci_failures ?? {},
    topPrNumber,
  })

  const bumped = {
    ...priorState,
    round: (priorState.round ?? 0) + 1,
    next_action_restart_counts: restartCounts,
  }
  const state = syncPrRecords(bumped, prs, stackEntries)
  return { decision, state }
}

// --- terminal outcomes -------------------------------------------------------------

const buildStackDescriptors = async (stackEntries: StackEntry[]): Promise<StackDescriptor[]> =>
  Promise.all(
    stackEntries
      .slice()
      .reverse()
      .map(async (entry): Promise<StackDescriptor> => {
        const view = await fetchPrView(entry.prNumber)
        return {
          prNumber: entry.prNumber,
          branch: entry.branch,
          baseBranch: entry.baseRefName,
          title: view.title,
          body: view.body,
        }
      }),
  )

type ActionRequiredDecision = Extract<NextActionDecision, { kind: "TRIAGE" | "RESTART_CANCELLED" }>

const payloadSignalsFor = (
  decision: ActionRequiredDecision,
): { signals: PayloadSignal[]; ambiguousSignals: AmbiguousSignal[] } =>
  decision.kind === "TRIAGE"
    ? { signals: decision.signals, ambiguousSignals: decision.ambiguousSignals }
    : { signals: decision.signals, ambiguousSignals: [] }

// Writes the payload the LLM will triage/fix from, then reports the round as non-quiet before
// handing control back — the caller's job (Phases 6-9) starts from here.
const emitActionRequired = async (
  decision: ActionRequiredDecision,
  stackEntries: StackEntry[],
  state: FelixStateFile,
): Promise<void> => {
  const stackDescriptors = await buildStackDescriptors(stackEntries)
  const { signals, ambiguousSignals } = payloadSignalsFor(decision)
  writePayload(stackDescriptors, signals, ambiguousSignals)

  saveState({ ...state, consecutive_quiet_rounds: 0 })
  console.log(
    JSON.stringify({ kind: decision.kind, payloadPath: path.relative(REPO_ROOT, PAYLOAD_PATH) }),
  )
}

const withUpdatedQuietRounds = (
  state: FelixStateFile,
  incrementQuietRound: boolean,
): FelixStateFile => ({
  ...state,
  consecutive_quiet_rounds: incrementQuietRound
    ? (state.consecutive_quiet_rounds ?? 0) + 1
    : (state.consecutive_quiet_rounds ?? 0),
})

// --- poll clock ---------------------------------------------------------------------

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

const nextPollDelayMs = async (args: Args, prCount: number): Promise<number> => {
  const delayMs = pollDelayMs({
    pollIntervalMs: args.pollIntervalMs,
    nowMs: Date.now(),
    prCount,
    ...(await fetchRateLimits()),
  })
  if (delayMs > args.pollIntervalMs) {
    console.error(
      `nextAction: pacing to GitHub's rate limit, next round in ${Math.round(delayMs / 1000)}s`,
    )
  }
  return delayMs
}

// The Bash tool moves a command to the background once it passes its timeout, 15 minutes at most,
// and a subagent can't wait on a background command. The rest covers one more round's retries.
const CALL_BUDGET_MS = 10 * 60 * 1000

// POLL_TIMEOUT is a deadline, not a warning. Every state the loop can resolve on its own resolves
// through an actionable decision, so once the deadline passes without one, the stack is parked on
// something only a human can move and further rounds spend gh calls to learn nothing.
// `planPollWait` therefore ends the session with HUMAN_REQUIRED (see `main`). The deadline
// carries across `--continue` calls.
type PollClock = {
  deadlineMs: number
  callEndMs: number
  maybeLogHeartbeat: (prNumber: number, round: number) => void
}

const createPollClock = (args: Args, state: FelixStateFile): PollClock => {
  const freshDeadlineMs = Date.now() + args.pollTimeoutMs
  const heartbeatIntervalMs = Math.min(args.pollTimeoutMs, HEARTBEAT_INTERVAL_MS)
  let lastLogMs = Date.now()

  return {
    deadlineMs: args.resume
      ? (state.next_action_poll_deadline_ms ?? freshDeadlineMs)
      : freshDeadlineMs,
    callEndMs: Date.now() + CALL_BUDGET_MS,
    maybeLogHeartbeat: (prNumber, round) => {
      if (Date.now() - lastLogMs < heartbeatIntervalMs) return
      console.error(`nextAction: still polling PR #${prNumber} (round ${round})`)
      lastLogMs = Date.now()
    },
  }
}

// --- main ------------------------------------------------------------------------

const pollTimeoutDecision = (args: Args): NextActionDecision => ({
  kind: "HUMAN_REQUIRED",
  prNumber: args.prNumber,
  reason: `Polled for POLL_TIMEOUT (${args.pollTimeoutMs / 1000}s) without reaching either an actionable signal or a clean exit — check the stack by hand, then restart Felix.`,
})

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2))
  const init = await initializeSession(args.prNumber, args.quietExit)
  if (init.kind === "TERMINAL") {
    console.log(JSON.stringify(init.decision))
    return
  }

  let session = init.session
  const pollClock = createPollClock(args, session.state)
  let nextRoundAtMs = args.resume
    ? (session.state.next_action_next_round_at_ms ?? Date.now())
    : Date.now()

  while (true) {
    const wait = planPollWait({
      nowMs: Date.now(),
      nextRoundAtMs,
      callEndMs: pollClock.callEndMs,
      deadlineMs: pollClock.deadlineMs,
    })
    await sleep(wait.sleepMs)
    if (wait.next === "TIMEOUT") {
      console.log(JSON.stringify(pollTimeoutDecision(args)))
      return
    }
    if (wait.next === "KEEP_POLLING") {
      saveState({
        ...session.state,
        next_action_poll_deadline_ms: pollClock.deadlineMs,
        next_action_next_round_at_ms: nextRoundAtMs,
      })
      console.log(JSON.stringify({ kind: "KEEP_POLLING" }))
      return
    }

    const refreshed = await refreshSessionForRound(session, args.prNumber)
    if (refreshed.kind === "TERMINAL") {
      console.log(JSON.stringify(refreshed.decision))
      return
    }
    session = refreshed.session

    const { decision, state } = await runOneRound(session)
    session = { ...session, state }

    if (decision.kind === "TRIAGE" || decision.kind === "RESTART_CANCELLED") {
      await emitActionRequired(decision, session.stackEntries, session.state)
      return
    }

    if (decision.kind !== "POLL") {
      saveState(session.state)
      console.log(JSON.stringify(decision))
      return
    }

    // POLL
    session = {
      ...session,
      state: withUpdatedQuietRounds(session.state, decision.incrementQuietRound),
    }
    saveState(session.state)

    if (args.once) {
      console.log(JSON.stringify(decision))
      return
    }

    nextRoundAtMs = Date.now() + (await nextPollDelayMs(args, session.stackEntries.length))
    pollClock.maybeLogHeartbeat(args.prNumber, session.state.round ?? 0)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
