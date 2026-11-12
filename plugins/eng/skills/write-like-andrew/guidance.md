# Shared writing guidance

Andrew writes like a senior engineer talking to a peer: plain words, a real number or a link where a lesser writer puts an adjective, an opinion stated in the first person and then acted on, and candor about what he skipped. He is short by default and never literary. Code in his prose is a thing that does something, never a character that owes, guesses, or keeps anything honest.

## Procedure

1. Read [exemplars.md](exemplars.md). Read the section for the artifact you are producing, and the "Not this" section, every time. The voice lives in the samples. They are a register guide, not a phrasebook: reuse one of his short lines when it fits the spot exactly, otherwise write your own in the same register, and never stitch quotes together.
2. List every prose span in scope: comments, JSDoc, PR body, commit body, ticket text, review thread.
3. For each span, apply the recipe for its artifact below. For comments, the deletion test comes first and usually ends the job.
4. Run `tests/score.ts` in this skill's directory on the text with `node`, and fix every line it prints. For code comments in a diff or a plan, run it with `--comments`. That mode scores only the comments and lists each one. Then run [eval.md](eval.md). Fix each fail, then run both again.
5. Return the rewritten text or apply the edits. No "what changed" write-up unless asked.

## Voice

- Subject, verb, object. "Fixes crash when connecting a calendar. Regression from #1234."
- One idea per sentence, then a period. His PR sentences average 16 words, and 94% stay under 30. A second clause hangs off one "so", "because", "and", or "or", and a third starts a new sentence: 98% of his sentences use at most two of those words, and 98% carry at most two commas. "Load the row before the tx, or its mutations aren't change-tracked."
- Plain words over concept nouns. "Expo tells us later whether Apple accepted the push", never "asynchronous feedback channel".
- Numbers and names over adjectives. "8000+ line `Room.ts`", "took 5 seconds to find". These are numbers a person would know or round off, not tallies from a script.
- Opinion in the first person, then a decision. "My take is that it's fine." "IMO let's move this to the invoice." "We'll use Data Mapper."
- Candor over polish. "Maybe not exactly the most DRY, but good enough for now." "Didn't test, seems simple enough." "Unclear why it was happening, but seems safe to cast it here."
- Link instead of retelling: the Slack thread, the style guide anchor, the PR number.
- Contractions, `e.g.`, `i.e.`, `etc.` are all fine. So are `tl;dr`, `IMO`, `fwiw`, `btw`, `JW` (just wondering), `noop`, `sus`, `DX`, `WAG`, `automagical`.
- Wit comes from understatement and candor: "Just TS Classes™", "3. Profit.", "(read: me)". Never a set-up joke, never forced.
- Emoji: ❌/✅ on before/after code pairs in docs, 🟢🟡🔴 in rating tables, an occasional 🤷🏼 or 👏🏼 in chat. None in shipped code comments, PR bodies, or headings.

## What he cuts on sight

Each of these he has flagged in review, in these words or close to them.

- Code personified or made metaphor: "the list owes the user", "keeps the gap honest", "dead end for paging", "the card is not the place to guess". State what the code does.
- Ownership and lifetime as abstract nouns: "the service already owns the session's lifetime", "the join ran after its owner was gone", "a presenter lives and dies with its screen". He has never written `owns`, `owner`, `lifetime`, `lives`, `dies`, or `outlives` in a PR body. Name the mechanism: "the presenter is destroyed when its screen unmounts", "the service isn't torn down with the screen". A ticket or plan doc handed to you carries its drafter's vocabulary, not his, so translate the facts instead of copying their wording.
- A general rule stated as a maxim, usually a short sentence in the present tense that would be true of any codebase ("A presenter lives and dies with its screen."). He states the specific fact about this code and lets the reader generalize.
- A gloss wedged into a sentence between commas: "Moves the calendar tap's two-step, start the meeting and join this phone's AV, out of both presenters". Splitting a verb from its object with a definition costs the reader the thread. Define it in the next sentence, or don't coin the term. Coined nouns reused three times ("the two-step", "the arrival rule") need the same cut. Grep a coined term before using it: "arrival rule" appears nowhere in the repo, so a reviewer can't look it up. Name the symbol, or describe what happens.
- Noun-clause openers: "What the screen draws once...", "Whether the last fetch failed, so...", "Which answer the list owes...". Give the sentence a subject.
- Contrast as the default sentence shape: "X rather than Y", "X, not Y", "one field rather than a set of booleans". Say X. (Naming an alternative he actually considered, once, is not this. A contrast handed to you in the source facts is not one he weighed. State the rule.)
- Colon reveals: "One field rather than booleans: an event has exactly one action." Write "An event has one action at a time."
- Adjectives that add nothing: "platform-neutral" ("it is or it isn't"), "robust", "gracefully", "seamless", "properly".
- Machine-exact counts a person could not have produced: "Of the 1,044 source strings I could check, 209 were in the bundle before this change and all 1,044 are after." He would never have counted. Round it ("about 1k source strings, roughly 80% of them missing from the bundle before") or drop it. If the exact figure matters, attribute it: "According to AI analysis, 835 of 1,044 source strings were missing before and none are after."
- Banned outright: byte-for-byte, load-bearing, the honest truth, smoking gun, heads-up, belt-and-suspenders, "Clean." as a verdict, "it's worth noting", "at its core", the `…` character (write `...`).
- History in PR text: "replaces the old approach", "an improvement over", "previously". The reader can't see the old code. (For comments, writing-code covers this and explain-once.)
- Two clauses joined by a semicolon: "`uploadAttachment` is unchanged; retry calls it the same way", "The composer owns the pending list; a tile owns its own status", "by the time the user taps retry; re-reading it would fail with ENOENT". His prose has about one semicolon per several thousand words. Split at the semicolon into two sentences, or join with "so", "because", or "or": "Retry calls `uploadAttachment` the same way the first attempt did." "Keep the FormData, or re-reading the URI fails with ENOENT once iOS reclaims the temp file."
- Clause-stacking without the semicolon: three clauses hung off one verb with "so ..., the way ..., and gets ... with it". Zero semicolons and still wrong. Same fix.
- Em dash chains. One per paragraph at most, and none in code comments. Commas, periods, and parentheses come first.
- Bold mid-sentence, emoji in headings, a header over a two-sentence section, a bullet list where two sentences would read better.

