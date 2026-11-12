// The mechanical half of eval.md: sentence length, clause chaining, commas, semicolons, banned
// phrases, ellipsis characters, em dash stacks, and code written as a person.

export type Failure =
  | "LONG"
  | "CHAIN"
  | "COMMAS"
  | "PERSON"
  | "LIFETIME"
  | "SEMI"
  | "BANNED"
  | "ELLIPSIS"
  | "EMDASH"

export type SentenceScore = { text: string; words: number; joins: number; commas: number }

export type ProseScore = {
  sentences: SentenceScore[]
  personifications: number
  lifetimeWords: number
  semicolons: number
  banned: string[]
  ellipses: number
  emDashParagraphs: number
  failures: Failure[]
}

const MAX_WORDS = 30
const MAX_JOINS = 2
const MAX_COMMAS = 2
const MAX_EM_DASHES_PER_PARAGRAPH = 1

// The four joins eval.md 8c caps. "but" is not one of them.
const JOIN_WORDS = new Set(["and", "so", "because", "or"])

// "hand off" stays legal, because a handoff is product vocabulary.
const PERSONIFIED =
  /\b(lives?|dies?|dying|alive|owes?|guess(es)?|claims?|speaks?|knows?|wants?|decides?|gone|survives?|survivors?|inherits?|hands? (it|them) |hand(s|ed|ing)? ((it|them|this|that) )?(back|over))\b/gi

// Eval item 8d. Bare "own" stays legal, so "their own copy" passes.
const LIFETIME = /\b(owns|owner|lifetime|outlives)\b/gi

// Eval item 5 plus the phrases spotted since. Add here when you spot another.
const BANNED_PHRASES = [
  "the honest truth",
  "smoking gun",
  "heads-up",
  "load-bearing",
  "belt-and-suspenders",
  "I'll level with you",
  "byte-for-byte",
  "it's worth noting",
  "at its core",
  "platform-neutral",
  "robust",
  "seamless",
  "gracefully",
  "leverage",
  "delve",
]

