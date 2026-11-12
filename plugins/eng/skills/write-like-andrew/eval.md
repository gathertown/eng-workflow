# Write like Andrew eval

Run this on the finished draft before returning it. Answer each check pass or fail. Fix every fail and run the list again.

## Every artifact

1. Is every sentence's subject a person, a team, or a named thing in the code doing something it can actually do? (No code that owes, guesses, claims, settles, speaks, or keeps anything honest.) A verb-first line with the subject implied, "Fixes crash on connecting calendar", "Extends Error because...", passes.
2. Does every sentence open with the subject rather than a noun clause ("What...", "Which...", "Whether...", "How...")?
3. Is contrast absent as a sentence rhythm ("X rather than Y", "X, not Y", "the question is not X")? A real alternative he weighed, named once ("Rather than fuss with that question, we default to latest v16"), passes.
4. Is every colon a list, a label, or a quote, never a reveal?
5. Are the banned words absent: byte-for-byte, load-bearing, the honest truth, smoking gun, heads-up, belt-and-suspenders, "Clean." as a verdict, it's worth noting, at its core, platform-neutral, robust, seamless, gracefully, leverage, delve?
6. Is every adjective earning its place? (Cut it and re-read. "It is or it isn't.")
7. Are there zero ellipsis characters (`…`)? Three dots (`...`) only.
8. Is there at most one em dash per paragraph, and none in a code comment?
   8a. Are there zero semicolons outside code? Each one is two clauses to split into sentences or join with "so", "because", or "or".
   8b. Is every sentence one idea, most under 20 words and none over 30? A sentence carrying three clauses off one verb is split the same way.
   8c. Does every sentence hold at most two of "and", "so", "because", "or", and at most two commas? A third of either is a second sentence.
   8d. Are `owns`, `owner`, `lifetime`, `lives`, `dies`, and `outlives` absent, with the mechanism named instead ("destroyed when its screen unmounts")?
   8e. Is there no maxim that would be true of any codebase, and no definition wedged between commas mid-sentence?
   8f. Does every coined term appear in the codebase? Grep it. If it does not, name the symbol or describe what happens.
   8g. Does every comparison carry its verb ("as web does", "which matches web") or open the sentence ("Like web, ...")? A trailing "as on web", "like web", or "unlike X" leaves the reader to work out what it attaches to and which way it points.
9. Is there no mention of how the code used to work: no "replaces", "previously", "the old approach", "an improvement over"?
10. Are numbers, names, PR numbers, and links used where the draft had adjectives or paraphrase?
    10a. Is every number one a person would know or round off? A machine-exact tally ("1,044 strings, 209 of them") is rounded, dropped, or attributed ("According to AI analysis, ...").
11. Would a short plain word do where the draft has a concept noun ("feedback channel", "mechanism", "surface", "lifecycle")?
12. For a rewrite: is the draft shorter than the input, or the same length only because information was added?

## Code comments and JSDoc

0. In gather-town-v2, was the `writing-code` skill's "Comments" section applied first, and did any comment on deliberately unidiomatic code survive?
1. Was the deletion test run on every comment, new or inherited: delete it, re-read the code, and keep it deleted if the code answers every question?
2. Is every surviving comment one sentence, two at most?
3. Does every surviving comment say something invisible in the code: a platform behavior, a constraint, a rejected alternative, a ticket?
4. Is the reason stated ("because X") rather than described ("this is the Y for Z")?
5. Is every reason one you actually know from the code or the author, with a review question left where you don't?
6. Are hazards in the conditional mood ("a yield here would let...")?
7. Is system context explained in one owning place, with other sites carrying nothing or a pointer?
8. Are there no JSDoc blocks that restate a name or a type, no per-field JSDoc on a type, and no comments in tests explaining platform differences?
9. Do lines fit in 100 columns including `//` and indentation?

## PR descriptions and commit messages

1. Title in the form `type: Capitalized summary [ABC-XXXX]`, tag last, no period, no scope?
2. `[Ticket system]:` line first, when there is a ticket?
3. Does the first sentence state the change with a present-tense verb (Adds, Fixes, Removes, Cleans up, Renames)?
4. Is the body one paragraph of one to four sentences, with the mechanism in one sentence, unless there is a debugging narrative to report?
5. Is motivation a link (Slack thread, PR, ticket) where one exists, instead of a retelling?
6. Does a regression name the PR that caused it?
7. Is `## AI Slop Details` present only when it carries something the diff cannot show, as one-line bullets?
8. Is the Test Plan checkboxes only, with no test file paths, pass counts, or prose, nothing checked that was not actually done, and no `CI checks` step at all?
9. No "Stacked on top of #N", no generated-with footer, no hard-wrapped paragraphs, no bullet-per-file change list?

## Review comments

1. Is the default one line?
2. Is a suggestion a question with the fix in it, and a defect a direct imperative?
3. Is a written-down rule a link to STANDARDS.md or the testing guide, not a re-explanation?
4. Is uncertainty stated as his ("I don't have a strong opinion here", "I could be convinced") and only when real?
5. No praise preamble before a critique, no summary of what the code does, no closing pleasantry?

## Final read

1. Read it aloud as Andrew in a review thread or a Slack channel. Would a teammate hear him, or hear a model?
2. Would he delete any sentence of it on review? Delete it first.