## Recipes

### Code comments and JSDoc

If the repo has its own rules for comments, apply them first. This recipe is the voice layer on top.

Deletion test first, inline here because it decides most rewrites and the skill has to work when the repo isn't loaded: delete the comment, re-read the code, and if the code answers every question the comment answered, it stays deleted. Per-field JSDoc on a type, a JSDoc that restates the method name, a comment narrating what the next block does, a note on why something is private, a platform-difference explanation inside a test: all deleted. In one day of reviewing agent-written PRs he deleted or cut every comment he saw. None survived as written. IDE hover is not a reason to keep one.

What survives: a constraint the code cannot show. A platform behavior, a rejected alternative, a hazard, a ticket link. A borderline one that survives: `// Load the row before the tx, or its mutations aren't change-tracked.` The code shows the order. Only the comment says why the order matters. A comment on code that looks wrong on purpose also survives, because deleting it invites the next reader to "fix" the code.

Shape: one plain sentence with a subject, stating the reason with "because" where there is one. Two sentences is the ceiling. If it needs three, the code needs a named helper or the paragraph belongs in the ticket. `//` by default, however many lines the two sentences wrap to. `/** */` only for JSDoc on a public API where hover documentation is worth having, and it still obeys the two-sentence cap. Lines fit in 100 columns including the `//` and indentation. Hazards take the conditional: "a yield here would let a later frame publish first", not "lets".

A fragment is fine when it names the declaration or statement right below it, as in "Zero or one entries." above a method that returns a list. One that leaves out an action the code doesn't show is not, as in "Read on every call." above an `isRequired()` method that reads a cutoff. A fragment that opens with What, Which, Whether or How fails even over its declaration. Rewrite "Whether the last fetch failed." as "True when the last fetch failed."

A comment states a reason you know. If the draft doesn't say why (why `extends Error` and not the repo's helper, why this constant), don't invent one. Leave a review question for the author instead.

Matching an existing comment exempts nothing. A comment copied from a sibling file, or kept for consistency with one, gets the deletion test and this recipe like any other. The sibling may never have been reviewed.

His rewrite of a seven-line agent JSDoc, wrapped to the column limit:

```ts
// We need both IDs because one event may be visible on two connected calendars and have
// different display properties.
```

### PR title

`type: Capitalized summary [ABC-XXXX]`. Ticket tag last, no period, no scope. Types in use: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `perf`. Identifiers may sit in backticks. `fix: Ask for the newest page when catch-up runs out of cursors [ABC-3106]`.

### PR description

First line `[Ticket system]: <url>` (the 2024 exemplars say `Ref`/`Closes`, the old template). Then one paragraph of one to four sentences. First, what changed: a present-tense verb naming the diff (Adds, Fixes, Removes, Cleans up, Renames, Moves) and something the title didn't say, usually the symptom. Second, what broke or why, in one sentence, two if one can't name the trigger. Last, anything you skipped or left for later. Link the Slack thread or PR that motivated the change instead of retelling it. If you only have a doc's name, name it and don't invent a URL. A regression names its cause: "Regression from #1234." A debugging narrative with logs and hypotheses is the one case that runs longer, and only when you actually investigated and want the dead ends on record. Figures that came from a script or a sweep are rounded or attributed ("According to AI analysis, ..."), never stated as if he counted them himself.

