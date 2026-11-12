---
name: unit-testing
description: Write and review unit tests for Gather V2. Use when writing tests, reviewing test code, debugging test failures, or asking about testing patterns.
---

# Unit Testing for Gather V2

If `repo.md` sits next to this file, or `.claude/eng/unit-testing/repo.md` exists in this repo, read it first. It holds this repo's commands and conventions. Where it conflicts with this skill, follow it.

This skill mirrors the catalog of **Principles → Rules** from [testingStyleGuide.md](testingStyleGuide.md). The one-liners below are the full catalog — nothing has been omitted. If a rule's intent is unclear from the one-liner, or you need the rationale/examples/exceptions, **Read the corresponding section of `testingStyleGuide.md`** before applying it.

Apply these when writing or modifying any test in this repo, not just when the user mentions tests.

## Principles (why we care)

Hold these in mind when writing or reviewing tests; they motivate every rule below.

- **Favor social (Detroit-style) unit tests over isolated** — Mock only at the boundary: network calls (DB excluded — DB is social), I/O, 3rd party wrappers, observability code, and code that's prohibitively hard to run. Everything else runs socially. Test behavior, not implementation. Don't test everything in downstream units. Only test the edge cases the SUT introduces. For a collaborator, one test that the wiring works is enough, and its edge cases are tested in its own file.
- **Aim for "mostly useful" tests** — Be pragmatic. Ask "is this substantially increasing my confidence the code works?" Don't chase every edge case — focus on behavior that matters.
- **Don't restructure production code purely for test convenience** — Constructor injection is the default for real seams (a collaborator with more than one legitimate implementation). It's not a license to add a parameter because it shortens a test: every injected dependency is setup all callers must supply. One implementation forever? Default it (`= EmailService.getInstance()`) or test socially through the real thing. Same for exporting a function, widening `private` to `public`, or adding an `options` bag only a test uses.

## Rules (concrete patterns)

Sections mirror `testingStyleGuide.md` headings exactly.

### General

