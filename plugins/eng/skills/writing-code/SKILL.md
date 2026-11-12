---
name: writing-code
description: Apply Gather V2 coding standards (STANDARDS.md) when writing or modifying code. Use when writing new code, refactoring, or reviewing code for standards compliance.
---

# Writing Code for Gather V2

If `repo.md` sits next to this file, or `.claude/eng/writing-code/repo.md` exists in this repo, read it first. It holds this repo's commands and conventions. Where it conflicts with this skill, follow it.

This skill mirrors the catalog of **Principles → Strategies → Rules** from [STANDARDS.md](STANDARDS.md). The one-liners below are the full catalog — nothing has been omitted. If a rule's intent is unclear from the one-liner, or you need the rationale/examples/exceptions, **Read the corresponding section of `STANDARDS.md`** before applying it.

Apply these when writing or modifying any code in this repo, not just when the user mentions standards.

## Architecture building blocks

Read [v2ArchitectureBuildingBlocks.md](v2ArchitectureBuildingBlocks.md) before writing or reviewing code that adds or changes a model, value object, repo, service or presenter.

## Principles (why we care)

Hold these in mind when making tradeoffs; they motivate every strategy and rule below.

- **Keep a product mindset** — Engineering work is in service of shipping a high-quality product. Bias for speed, scrappiness, and "build the right thing" over "build the thing right".
- **Optimize for sustainable team velocity** — Design for the team, not the author. Short-term speed that slows the team down long-term is a loss.
- **Keep the kitchen clean** — Pay down tech debt; every feature carries maintenance load. Don't bolt new functionality onto poorly structured systems.
- **Design for change** — Maximize code flexibility via encapsulation and abstractions; assume requirements will change.
- **Make time for Continuous Improvement (Kaizen)** — When something is broken, fix it. Grow your craft continuously.

## Strategies (mindsets that achieve the principles)

### Under "Keep a product mindset"

- **Ask for design feedback early** — RFC / Slack / sync before landing a team-wide abstraction.
- **Be scrappy** — Pivot fast from unnecessary complexity; seek the simplest path to what matters. Drop edge cases with no product value.
- **Optimize after measuring** — Default to readable code; optimize only when evidence shows it's needed (hot paths, rendering engine, huge datasets).
- **Don't trust the client** — Sanitize and validate all client input on both frontend and backend.

### Under "Optimize for sustainable team velocity"

- **Write automated tests following the Gather Testing Style Guide** — Manual tests don't protect the next person. See the `unit-testing` skill.
- **Readability over cleverness/conciseness** — Code is read many times, written once. Prefer verbose/explicit over concise/implicit; avoid abbreviations.
- **Favor declarative programming over imperative** — Use `map`/`filter`/`reduce`/`forEach` over `for` loops; lean on Ramda. Exception: extremely performant code.
- **Favor evaluation of expressions over control flow and `let` reassignment** — `const foo = ...` with a ternary or helper, not `let foo` followed by an `if` block.
- **DRY, WET, and the cost of the wrong abstraction** — Balance both. The wrong abstraction is more expensive than duplication; don't abstract prematurely.

### Under "Keep the kitchen clean"

- **Limit the spread and blast radius of hacks** — Label them as workarounds in code (`Workaround` in the name, never "hack" or "patch"), keep at the leaves, isolate via abstraction, and attach `[EXPIRE BY YYYY-MM-DD]`.
- **Avoid unnecessary control flow branches** — Deduplicate the two arms of an `if` by lifting shared work out.
- **Make implicit assumptions explicit** — Shared constants/assumptions across modules live in a shared location, not duplicated.

### Under "Design for change"

- **Aim for high cohesion, low coupling** — Related code stays together; modules depend on few others and hide their internals. No "utils junk drawers".
- **Create data abstractions and avoid primitive obsession** — Use richer objects (`PhoneNumber`, `Inventory`) when behavior is associated; avoid spraying primitives across the codebase.
- **Tell, Don't Ask** — Encapsulate behavior on the object (`user.isAdult()`, `user.addRole()`), don't reach in for raw data and act externally.
- **Refactor procedural code to OO/FP when complexity grows** — Once you have >8 execution paths, invest in OOP or FP abstractions.
- **Don't talk to strangers (Law of Demeter)** — Don't chain through intermediaries (`customer.bike.wheels[0].tire.patch()`); pass messages through adjacent objects.
- **Favor OOP over FP** — Classes are the unit of organization (fits DDD); borrow FP concepts liberally. When exported functions cluster around one shared type, make the type a class and the functions its methods; give the orchestrator a noun-named service class with constructor-injected collaborators.

