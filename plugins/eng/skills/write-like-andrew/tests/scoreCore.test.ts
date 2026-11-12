import { addedComments, scoreProse } from "./scoreCore.ts"

describe("#addedComments", () => {
  it("reads the comments a diff adds to a code file, one paragraph each", () => {
    const diff = [
      "diff --git a/src/repo.ts b/src/repo.ts",
      "--- a/src/repo.ts",
      "+++ b/src/repo.ts",
      "@@ -1,3 +1,8 @@",
      "-// Removed comment.",
      "+// GETDEL reads and deletes in one step,",
      "+// so two redeems can't both get the flow.",
      "+const flow = await redis.getDel(key)",
      "+/**",
      "+ * Reads the parameters an SSO callback returns.",
      "+ */",
      "+const ttlSeconds = 600 // Ten minutes covers a slow login.",
      '+const url = "https://example.com" // A URL is not a comment.',
      '+const quoted = "a // b"',
      '+const label = t("don\'t") // Keeps the apostrophe.',
      "+*generate() {",
      "+{/* A JSX comment. */}",
      "+// eslint-disable-next-line no-console",
      " // Unchanged comment.",
    ].join("\n")

    expect(addedComments(diff)).toEqual(
      [
        "GETDEL reads and deletes in one step,\nso two redeems can't both get the flow.",
        "Reads the parameters an SSO callback returns.",
        "Ten minutes covers a slow login.",
        "A URL is not a comment.",
        "Keeps the apostrophe.",
        "A JSX comment.",
      ].join("\n\n"),
    )
  })

  it("skips the added lines of a file that isn't code", () => {
    const diff = [
      "--- a/SKILL.md",
      "+++ b/SKILL.md",
      "@@ -1 +1,2 @@",
      "+* A bullet, not a comment.",
    ].join("\n")

    expect(addedComments(diff)).toEqual("")
  })

  it("reads a plan's diff blocks and new files, and skips blocks under a non-code file", () => {
    const plan = [
      "### `src/repo.ts`",
      "```diff",
      " // Context comment.",
      "+// Added in the diff block.",
      "```",
      "### `src/flow.ts` (new)",
      "```ts",
      "// Whole new file.",
      "export const flow = 1",
      "```",
      "### `SKILL.md`",
      "```diff",
      "+* A bullet, not a comment.",
      "```",
      "### `app/[id].tsx`",
      "```tsx",
      "// A route with brackets.",
      "```",
      "### PR description",
      "```",
      "// Not code.",
      "```",
    ].join("\n")

    expect(addedComments(plan)).toEqual(
      "Added in the diff block.\n\nWhole new file.\n\nA route with brackets.",
    )
  })
})

it("skips a SKILL.md frontmatter description", () => {
  const score = scoreProse(
    [
      "---",
      "name: example",
      "description: Use when planning, splitting, re-cutting, or reviewing a stack.",
      "---",
      "",
      "Read the guide first.",
    ].join("\n"),
  )

  expect(score.sentences.map((sentence) => sentence.text)).toEqual(["Read the guide first."])
})

it.each([
  "The cache hands back the row.",
  "The cache handed it back to the caller.",
  "The queue is handing that over to the worker.",
  "The worker hands over the batch.",
  "The survivor keeps the lock.",
  "Both survivors keep the lock.",
])("counts %j as code written as a person", (text) => {
  expect(scoreProse(text).personifications).toEqual(1)
})

it("leaves a handoff alone", () => {
  expect(scoreProse("The worker hands off the batch at the handoff.").personifications).toEqual(0)
})