- **Mirror test files to implementation files** — `parser.ts` → `__tests__/parser.test.ts`. Use a `describe` for scenarios, never name the file after the scenario.
- **Pair implementation with tests in PRs** — Don't split tests into a follow-up.
- **Follow the `Arrange - Act - Assert` pattern** — Separate with blank lines. Optional `// arrange` / `// act` / `// assert` comments.
- **Front-load common setup into `beforeEach`** — If most tests share the same arrangement, do it in `beforeEach`. A helper called by every test belongs in `beforeEach` too.
- **Be less DRY for primitive values repeated once** — Inline `1, "foo", false`. DRY complex objects via factories.
- **Write declarative test helpers** — `mockTime("2021-12-01", "10:00")` over `jest.spyOn(Date, "now")...`.
- **Avoid `if`s in your tests** — No branching or type-narrowing `if`s. Split into separate tests, or use `just()` for type narrowing.
- **Avoid loops in your tests** — Use `it.each` for parameterized tests. If a `for` loop is truly needed, justify it.
- **Avoid root-level `describe` wrappers** — Jest already shows the file name. Use bare `it`, or `describe("#methodName", ...)` to group distinct sections.
- **Use declarative phrasing for `it` blocks** — `it("creates a transaction with a unique id")`, not `it("should create...")` or `it("transaction creation")`.
- **Make the "expected change" obvious in the code** — Assert on the changed field, not the whole object.
- **Use `testId()` for UUIDs in tests** — Never `uuid()`. `testId("r1")` is deterministic; `testId()` is fresh-random. All results are stamped with the `aaaaaaaa-` prefix for readable failure output. Production code keeps using `uuid()` (lint-enforced).
- **Wrap 3rd party dependencies** — Mock your wrapper (`src/services/google`), not the raw lib (`@google/api`).
- **Be judicious about "pre-checks"** — Don't `expect` initial state before the Act. If the distinction matters, write a separate test.
- **Do not produce logs in your tests** — Zero console output is enforced (`jest-fail-on-console` + `verifyNoConsoleOutput`); a test run that prints anything fails. Use `silenceLoggerErrors("message")` / `silenceLoggerWarnings("message")` for expected log output, paired with `setUpErrorSilencing()` at the top of the file. The silencing system asserts EXACTLY the declared messages were logged — no more, no fewer.
- **Don't test impossible states** — Don't write tests for inputs that the type system already prevents (passing `123` where the type is `string`, checking "malformed" data that can't arrive through the real code path). Focus on states that actually occur in production. This gives "a software tester walks into a bar" energy — it wastes time checking cases that don't matter, making the tests harder to read with no added confidence in the code.
- **Don't test framework plumbing** — Don't test that lifecycle hooks or framework methods don't trigger side effects. Test your code's behavior, not the framework's invariants.
- **Don't test self-evident config** — Don't assert the value of a static config property or constant one-liner override (`enablePermissions = false`). That restates the code. Reserve tests for behavior: branching, computation, or integration. Exception: values with non-obvious downstream consequences that a reader couldn't predict from the assignment alone.
- **Be sparing with comments** — If a test needs a clarifying comment, the test is set up wrong. Rename the `it`, extract a helper, simplify the arrangement, or split.
- **Never comment above a test case** — No comment between the previous test and an `it`/`describe`. It restates the behavior in prose and drifts. The `it` name states the behavior, the arrangement shows the nuance. Rationale for _why_ the behavior exists belongs next to the production code that defines it, not in the spec file.

### Configuration

- **Do not spread from other environments** — Don't `{ ...devConfig }` (may pull in real API keys). Use a shared `baseConfig` without secrets.

### Test factories

- **Use them instead of incomplete data fakes** — `factories.user.build({ name: "Andrew" })`, not `{ name: "Andrew" } as User`.
- **Let the library handle merging in `params`** — Don't manually do `params.width || 10` — return the default and let Fishery merge.
- **Reserve `create` for factories that persist to a DB** — `build()` is in-memory, `create()` is async + persists. Never see `factories.x.create()` in `gather-browser` tests.
- **Provide realistic values** — `"http://test.url.com/"`, not `"foo"`, for URL fields.
- **Unique-ify factory values where useful** — Connect names/labels to the id or sequence so they're useful in failure output.
- **Watch out for `id` when unique-ifying your values** — Derive unique fields from `params.id ?? sequence.toString()` so id and name stay aligned.
- **Only override factory values that matter for the test** — Extra overrides are noise that obscures the test intent.
- **Pre-bind repeated factory params into a reusable preset** — When the same transient/params are passed to a factory in multiple places, create a preset with `.transient()` or `.params()` and reuse it.
- **Set up and use factories to create implicit parent models** — `factories.desk.create()` should auto-create the room, office, workspace. Don't manually chain.

### Database interactions

- **Use the database socially** — Don't mock DB modules. Use factories that persist.
- **Encapsulate setup** — `createWorkspaceWithAdminUser()` over manually chaining `factories.workspace.create` + `factories.user.create` + `setAdminPrivileges`.
- **Interact with repos socially** — Never fake the `Repos` object or `jest.mock` a specific repo; stand up real repos via the module's harness. Browser/mobile: `await TestSetupHarness.createAndEnterSpaceAsNewUser()`. game-logic: `new GameLogicTestDriver(sharedGameLogic)` + `driver.factories` / `driver.state`. http-server: real `withHSRepos(...)` + `factories.*.create()`, never stub `withHSRepos`.

### Mocking

- **Avoid partial mocks** — Don't `jest.mock("module", () => ({ ...jest.requireActual("module"), fn: jest.fn() }))`. Extract the mockable functions to a separate module.
- **Use `jest.replaceProperty` to control exported constants** — To flip an exported constant/config flag/property, `jest.replaceProperty(mod, "MAX_RETRIES", 1)` (auto-restored when `restoreMocks` is on, as in our base config), not a partial mock with a getter over a mutable variable. Works on an object (`process.env`, a config object) and on a module mocked via `jest.mock("<module>")` with no factory or with an inline one; against a module's real exports — or a `__mocks__` file outside `gather-mobile` — it throws `Property X is not declared configurable`. For a module with a `__mocks__` file, group the constants into one exported object (`SWEEP_LIMITS`-style) and replace a property on that, or put a per-test value behind a `jest.fn()` in the mock. See [Jest replaced properties](https://jestjs.io/docs/mock-function-api#replaced-properties).
- **Put `jest.mock` statements at the top after imports** — They're hoisted anyway. Don't nest in `describe`.
- **Refer to spied methods directly** — `expect(console.log)`, not `expect(spy)`.
- **Move complicated mocks into mock files** — More than one level of nesting belongs in `__mocks__/`.
- **When there isn't a mock file, provide an inline mock** — Makes it explicit which exports are mocked.
- **Use `mockReturnValue` for simple values** — Not `mockImplementation(() => 42)`.
- **Use `when()` for simple "if this then that" mock behavior** — From `jest-when`. More declarative than `mockImplementation` with `if` chains.
- **Only mock what is necessary and provide mock values that are used** — Unnecessary mocks punch holes in social coverage.
- **Avoid importing directly from `__mocks__` files** — Creates a separate allocation. Use `jest.mock()` and reference the original module.
- **Use `testSetup.js` to mock out modules that always need to be mocked** — Don't force every test author to discover a module needs mocking.
- **Use `beforeEach` for timer mocks setup** — `jest.useFakeTimers()` is global. Set in `beforeEach`, override per-test with `jest.useRealTimers()`.
- **Avoid mocking at arbitrary layers** — Given `foo -> bar -> baz -> httpCall`, mock `httpCall`'s module, not `baz`.
- **Keep the SUT free of mocks** — Never mock the module under test.
- **No need to manually clear or restore mocks** — Only when the Jest config sets `clearMocks: true` and `restoreMocks: true`, as our `jest.config.base.js` does. Check first, because Jest defaults both to `false`. With them on, never write `jest.clearAllMocks()` / `jest.restoreAllMocks()` / `jest.resetAllMocks()` in `beforeEach` / `afterEach`. Remove `beforeEach` blocks that exist only for mock cleanup.
- **No need to manually destroy `Repos` between tests** — a central `afterEach` in `gather-browser/testSetup.js` (mobile included) destroys every started repo in the `Repos` collection after each harness-initialized case. In those modules, never write `afterEach(() => Repos.x.destroy())` or `Repos.reset()` cleanup. Without a central teardown like it, keep each test's own. Standalone `new SomeRepo()` instances and non-repo objects (presenters, services) still need their own cleanup.
- **Never use `Reflect` or casts to access private state** — If you need to read/write private fields or call private methods in a test, that's a signal to test through the public API or restructure for testability. `Reflect.get`, `Reflect.set`, and casts to access private members should be extremely rare — if truly unavoidable, encapsulate in a well-named helper, comment why, and flag for human review.
- **Don't manually override methods on the SUT** — Replacing methods with `obj.method = () => ...` or `Reflect.set(obj, "method", ...)` is fragile and tends to make the test tautological. Set up real system state through public APIs, or use proper DI/mocking at boundaries.
- **Don't manually override methods on collaborators** — Directly replacing methods on collaborator objects signals testing implementation details. If you must override, use `jest.spyOn` — it restores automatically when `restoreMocks` is on, and makes the override visible in test output.
- **Avoid brittle one-off type casts** — Don't cast to ad-hoc inline type literals that duplicate a slice of an existing type (e.g., `as unknown as { user: { id: string; email: string } }`). These drift silently when the real type changes and obscure what the test is doing. Use the real type, narrow it, or restructure so the cast isn't needed.
- **Avoid mocking `console.log`** — Swallows debug output when you need it most. Mock `Logger` (or use `silenceLogger*`) instead. Never mock `Logger` wholesale — use `silenceLoggerErrors("specific message")` so unexpected errors still surface.

### Error checking

- **Be specific for `.toThrow` and not specific for `.not.toThrow`** — `.toThrow("message")` for positive checks (bare `.toThrow()` catches unrelated errors). `.not.toThrow()` without a message (a message would pass even if a different error fires).
- **Prefer strings over regexes for `.toThrow`** — `.toThrow("foo")` does substring match. Regex only when you need pattern features (`/foo.*bar/`).
- **Avoid `try/catch` in test cases to check for errors** — Use `.toThrow` or `await expect(fn()).rejects.toThrow("message")`.

### Assertions

- **Await the result, don't use `.resolves`** — Use `const res = await fn()` then `expect(res).toEqual(...)` instead of `await expect(fn()).resolves.toEqual(...)`. Easier to read and debug.
- **`toEqual` instead of `toBe`, usually** — Reserve `toBe` for referential identity checks only. Lint-enforced for primitives.
- **Avoid basic syntactic sugar matchers** — Use `toEqual(true)`, not `toBeTruthy()`. Avoid: `toBeNull`, `toBeUndefined`, `toBeNaN`, `toBeFalse`, `toBeTrue`, `toBeFalsey`, `toBeTruthy`, `toHaveProperty`. Lint-enforced.
- **Assert element presence explicitly in RTL tests** — Don't use a bare `getByText("foo")` as an assertion, or `expect(getByText("foo").props.children).toEqual("foo")` (redundant + brittle). Use a presence matcher: `expect(getByText("foo")).toBeInTheDocument()` (web) / `.toBeOnTheScreen()` (mobile). For absence, `expect(queryByText("foo")).not.toBeInTheDocument()` / `.not.toBeOnTheScreen()`.
- **Keep `expect(...).toWhatever` on one line** — Pull complex actuals into a `const` above. Trivial actuals can stay inline.
- **Inline expected values** — Don't `const expected = [...]` then `expect(x).toEqual(expected)`. Put the value right in the `toEqual`.
- **Test one thing, but be pragmatic about it** — Multiple `expect`s per test are fine when they're focused on one behavior.
- **Don't combine assertions into an arbitrary tuple** — No `expect([a, b]).toEqual([x, y])` to save a line. One `expect` per value, so the failure names what moved.
- **Avoid redundant examples within a test** — One representative case per invariant; two at most. Three+ identical-path examples is noise. Different branches → split into separate tests; >3 cases → `it.each`.
- **Use `pluck` to pull out a slice of data from an array for assertions** — `expect(pluck("name", users)).toEqual(["Andrew", "Billy"])` instead of indexing.
- **Never `toHaveLength` + index into elements** — Assert the full array directly: `expect(results).toEqual([{...}])`.
- **Be explicit about empty things** — `expect(arr).toEqual([])`, not `toHaveLength(0)`.
- **Avoid snapshot testing except in restricted cases** — Allowed: `toThrowInlineSnapshot` for error messages; large generated output (e.g. codemod tests). Never file-based snapshots.
- **Avoid testing log statements** — Test behavior. Exceptions: log is the only observable output, log content has business logic, or the SUT is a CLI command where the log is the user-facing output.
- **Avoid testing metrics** — Metrics are mocked at the boundary, so asserting on the mock just restates the production line that called it. Exceptions: the metric drives product behavior, or the emission has real logic worth covering.
- **Avoid testing basic setters and getters** — If `createSetterFor` is already tested, don't re-test it socially.
- **Use `toEqual` for up to 2 prop assertions, `toMatchObject` otherwise** — 2 props → individual `toEqual`s. 3+ props → `obj.toMatchObject({...})`.
- **Use `.toIncludeSameMembers` for order-agnostic array comparisons** — More expressive than `expect.arrayContaining`.
- **Use concrete, non-dynamic expected values** — Hard-code expected values. Don't derive them from another function call.

## How to use this catalog

1. When writing or reviewing tests, scan the catalog for rules that apply to your change.
2. If a rule's one-liner is enough, apply it.
3. If you're unsure whether a rule fires in a specific case, or need examples / exceptions, **Read the matching section of `testingStyleGuide.md`** (the headings match these titles exactly).
4. Many rules have documented exceptions (3rd-party interop, performance code, CLI logs) — check the full section before ignoring a rule.

If a test would violate any rule, either fix it to comply, or make the exception explicit with a justifying comment near the violation.