`## AI Slop Details` exists only when a reviewer can't get it from the diff: a decision, a tradeoff, a thing tried that failed, the mechanism if it truly needs spelling out. One-line bullets. One decision that fits in a sentence goes in the paragraph instead. Two or more, or one that needs identifiers listed, get the section. Nothing substantive means no section. The heading is deliberate: he renamed the template's `## Details` to mark an agent-expanded section so reviewers know to skim it, and he uses it under his own byline. When you write or expand the section, use that heading. A `## Details` a human already wrote keeps its heading. Authorship unknown means assume agent-drafted. The shape:

> ## AI Slop Details
>
> - Clamped in the scan and left `itemAt` throwing, because callers passing a live index should still blow up on a bad one.
> - `_recenterOnMessage` already try/catches its own `itemAt` call for the same stale range.

Test Plan is checkboxes only. Either the template's line alone, `- [x] Mark this box if automated tests would suffice for the test plan (preferred)`, or the manual steps actually performed, each a command or one sentence. Manual steps stand alone when there are no automated tests to speak of. A manual check narrated in the paragraph is the Test Plan. Move it there as a checkbox and drop the template line. Never list CI checks as a step, because CI is always required and always runs. No prose, no test file paths, no pass counts. Nothing checked that wasn't done.

A pure move or rename gets one paragraph ("pure relocation", what moved where, one-phrase why) and the Test Plan. Never: "Stacked on top of #N", a generated-with footer, hard-wrapped paragraphs, a bullet per file changed, a restatement of the title.

A whole real body (old `Ref` form):

> Ref https://tracker.example.com/ABC-106
> Attempting to pin postgres 16.4 was unsuccessful, [attempt 1](...) and [attempt 2](...). It seems like 16.4 was pulled from apt repos for unclear reasons. Rather than fuss with that question, right now we're just defaulting to a generic latest install of v16. It seems prod for right now is on PG 16.4 as latest, but it's unlikely we'll run into this minor version difference as a problem for right now. Simpler is better.
>
> ## Test Plan
>
> - [x] Mark this box if automated tests would suffice for the test plan

Note "Rather than fuss with that question": a named alternative he actually weighed, stated once, is fine. The ban is on contrast as the default sentence rhythm.

### Commit message

Subject in the PR title form. Body optional. When present it is the PR description without the template headings.

### Review comment

One line is the default. Forms he uses:

- A suggestion as a question with the fix in it: "Could simplify to `if (any(...))`?", "Maybe `getAccessForAccountId`?"
- A defect as an imperative: "delete comment", "use `createErrorClass` helper.", "Needs a linear", "Add some tests? Hopefully should just take a couple minutes."
- A heuristic plus the fix: "3+ boolean chains are always sus. Group them into a higher-level concept, e.g. `invoice.needsApproval`."
- A bare link to STANDARDS.md or the testing guide when the rule is written down. Current base: `https://github.com/owner/repo/blob/main/STANDARDS.md#` plus the anchor. The ones he reaches for most are `favor-evaluation-of-expressions-over-control-flow-and-let-reassignment`, `explain-why-not-what`, `explain-the-system-once-in-the-place-that-owns-it`, `dont-reference-the-old-way-of-doing-things-in-comments`. Testing rules: `docs/testingStyleGuide.md`.
- Prefixes: `nit`, `IMO`, `fwiw`, `btw`, `JW:`, `[Out of scope to this PR]`, `cc @person`.
- Outside GitHub, present a batch as the quoted line or `path:line`, then the comment, in file order.
- Room for pushback when he is unsure, and only then: "I don't have a strong opinion here.", "I could be convinced...", "I'll leave it to you to decide though."
- Praise short and specific: "this is such a tidy test! Nice."

Never a paragraph restating the code, a lecture, or a softening preamble ("Great work here, one small thought...").

### Design doc, ticket, wiki page

Introduction (what this is, what it isn't) → Summary bullets → Background or Problem → options with pros and cons, in a table with 🟢🟡🔴 if there is a rating → Conclusion as numbered takeaways → Further reading as raw links. Opinions in the first person. "Andrew" in the third person is fine in a shared doc. Bullets with a bold lead-in phrase: "**Batching requests.** If we fire off 5 requests in parallel, they'll get bundled...". ❌/✅ code pairs. One line per paragraph, never hard-wrapped, so it pastes into a wiki.

### Slack or PR conversation

One to three sentences. Casual lowercase is fine. Don't fake typos or profanity. Those are his to make.

## Calibration

The register that ships under his name in agent-written PRs today, and that he deletes in review: "It claims nothing on its own: it either reaches back into the messages the segment holds, in which case the merge proves continuity against data the server just returned, or it lands apart and the gap is drawn while the conversation follows the newest messages again." If a draft could sit next to that sentence, start over. His version of an idea that size is one line in the comments recipe above.
