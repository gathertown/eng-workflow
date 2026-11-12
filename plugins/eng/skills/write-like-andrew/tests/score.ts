#!/usr/bin/env node
// Scores markdown drafts against the mechanical rules in eval.md, one report per file. Exits 1
// when any file fails, so a PR body or review comment can be gated on it.
//
// Usage:
//   node <this skill's directory>/tests/score.ts <draft.md> [<draft.md> ...]
//   node <this skill's directory>/tests/score.ts --comments <diff or plan> [...]
//   git diff -U0 <parent>..<branch> | node <this skill's directory>/tests/score.ts --comments -
//
// --comments scores only the code comments a diff adds, or the comments in a plan's code blocks. It
// also lists every comment it read, because eval.md's comment checks still have to be run by hand.

import { readFileSync } from "node:fs"
import { basename } from "node:path"

import { addedComments, formatReport, scoreProse } from "./scoreCore.ts"

const args = process.argv.slice(2)
const commentsOnly = args.includes("--comments")

const listComments = (prose: string): string =>
  prose
    .split("\n\n")
    .filter((comment) => comment !== "")
    .map((comment) => `    > ${comment.replaceAll("\n", " ")}`)
    .join("\n")

const scores = args
  .filter((arg) => arg !== "--comments")
  .map((path) => ({ path, text: readFileSync(path === "-" ? 0 : path, "utf8") }))
  .map(({ path, text }) => ({ path, prose: commentsOnly ? addedComments(text) : text }))
  .map(({ path, prose }) => ({
    name: path === "-" ? "stdin" : basename(path),
    prose,
    score: scoreProse(prose),
  }))

for (const { name, prose, score } of scores) {
  console.log(formatReport(name, score))
  if (commentsOnly) console.log(listComments(prose))
}

process.exitCode = scores.some(({ score }) => score.failures.length > 0) ? 1 : 0