const BANNED = [
  ...BANNED_PHRASES.map((phrase) => new RegExp(`\\b${phrase.replace(/'/g, "['’]")}\\b`, "gi")),
  // "Clean." as a one-word verdict, which a clean working tree is not.
  /(?<=^|[\s(])Clean\.(?=\s|$)/gm,
  // A platform comparison with no verb reads two ways.
  /(?<!(?:same way|such)[\s/*]+)\bas (on|with) (web|mobile|desktop|electron|ios|android|the (web|desktop|mobile) app)\b(?!['’]s)/gi,
]

type Comment = { text: string; standalone: boolean }
type DiffScan = { inCodeFile: boolean; added: (string | undefined)[] }
type PlanScan = { headingPath?: string; fence?: string; added: (string | undefined)[] }

const CODE_FILE = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/
const CODE_FENCE = /^(?:diff|ts|tsx|typescript|js|jsx|javascript)$/
const HEADING = /^#{2,4}\s/
const HEADING_PATH = /^#{2,4}\s+`?([\w./()[\]-]+\.\w+)`?/
const COMMENT_LINE = /^\s*(?:\{?\/\/+|\{?\/\*\*?|\*(?=\s|$))\s?(.*?)\s*(?:\*\/\}?)?\s*$/
const TRAILING_COMMENT = /\s\/\/\s+(.*?)\s*$/
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g
const DIRECTIVE = /^(?:eslint-|@ts-|prettier-ignore|noinspection)/

export const addedComments = (text: string): string => {
  const lines = text.split("\n")
  const added = lines.some(isFence) ? addedLinesInPlan(lines) : addedLinesInDiff(lines)
  return added
    .map(commentOn)
    .reduce(toParagraphs, [[]])
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph) => paragraph.join("\n"))
    .join("\n\n")
}

const isFence = (line: string) => line.startsWith("```")

const isAddedLine = (line: string) => line.startsWith("+") && !line.startsWith("+++ ")

const addedLinesInDiff = (lines: string[]): (string | undefined)[] =>
  lines.reduce<DiffScan>(
    ({ inCodeFile, added }, line) => {
      const isCode = line.startsWith("+++ ") ? CODE_FILE.test(line.trim()) : inCodeFile
      added.push(isCode && isAddedLine(line) ? line.slice(1) : undefined)
      return { inCodeFile: isCode, added }
    },
    { inCodeFile: false, added: [] },
  ).added

const addedLinesInPlan = (lines: string[]): (string | undefined)[] =>
  lines.reduce<PlanScan>(
    (scan, line) => {
      const next = isFence(line) ? toggleFence(scan, line) : withHeading(scan, line)
      next.added.push(isFence(line) ? undefined : addedLineInBlock(next, line))
      return next
    },
    { added: [] },
  ).added

const toggleFence = (scan: PlanScan, line: string): PlanScan => ({
  ...scan,
  fence: scan.fence === undefined ? line.slice(3).trim() : undefined,
})

const withHeading = (scan: PlanScan, line: string): PlanScan =>
  scan.fence === undefined && HEADING.test(line)
    ? { ...scan, headingPath: HEADING_PATH.exec(line)?.[1] }
    : scan

const addedLineInBlock = ({ fence, headingPath }: PlanScan, line: string): string | undefined => {
  if (fence === undefined || !isCodeBlock(fence, headingPath)) return undefined
  if (fence === "diff") return isAddedLine(line) ? line.slice(1) : undefined
  return line
}

const isCodeBlock = (fence: string, headingPath: string | undefined) =>
  CODE_FENCE.test(fence) && (headingPath === undefined || CODE_FILE.test(headingPath))

const commentOn = (line: string | undefined): Comment | undefined => {
  if (line === undefined) return undefined
  const block = COMMENT_LINE.exec(line)?.[1]
  const text = block ?? trailingComment(line)
  return text && !DIRECTIVE.test(text) ? { text, standalone: block === undefined } : undefined
}

const trailingComment = (line: string): string | undefined => {
  // Each mask is as long as its literal, so an index into the masked line works on the line itself.
  const masked = line.replace(STRING_LITERAL, (literal) => "_".repeat(literal.length))
  const start = TRAILING_COMMENT.exec(masked)?.index
  return start === undefined ? undefined : TRAILING_COMMENT.exec(line.slice(start))?.[1]
}

const toParagraphs = (paragraphs: string[][], comment: Comment | undefined): string[][] => {
  if (comment === undefined) paragraphs.push([])
  else if (comment.standalone) paragraphs.push([comment.text], [])
  else paragraphs.at(-1)?.push(comment.text)
  return paragraphs
}

export const scoreProse = (markdown: string): ProseScore => {
  const prose = withoutFrontmatter(markdown)
  const paragraphs = splitParagraphs(prose)
  const sentences = paragraphs.flatMap(splitSentences).map(scoreSentence)
  const personifications = sentences.reduce((n, s) => n + countMatches(s.text, PERSONIFIED), 0)
  const lifetimeWords = sentences.reduce((n, s) => n + countMatches(s.text, LIFETIME), 0)
  const semicolons = sentences.reduce((n, s) => n + countMatches(s.text, /;/g), 0)
  const text = withoutCode(prose)
  const banned = BANNED.flatMap((pattern) => text.match(pattern) ?? [])
  const ellipses = countMatches(text, /…/g)
  const emDashParagraphs = paragraphs
    .map(withoutCode)
    .filter((paragraph) => countMatches(paragraph, /—/g) > MAX_EM_DASHES_PER_PARAGRAPH).length
  const checks: [Failure, boolean][] = [
    ["LONG", sentences.some((s) => s.words > MAX_WORDS)],
    ["CHAIN", sentences.some((s) => s.joins > MAX_JOINS)],
    ["COMMAS", sentences.some((s) => s.commas > MAX_COMMAS)],
    ["PERSON", personifications > 0],
    ["LIFETIME", lifetimeWords > 0],
    ["SEMI", semicolons > 0],
    ["BANNED", banned.length > 0],
    ["ELLIPSIS", ellipses > 0],
    ["EMDASH", emDashParagraphs > 0],
  ]
  const failures = checks.filter(([, failed]) => failed).map(([name]) => name)
  return {
    sentences,
    personifications,
    lifetimeWords,
    semicolons,
    banned,
    ellipses,
    emDashParagraphs,
    failures,
  }
}

// Paragraphs of prose lines, with fenced code gone and markdown structure left out.
export const splitParagraphs = (markdown: string): string[] =>
  withoutCodeBlocks(markdown)
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").filter(isProseLine).join(" "))
    .filter((paragraph) => paragraph !== "")

export const splitSentences = (paragraph: string): string[] =>
  paragraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length > 2)

// Prose only: headings, bullets, tables, quotes, ticket links, and a PR title are not sentences.
const isProseLine = (line: string) =>
  line.trim() !== "" &&
  !/^\s*[-|#>*]/.test(line) &&
  !/^(Linear:|Ref |Closes )/.test(line) &&
  !/^\s*(feat|fix|refactor|chore|test|docs|perf)[:(]/.test(line)

// A SKILL.md `description` is a list of triggers for the model to match, so it isn't scored.
const withoutFrontmatter = (markdown: string) => markdown.replace(/^---\n[\s\S]*?\n---(\n|$)/, "")

const withoutCodeBlocks = (markdown: string) => markdown.replace(/```[\s\S]*?```/g, "")

const withoutCode = (markdown: string) => withoutCodeBlocks(markdown).replace(/`[^`\n]*`/g, "")

const scoreSentence = (text: string): SentenceScore => ({
  text,
  words: text.split(/\s+/).length,
  joins: (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((word) => JOIN_WORDS.has(word)).length,
  commas: countMatches(text, /,/g),
})

const countMatches = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length

export const isOverLimit = (sentence: SentenceScore) =>
  sentence.words > MAX_WORDS || sentence.joins > MAX_JOINS || sentence.commas > MAX_COMMAS

export const formatReport = (name: string, score: ProseScore): string => {
  const label = name.padEnd(14)
  if (score.sentences.length === 0 && score.failures.length === 0) return `${label} (no prose)`
  const maxWords = Math.max(0, ...score.sentences.map((s) => s.words))
  const maxJoins = Math.max(0, ...score.sentences.map((s) => s.joins))
  const maxCommas = Math.max(0, ...score.sentences.map((s) => s.commas))
  const verdict = score.failures.join("/") || "pass"
  const summary = `${label} n=${score.sentences.length} maxwords=${String(maxWords).padStart(2)} maxjoins=${maxJoins} maxcommas=${maxCommas} person=${score.personifications} lifetime=${score.lifetimeWords} semi=${score.semicolons} banned=${score.banned.length} ellipsis=${score.ellipses} emdash=${score.emDashParagraphs}  ${verdict}`
  const offenders = score.sentences
    .filter(isOverLimit)
    .map((s) => `    [${s.words}w ${s.joins}j ${s.commas}c] ${s.text}`)
  const bannedLines = score.banned.map((phrase) => `    banned: ${phrase}`)
  return [summary, ...offenders, ...bannedLines].join("\n")
}