### Under "Make time for Continuous Improvement"

- **When something is jank, fix it** — Devote ~10% of feature time to refactoring. Use stacked PRs to keep focus.
- **Learn and practice something new each week** — Grow engineering craft intentionally.

## Rules (concrete code patterns)

- **Extract magic numbers** — Name them at the top of the file; enables later configuration.
- **Avoid hidden side effects / give descriptive function names** — Surface the full behavior in the name (`getUserAndSubscribeToNewsletter`).
- **No side effects at module import time** — Importing a module must only define things: no top-level `initializeX()`, timers, transport registration, connections, or global mutation. The import graph decides when it runs (so an unrelated import can change it), nobody can opt out (tests must `jest.mock` a module they don't care about), and it's invisible at the callsite. Export an initializer and call it from whatever owns startup. Keep expensive-but-lazy work behind first use (`static getInstance = lazily(() => ...)`). Narrow exceptions: polyfill/instrumentation shims in a dedicated first-imported file, and framework files where importing _is_ the registration mechanism.
- **Don't arbitrarily `return` in the middle** — Returns belong at the top (guard clauses) or the end. Restructure or extract functions instead.
- **Avoid deep nesting** — >2 levels of `if` blocks is a refactor signal; use guard clauses or extract helpers.
- **Filter before iterating instead of guard-returning in the callback** — `arr.filter(isNotNil).forEach(...)` (from `fpHelpers`), not `if (!x) return` inside the callback; declares the processed population up front and narrows types. Exception: hot paths, where the intermediate array allocation matters.
- **Write small functions / methods (< 20 lines)** — One function, one thing. When splitting, orient toward DDD: the extracted behavior lands on the model/value object/repo/service/presenter that owns it (see `v2ArchitectureBuildingBlocks.md`), never a random utils file.
- **Write small classes / files (typically < 100 lines, definitely < 500)** — Large files indicate low cohesion. When splitting, the pieces go to the architecture building block that owns them (see `v2ArchitectureBuildingBlocks.md`), not a grab-bag helpers module.
- **Favor private methods over non-exported functions beside a class** — A helper used only by the class in the file belongs on it as a `private` method: it gets `this` instead of re-threading the class's state as parameters, and the class describes all of its own behavior. Module scope is for functions genuinely independent of the class. Two exceptions stay outside: a helper that would otherwise be a `static` on a `@ga.observableClass` (the decorator staleness rule), and a helper shared by two classes in the file (usually a signal to split it). Never move a private method out just so a test can call it.
- **Wrap your 3rd party code** — Put vendor APIs (Google Calendar, LiveKit) behind a class/module we control. Exception: foundational libs like ramda/phaser/react.
- **Write code that survives when data structures gain new fields** — Use dynamic merging (`{ ...defaults, ...params }`) instead of spelling out each field.
- **Use ternary or `doIt` instead of `let` reassignment for conditional variable assignment** — `const foo = cond ? "v1" : "v2"` or `const foo = doIt(() => { ... })`.
- **Encapsulate conditionals** — Name the predicate (`timerHasExpired(timer)`, `timer.shouldBeDeleted()`) instead of inlining complex boolean logic. When 2-3+ boolean checks travel together, that compound is a domain concept: put the predicate on the model (or other domain construct) that owns the state being read, not in a random utils file.
- **Avoid double negatives** — Never negate a negatively-named predicate (`!isNotEmpty(users)`); use the positive pair (`isEmpty(users)`) — `fpHelpers` predicates come in pairs for this. Name your own booleans in the positive direction (`isEnabled`, not `isDisabled`).
- **Use long names for long scopes** — `fields` is fine in a 3-line helper; in a 20-line function it becomes `updateRoomFieldsFromUser`.
- **Don't name things after their structural role** — `Wrap`/`Wrapper`/`Helper`/`Util`/`Delegate`/`Base`/`Impl` name a slot in the plumbing, not the thing in it. Most common case: an interface plus one concrete impl named after the interface (`DeferrableWrap implements Deferrable`) — name it for what makes it distinct instead (`DeferrableAbortSignal`: mechanism, strategy, or source). Wrote this code and ended up with only one impl? Delete the interface — but not one that was already there, and not one whose second impl you're partway through writing. Applies to params/fields too (`delegate` → `spanProcessor`). Exception: `Wrap your 3rd party code`, and even there prefer the capability (`Calendar`) over the mechanic (`GoogleCalendarWrapper`).
- **Descend only one level of abstraction in functions/methods** — All statements in a function operate at one level; drop down by delegating to another function.
- **Avoid pass-through anonymous functions** — `subscribe("x", (e) => handleEvent(e))` → `subscribe("x", handleEvent)` when signatures match. (See the "extra callback arguments" rule for when wrapping IS correct.)
- **Avoid implicitly accepting extra callback arguments** — `forEach` passes `(el, idx, arr)`; bugs like `["0","1","2"].map(parseInt)` come from callbacks binding extras. Wrap explicitly or use Ramda's `forEach`/`map`.
- **Do not pass methods as arguments** — `this` context breaks; use `(x) => this.doSomething(x)` instead of `this.doSomething`.
- **Don't add defensive guards for states the type system prevents** — If a value is typed as `string`, don't check `typeof x !== "string"`. When TS doesn't know the type but you effectively do, use a cast rather than a chain of runtime guards. Excessive guards bloat code 2-3x and obscure the actual logic. Guard at system boundaries only (user input, external APIs, untyped payloads).
- **Use a null object instead of guarding an absent collaborator** — A collaborator that only exists in some environments shouldn't be `X | undefined` with an `if` guard in every method. Give the type a second implementation whose methods do nothing (`DiscardingDraftStore`), pick between them once where it's constructed, and doc-comment what the emptiness means for the product. Not for cases where callers must genuinely behave differently, or where the absence is a misconfiguration that should fail loudly.
- **Make switch statements exhaustive with `assertUnreachable`** — Switching over a union/enum? End it with `default: return assertUnreachable(x)` (from `gather-common/dist/src/utils`) so adding a new variant fails the build until handled. Don't use `default` as a real fallback for un-enumerated cases — it silently swallows new variants. Exception: input that isn't a closed set (raw external strings), where a real `default` is correct and commented.
- **Prefer `as const` objects over TS enums and string-literal unions** — For a fixed set of named values, use `export const Foo = {...} as const satisfies Record<string, string>` plus `export type Foo = (typeof Foo)[keyof typeof Foo]`, not a TS `enum` or a bare `type Foo = "A" | "B"` union. Enums are nominal (plain string literals from APIs/DBs need a cast to match) and compile to a non-tree-shakeable runtime object; string-literal unions have no runtime presence, so members aren't referenceable by name. `as const` objects are structurally typed and give you both. Use `satisfies`, not a `: Record<string, string>` annotation, or indexed access widens to `string | undefined`. Default to matching PascalCase keys and values (`{ Foo: "Foo" }`, not `{ Foo: "foo" }`) so name and wire value are one string — use a different value shape only when something external dictates it. Derive lists with `Object.values(Foo)` instead of a hand-maintained array that drifts.
- **Favor `DateTimeExt` over JS `Date` objects** — Use `DateTimeExt` (`gather-common/dist/src/valueObjects/DateTimeExt`, wraps Luxon) for date construction, arithmetic, comparison, and formatting; `Date` is mutable with zero-indexed months and hand-rolled millisecond math. Convert at `Date`-speaking boundaries (Prisma, v1 interop, 3rd party APIs) with `DateTimeExt.fromJSDate(...)` / `.toJSDate()`.
- **Include the unit in numeric time names** — `durationMs`, `timeoutSeconds`, `delayMinutes`, not a bare `duration`; or type it as a Luxon `Duration`. A unit mismatch fails silently, off by a factor of 1k or 60k. Option keys a library defines keep its names.
- **Use `switchEnv` for environment-dependent values** — `switchEnv` (`gather-env-config/dist/src/env`) takes one entry per `Env` member, so the compiler forces a decision for every environment; an `isLocal()`/`isTest()` boolean chain silently dumps forgotten environments into the final `else`. Pass thunks when a branch is expensive or has side effects. Don't spread defaults over the entries or compute the object — that defeats the exhaustiveness.
- **Respect abstraction layer boundaries** — Framework/infrastructure code must not know about domain models. If a framework class starts referencing specific domain concepts (Firebase auth, Member, Workspace), that's a design violation. Inject domain-specific behavior as a dependency, use a callback, or find a different way to solve the problem.
- **Favor strong type safety and justify exceptions** — Avoid `any` and broad casting. When unavoidable, isolate in a named helper with a justifying comment.
- **Prefer type casts over `@ts-expect-error`** — `foo as any` scopes the escape to one expression; `@ts-expect-error` can mask import/syntax errors.
- **Avoid promise chains (`.then`/`.catch`) in favor of `async`/`await`** — Exception: `fireAndForget(somePromise.then(...))`. Watch for MobX action boundaries.
- **Avoid `await foo().catch(...)`; use `try`/`catch` or `tryCatchAsync`** — Don't attach `.catch()` to an awaited promise (whether the result is discarded or stored). Use a `try`/`catch` block, or `tryCatchAsync({ try, catch })` to keep the result in a `const`.
- **Don't use the `void` operator on promises; use `fireAndForget`** — `void somePromise()` hides intent and swallows rejections. `await`/`return` it if the result matters, else `fireAndForget(somePromise())` (from `gather-common-including-video/dist/src/promises`) to make the fire-and-forget explicit and log errors.
- **Top-down vertical ordering of function dependencies** — Group related helpers together; order functions in call-stack order, caller above callee.
- **Use only the necessary number of parameters, fewer is better** — 0–2 ideal. >3 is a smell — bundle into a data structure (`DateRange`, pass the whole object).
- **Keep log messages stable; put variable data in attributes** — Log aggregation (errors inbox, spike/new-error alerts) groups by the message string. Don't interpolate IDs/timestamps/URLs into `Logger.warn`/`Logger.error` messages; pass them via `logContext`/`logErrorContext` (backend) or `buildErrorContext` (frontend). A bare object isn't picked up as structured fields — the logger passes it through `util.format` and inlines it into the message, fragmenting error grouping.
- **Be judicious about logging PII; never log secrets** — Logs ship to a third-party vendor and are retained. Prefer IDs (user/workspace/room) over PII. Absolute bar: no auth tokens, API keys, session cookies, `Authorization`/`Set-Cookie` values, or full URLs with query strings. For payloads embedding user-generated content (chat, event titles, locations), redact first — see `redactedStringForPatches` in `gather-game-persistence/src/db/DbPatch.ts`.
- **Route observability through the gather-opentelemetry bridge** — All vendor telemetry goes through the `gather-opentelemetry` bridge; never import the vendor's agent or browser SDK directly. Client page actions/metrics: the shared manager from `gather-opentelemetry/bridge/rum-registry`. Backend APM/custom events: `gather-opentelemetry/bridge/apm`. Enforced by `no-restricted-imports` + `no-restricted-syntax` (blocks `require()`/dynamic `import()` too); the sole exception is the sanctioned server APM bootstrap. Declare the signal in the Weaver registry first, with the legacy name the call passes. See the `telemetry-authoring` skill when your repo has one.
- **Don't give every entity its own reaction on shared state** — A per-entity class (desk view, member avatar, chat bubble) may react to its own entity's fields, but a reaction that also reads shared state (view mode, a setting, the current user) makes every instance re-run on each change. Watch the shared value once and update the affected instances (one reaction per shared input, or a static reaction that walks them), or derive the value; keyed lookups like `isSelected(target)` are fine. Patterns: "Reactions over many entities" in `v2ArchitectureBuildingBlocks.md`. Enforced in `gather-browser` by `@gathertown/no-shared-state-reaction-per-entity`.
- **Assign undefined instead of deleting a class field** — `this.timer = undefined`, not `delete this.timer`. Deleting a declared field moves the object into V8's slower dictionary mode, and V8 rarely moves it back. `delete` is still right for a lookup-table object (`delete this.users[id]`). Enforced by `no-restricted-syntax`.

### Comments (when and how to comment)

- **Write good comments, but write good code first** — "Don't comment bad code — rewrite it." A better name or smaller function beats an explanatory comment; a comment you can't write clearly signals convoluted code.
- **Explain why, not what** — A comment restating what the code does is clutter that goes stale. Apply the deletion test to every comment in the diff, new or inherited: delete it and re-read; if the code alone still answers every question the comment answered, keep it deleted. Structure-narrating comments (which imports are types, what fields a class has) always fail it, even when they read like design decisions.
- **Explain the system once, in the place that owns it** — Don't plant a paragraph of system context at every site that touches the system; a reader shouldn't assemble their picture of it from comments littered across files. Two tells: the same explanation appears in more than one file (belongs in neither — move it to where the behavior lives), or the comment explains what the reader could learn by opening the thing it names (say nothing; if they couldn't learn it there, fix the owner's naming/structure/doc comment instead). Canonical home, in order: the code itself, a doc comment on the owning class/module, a `docs/` page for cross-module concepts. Call sites get a link at most.
- **Put comments at the relevant line** — A doc comment covers the whole function; a fact about one statement inside it goes on the line above that statement. An implementation detail hoisted into the header makes the reader carry it past lines it doesn't apply to, and it survives after the line it describes moves or goes away.
- **Pinpoint which decisions actually need context** — Comment when there's a non-obvious business reason, significant research behind the decision, a close call between solutions, a code-review question, or a bug workaround (link the ticket).
- **Write for experienced teammates** — Assume Gather context and programming experience; don't explain language basics.
- **Link to the source** — Put links to platform docs, RFCs, adapted code, or GitHub issues in the comment, right where a reader needs them.
- **Explain code that looks wrong** — Deliberately unidiomatic code needs a comment saying so, or the next reader will "fix" it.
- **Enforce rules with code, not comments** — A "KEEP THESE IN SYNC" / "don't forget to..." comment can only plead. Derive values (`Object.values(Foo)`), classify members in an exhaustive `Record`, add a lint rule, or write a test that fails when the rule is broken.
- **Don't use section-divider comments in classes** — No `// === internals ===` / `// --- public API ---` banners; the `private`/`public` markers already say which is which. Needing sections means the class is too big — split it.
- **Don't reference the old way of doing things in comments** — Comments and test names describe the code as it is now; no "it used to...", "no longer...", or pointers at removed mechanisms. Git history records the past — explain why the current code is correct instead.
- **Don't use forbidden phrases** — "the honest truth", "smoking gun", "heads-up", "load-bearing", "belt-and-suspenders", "I'll level with you", "Clean" as a verdict ("Clean." or "Clean — ..."), and a platform comparison with no verb ("as on web") read as AI slop. "The same way as on web" and "such as on mobile" are fine. Say the plain thing or delete the sentence.
- **Clean up existing TODOs that show up in your PR diff** — Pay down debt in your diff, stacked PR if significant.
- **Attach Linear stories to TODOs** — TODOs need either an autogenerated origin or a Linear ticket reference.
- **Only tag a Linear issue that still has work in it** — A `ENG-1234` tag on a TODO, PR title, or branch means work someone still has to do. Say the reason in the code. Link a closed ticket only when the background is too deep to state in a sentence.
- **Writing a comment is an analysis tool** — If you can't articulate why the code is correct, suspect the design, not the wording.

## How to use this catalog

1. When writing or reviewing code, scan the catalog for rules that apply to your change.
2. If a rule's one-liner is enough, apply it.
3. If you're unsure whether the rule fires in a specific case, or need examples / exceptions, **Read the matching section of `STANDARDS.md`** (the headings match these titles exactly).
4. Rules have documented exceptions (performance-critical code, tests, 3rd-party interop) — check the full section before ignoring a rule.

If a code change would violate any rule, either fix it to comply, or make the exception explicit with a justifying comment near the violation.
