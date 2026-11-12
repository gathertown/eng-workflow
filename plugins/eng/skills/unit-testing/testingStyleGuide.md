# Gather Testing Style Guide

This document attempts to capture the "unspoken patterns" of testing at Gather. Please feel free to contribute!

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Terminology](#terminology)
- [Principles](#principles)
  - [Favor social unit tests over isolated unit tests](#favor-social-unit-tests-over-isolated-unit-tests)
    - [When to mock](#when-to-mock)
    - [How this looks in practice](#how-this-looks-in-practice)
    - [Tests should give us confidence in behavior](#tests-should-give-us-confidence-in-behavior)
    - [Don't test everything in downstream units](#dont-test-everything-in-downstream-units)
    - [Test behavior, not implementation](#test-behavior-not-implementation)
    - [Don't mix ideologies](#dont-mix-ideologies)
    - [Resources](#resources)
  - [Aim for "mostly useful" tests](#aim-for-mostly-useful-tests)
  - [Don't restructure production code purely for test convenience](#dont-restructure-production-code-purely-for-test-convenience)
- [General](#general)
  - [Mirror test files to implementation files](#mirror-test-files-to-implementation-files)
  - [Pair implementation with tests in PRs](#pair-implementation-with-tests-in-prs)
  - [Follow the `Arrange - Act - Assert` pattern](#follow-the-arrange---act---assert-pattern)
  - [Front-load common setup into `beforeEach`](#front-load-common-setup-into-beforeeach)
  - [Be less DRY for primitive values repeated once](#be-less-dry-for-primitive-values-repeated-once)
  - [Write declarative test helpers](#write-declarative-test-helpers)
  - [Avoid `if`s in your tests](#avoid-ifs-in-your-tests)
  - [Avoid loops in your tests](#avoid-loops-in-your-tests)
  - [Avoid root-level `describe` wrappers](#avoid-root-level-describe-wrappers)
  - [Use declarative phrasing for `it` blocks](#use-declarative-phrasing-for-it-blocks)
  - [Make the "expected change" obvious in the code](#make-the-expected-change-obvious-in-the-code)
  - [Use `testId()` for UUIDs in tests](#use-testid-for-uuids-in-tests)
  - [Wrap 3rd party dependencies](#wrap-3rd-party-dependencies)
  - [Be judicious about "pre-checks"](#be-judicious-about-pre-checks)
  - [Do not produce logs in your tests](#do-not-produce-logs-in-your-tests)
  - [Don't test impossible states](#dont-test-impossible-states)
  - [Don't test framework plumbing](#dont-test-framework-plumbing)
  - [Don't test self-evident config](#dont-test-self-evident-config)
  - [Be sparing with comments](#be-sparing-with-comments)
  - [Never comment above a test case](#never-comment-above-a-test-case)
- [Configuration](#configuration)
  - [Do not spread from other environments](#do-not-spread-from-other-environments)
- [Test factories](#test-factories)
  - [Use them instead of incomplete data fakes](#use-them-instead-of-incomplete-data-fakes)
  - [Let the library handle merging in `params`](#let-the-library-handle-merging-in-params)
  - [Reserve `create` for factories that persist to a DB](#reserve-create-for-factories-that-persist-to-a-db)
  - [Provide realistic values](#provide-realistic-values)
  - [Unique-ify factory values where useful](#unique-ify-factory-values-where-useful)
  - [Watch out for `id` when unique-ifying your values](#watch-out-for-id-when-unique-ifying-your-values)
  - [Only override factory values that matter for the test](#only-override-factory-values-that-matter-for-the-test)
  - [Pre-bind repeated factory params into a reusable preset](#pre-bind-repeated-factory-params-into-a-reusable-preset)
  - [Set up and use factories to create implicit parent models](#set-up-and-use-factories-to-create-implicit-parent-models)
- [Database interactions](#database-interactions)
  - [Use the database socially](#use-the-database-socially)
  - [Encapsulate setup](#encapsulate-setup)
  - [Interact with repos socially](#interact-with-repos-socially)
- [Mocking](#mocking)
  - [Avoid partial mocks](#avoid-partial-mocks)
  - [Use `jest.replaceProperty` to control exported constants](#use-jestreplaceproperty-to-control-exported-constants)
  - [Put `jest.mock` statements at the top after imports](#put-jestmock-statements-at-the-top-after-imports)
  - [Refer to spied methods directly](#refer-to-spied-methods-directly)
  - [Move complicated mocks into mock files](#move-complicated-mocks-into-mock-files)
  - [When there isn't a mock file, provide an inline mock](#when-there-isnt-a-mock-file-provide-an-inline-mock)
  - [Use `mockReturnValue` for simple values](#use-mockreturnvalue-for-simple-values)
  - [Use `when()` for simple "if this then that" mock behavior](#use-when-for-simple-if-this-then-that-mock-behavior)
  - [Only mock what is necessary and provide mock values that are used](#only-mock-what-is-necessary-and-provide-mock-values-that-are-used)
  - [Avoid importing directly from `__mocks__` files](#avoid-importing-directly-from-__mocks__-files)
  - [Use `testSetup.js` to mock out modules that always need to be mocked](#use-testsetupjs-to-mock-out-modules-that-always-need-to-be-mocked)
  - [Use `beforeEach` for timer mocks setup](#use-beforeeach-for-timer-mocks-setup)
  - [Avoid mocking at arbitrary layers](#avoid-mocking-at-arbitrary-layers)
  - [Keep the SUT free of mocks](#keep-the-sut-free-of-mocks)
  - [No need to manually clear or restore mocks](#no-need-to-manually-clear-or-restore-mocks)
  - [No need to manually destroy `Repos` between tests](#no-need-to-manually-destroy-repos-between-tests)
  - [Never use `Reflect` or casts to access private state](#never-use-reflect-or-casts-to-access-private-state)
  - [Don't manually override methods on the SUT](#dont-manually-override-methods-on-the-sut)
  - [Don't manually override methods on collaborators](#dont-manually-override-methods-on-collaborators)
  - [Avoid brittle one-off type casts](#avoid-brittle-one-off-type-casts)
  - [Avoid mocking `console.log`](#avoid-mocking-consolelog)
- [Error checking](#error-checking)
  - [Be specific for `.toThrow` and not specific for `.not.toThrow`](#be-specific-for-tothrow-and-not-specific-for-nottothrow)
  - [Prefer strings over regexes for `.toThrow`](#prefer-strings-over-regexes-for-tothrow)
  - [Avoid `try/catch` in test cases to check for errors](#avoid-trycatch-in-test-cases-to-check-for-errors)
  - [Await the result, don't use `.resolves`](#await-the-result-dont-use-resolves)
- [Assertions](#assertions)
  - [`toEqual` instead of `toBe`, usually](#toequal-instead-of-tobe-usually)
  - [Avoid basic syntactic sugar matchers](#avoid-basic-syntactic-sugar-matchers)
  - [Assert element presence explicitly in RTL tests](#assert-element-presence-explicitly-in-rtl-tests)
  - [Keep `expect(...).toWhatever` on one line](#keep-expecttowhatever-on-one-line)
  - [Inline expected values](#inline-expected-values)
  - [Test one thing, but be pragmatic about it](#test-one-thing-but-be-pragmatic-about-it)
  - [Don't combine assertions into an arbitrary tuple](#dont-combine-assertions-into-an-arbitrary-tuple)
  - [Avoid redundant examples within a test](#avoid-redundant-examples-within-a-test)
  - [Use `pluck` to pull out a slice of data from an array for assertions](#use-pluck-to-pull-out-a-slice-of-data-from-an-array-for-assertions)
  - [Never `toHaveLength` + index into elements](#never-tohavelength--index-into-elements)
  - [Be explicit about empty things](#be-explicit-about-empty-things)
  - [Avoid snapshot testing except in restricted cases](#avoid-snapshot-testing-except-in-restricted-cases)
  - [Avoid testing log statements](#avoid-testing-log-statements)
  - [Avoid testing metrics](#avoid-testing-metrics)
  - [Avoid testing basic setters and getters](#avoid-testing-basic-setters-and-getters)
  - [Use `toEqual` for up to 2 prop assertions, `toMatchObject` otherwise](#use-toequal-for-up-to-2-prop-assertions-tomatchobject-otherwise)
  - [Use `.toIncludeSameMembers` for order-agnostic array comparisons](#use-toincludesamemembers-for-order-agnostic-array-comparisons)
  - [Use concrete, non-dynamic expected values](#use-concrete-non-dynamic-expected-values)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Terminology

- **Mock (noun)** -- a fake function or class with pre-specified behavior used in tests. We do not disambiguate between test doubles, stubs, and mocks, even though they are technically different things.
- **Mock (verb)** -- to replace a function or class with a mock
- **Fake** -- any non-real data or object that is used as a stand-in for real data. Ideally type-safe. Produced by a factory
- **Factory** -- creates fakes with realistic but non-real data
- **Subject Under Test (SUT)** -- the subject being tested, i.e. the function or class or whatever that is under test
- **Unit test** -- any network of calls and stack traces to exercise code made (generally) in memory through public or private APIs and function calls. The "boundary" of a unit test is typically at the I/O layer (e.g. network call, disk write), 3rd party dependency, etc.
- **Integration test** -- a test that confirms services work together correctly across a unit boundary (e.g. a test exercising server code by actions sent via a client over websockets)
- **End to End (E2E) test** -- a test that opens up a client device (browser, desktop, mobile, etc.) and simulates user behavior (clicks, touches, etc.) to exercise the application and ensure everything works correctly

## Principles

The purpose of Principles here is to express the high-level ideas driving our testing design at Gather.

### Favor social unit tests over isolated unit tests

We have intentionally chosen social (or wired) unit tests over isolated (or solitary) unit tests.

![](https://i.imgur.com/ffQD6v2.png)

If you've heard of [Detroit vs London TDD](https://medium.com/@adrianbooth/test-driven-development-wars-detroit-vs-london-classicist-vs-mockist-9956c78ae95f), we follow Detroit style. Both are perfectly valid ways of approaching testing. There are _very smart_ people on both sides of the ideological divide. We made a deliberate choice to keep our testing philosophy consistent on this pattern across the entire Gather codebase.

#### When to mock

Generally, you should only resort to mocking for these cases:

- Network calls (except DB interactions)
- I/O disk operations
- 3rd party [service wrappers](https://www.youtube.com/watch?v=Af4M8GMoxi4)
- Operational / observability code that's orthogonal to business logic (logging, metrics manager, etc.)
- Code that's prohibitively hard to test or have it run in a test environment

In all other cases, code should be executed socially. If the social units expect certain data or setup to be present, lean on factories and helper functions to simplify and abstract the test setup, so you can stay focused on what matters. With good investment into test setup tooling like factories, it can become very easy to make social unit tests.

#### How this looks in practice

Let's take a look at a concrete case with some fake code:

```ts
// user.ts
import { auth } from "firebase"
import { removeSpaceUser } from "./spaceUsers"

const deleteUser = async (userId: string) => {
  const user = await getUser(userId)
  await prismaDb.user.delete({ where: { id: userId } })
  // delete SpaceUser records
  await Promise.allSettled(user.spaces.map((space) => removeSpaceUser(space.id)))
  // delete from Firebase Auth
  await auth.deleteUser(userId)
}
```

Let's also assume that `removeSpaceUser` has already been tested thoroughly. So the question is, how do we test this?

```ts
import { removeSpaceUser } from "../spaceUsers"

jest.mock("../spaceUsers")

const spaceId1 = "space1"
const spaceId2 = "space2"

it("like this where we mock it", async () => {
  const user = factories.user.create({ spaces: [{ id: spaceId1 }, { id: spaceId2 }] })

  await deleteUser(user.id)

  expect(removeSpaceUser).toHaveBeenCalledTimes(2)
  expect(removeSpaceUser).toHaveBeenCalledWith(spaceId1)
  expect(removeSpaceUser).toHaveBeenCalledWith(spaceId2)
})
```

Or like this, where we do it socially:

```ts
const spaceId1 = "space1"
const spaceId2 = "space2"

it("like this where we mock it", async () => {
  const user = factories.user.create({ spaces: [{ id: spaceId1 }, { id: spaceId2 }] })

  await deleteUser(user.id)

  expect(await getSpaceUser(spaceId1, user.id)).toEqual(null)
  expect(await getSpaceUser(spaceId2, user.id)).toEqual(null)
})
```

#### Tests should give us confidence in behavior

One of the big problems with isolated unit tests is a high incidence of false positives (tests pass, behavior is broken).

![](https://www.reddit.com/media?url=https%3A%2F%2Fi.redd.it%2F9zf0asd0c3n51.gif)

At the end of the day, tests are about building confidence that our code works. We get better confidence from social unit tests, which don't make assumptions about contracts between small interdependent units, and validate the code still behaves as expected.

We need to make sure the "integration" of the two units works correctly anyway. Right now there might be some bug between `deleteUser` and how it calls `removeSpaceUser`, where it wouldn't actually delete the record correctly. For example, in the example code, let's say we added a FK relationship, so `SpaceUser` was deleted automatically when `User` is deleted. This code would likely throw a `Record to delete does not exist` error. But an isolated unit test wouldn't catch this bug: both units are working correctly, but don't work together correctly. We can't know that without writing a test that does run the code socially.

#### Don't test everything in downstream units

Only test the edge cases of the code the SUT introduces. A collaborator's edge cases get tested in the collaborator's own test file.

We don't duplicate the tests for `removeSpaceUser` in `#deleteUser`. Instead of testing that `removeSpaceUser` gets called, verify one of its effects, e.g. that the `SpaceUser` records no longer exist. That's enough to know the wiring works. The `removeSpaceUser` tests cover everything else it does, including its edge cases.

![](https://i.imgur.com/RALUUU4.png)

The same goes for any collaborator:

```ts
foo() {
  someOtherCollaborator(this.foo)
}
```

The tests for `foo` only check the wiring, i.e. that `foo()` does something reasonable. If `someOtherCollaborator` has a bunch of edge cases, test them in its own file. Branches that `foo` adds itself (a guard, a fallback value) are `foo`'s edge cases, so test those here.

Redundant coverage is one of the downsides of Detroit-style testing. This keeps it to a wiring test per collaborator.

#### Test behavior, not implementation

Social unit tests make fewer assumptions about the shape of code, which makes it easier to refactor. Let's say we slightly changed the interface of `removeSpaceUser` to accept an array of IDs:

```ts
await removeSpaceUsers(idsOf(user.spaces))
```

The isolated unit tests will now fail, because `removeSpaceUser` is no longer being called, but the social unit test passes, because the behavior is still the same.

#### Don't mix ideologies

In Justin Searls' talk "Please don't mock me", he talks about [the risk of carelessly mixing mocking philosophies](https://youtu.be/Af4M8GMoxi4?si=0uT7N5zHyDNk-apu&t=553) (9:13 - 14:15), and concisely captures the tradeoffs of isolated vs social unit testing.

Social unit tests let us focus on behavior, isolated unit tests let us focus on contracts. As software engineers, we care about behavior at the end of the day. While both have strengths to their approach, we made an intentional choice to write Detroit-style tests at Gather. Being consistent in our use allows us to trust that when a test fails, it's because the behavior has changed.

#### Resources

For more inspiration and discussion:

- https://www.youtube.com/watch?v=Af4M8GMoxi4
- https://kentcdodds.com/blog/write-tests

### Aim for "mostly useful" tests

We want to achieve "80% useful" tests.

Let's say you have an adder, with two methods `#sum` and `#getOddSumsCount`. Technically, this test has an "untested
edge case":

```js
it("sums values and returns the number of times an odd sum was done", () => {
  adder.sum(1, 0) // odd
  adder.sum(1, 1)
  adder.sum(1, 2) // odd

  expect(adder.getOddSumsCount()).toEqual(2)
})
```

In theory, what happens after `getOddSumsCount` is invoked? Does `#sum` keep working? What if I pass in negative
numbers? What about exponents? What if I invoke `#getOddSumsCount` without summing anything odd first? What if I sum two
odds in a row? What if it overflows? Does `#getOddSumsCount` throw an error on subsequent invocations?

These questions _could_ be answered in test, but they are reminiscent of
the [famous joke about a QA software engineer walking into a bar](https://www.reddit.com/r/Jokes/comments/prdi4x/a_software_tester_walks_into_a_bar/)
. Their marginal value is _much less_ than that first test. So, while it's not wrong to explore edge cases, be pragmatic
about the tests you write, and always ask yourself, "Is this substantially increasing my confidence the code is working
correctly?"

Some questions that relate to the _design_ of the interface, e.g. "if I invoke `getOddSumsCount`, should the count reset
to zero after?", may be interesting to communicate with tests, as that demonstrates the behavior:

```js
it("resets the counter after being checked", () => {
  adder.sum(1, 0)

  adder.getOddSumsCount()

  expect(adder.getOddSumsCount()).toEqual(0)
})
```

This test is reasonable, because it's communicating something meaningful about the behavior. (Probably a questionable
design, however.)

### Don't restructure production code purely for test convenience

Constructor injection is our default for collaborators
([Favor OOP over FP](../writing-code/STANDARDS.md#favor-oop-over-fp)), so this
isn't an argument against DI. It's about the difference between injecting a collaborator because the seam is real and
adding a constructor parameter because it shortens one test. Every injected dependency is setup that every caller now
has to supply and understand. When the only beneficiary is a test, the test got easier and the production interface got
worse.

Work out which one you have:

- **A real seam** — the collaborator has more than one legitimate implementation (a repo, an HTTP client, an
  environment-specific transport), and production wires one while the test wires another. Inject it.
- **A test-only seam** — the collaborator has exactly one implementation and always will, and the parameter exists so a
  test can pass a fake. Default it so production callers never think about it
  (`constructor(private readonly emailService: EmailService = EmailService.getInstance())`), or test socially through
  the real thing.

The same question applies to the sibling moves: exporting a function only so a test can import it, widening a `private`
to `public`, adding an `options` bag whose only non-default caller is a test, or pulling a method out to module scope to
make it directly callable. Each trades a permanent cost in the production interface for a one-time convenience in a
test. Sometimes that's the right trade — make it deliberately, and say why in the PR.

## General

### Mirror test files to implementation files

A test file should almost always share the name of the implementation file it tests — `parser.ts` → `parser.test.ts` — and live in the sibling `__tests__/` directory (our repo convention). Avoid naming a test file after a specific scenario or behavior (e.g. `pathEncodingRoundtrip.test.ts`, `signedUrlExpiry.test.ts`). When you want to scope tests to a single concern, use a `describe` block inside the mirror file instead.

```
// ❌ scenario-named file, orphaned from the thing being tested
src/urlEncoding/__tests__/pathEncodingRoundtrip.test.ts

// ✅ mirror file, scenario expressed via describe
src/urlEncoding/urlEncoding.ts
src/urlEncoding/__tests__/urlEncoding.test.ts

// inside urlEncoding.test.ts
describe("path encoding round trip", () => {
  it("round-trips ASCII paths", ...)
  it("round-trips unicode paths", ...)
})
```

The mirror rule makes it obvious where to add or find a test: look in the `__tests__/` folder alongside the implementation. Scenario-named files fragment coverage across the tree and make it easy to write a second test file that duplicates setup the original file already handled.

### Pair implementation with tests in PRs

Generally do not split up PRs between implementation and testing. The goal with tests is to write them first, so you don't need to manually test the implementation. Tests alongside the implementation in a PR also gives the reviewer context about the expected behavior. The tests act as live examples or documentation of what is happening with the new code.

### Follow the `Arrange - Act - Assert` pattern

Generally try to visually space out your code to follow a common pattern in software testing, `Arrange - Act - Assert`.
It's a convention that makes tests easier to skim.

```js
// arrange code...
// arrange code...
// arrange code...

// act

// expect code...
// expect code...
```

If you _really_ want it's also okay to put in comment headers, though it's less common and not expected:

```js
// arrange
// code
// code
// code

// act
// code

// assert
// code
// code
```

### Front-load common setup into `beforeEach`

If most tests share the same arrangement — creating models, constructing the SUT, mounting — do it in `beforeEach`. The `beforeEach` state should represent the majority path; only outlier tests do extra work on top.

```ts
// ❌ every test repeats the same setup or calls the same helper
const mountWidget = async () => {
  widget = new Widget(props)
  await widget.init()
}

it("starts in idle state", async () => {
  await factories.item.create({}, { transient: { connection } })
  await mountWidget()
  expect(widget.state).toEqual("idle")
})

it("transitions on input", async () => {
  await factories.item.create({}, { transient: { connection } })
  await mountWidget()
  widget.handleInput("go")
  expect(widget.state).toEqual("active")
})

// ✅ majority path lives in beforeEach — most tests need zero arrangement
beforeEach(async () => {
  item = await factories.item.create({}, { transient: { connection } })
  widget = new Widget(props)
  await widget.init()
})

it("starts in idle state", () => {
  expect(widget.state).toEqual("idle")
})

it("transitions on input", () => {
  widget.handleInput("go")
  expect(widget.state).toEqual("active")
})
```

A tell: if you have a helper that every test calls at the top, it belongs in `beforeEach`. Helpers are for optional setup, not universal setup.

### Be less DRY for primitive values repeated once

It can be easy in tests to try to DRY up all your test values. As an example:

```js
// not great
it("does something", () => {
  const fakeNumber = 1
  const fakeString = "hello"
  const fakeBoolean = true
  const subject = new StateHolder(fakeNumber, fakeString, fakeBoolean)

  expect(subject.number).toEqual(fakeNumber)
  expect(subject.string).toEqual(fakeString)
  expect(subject.boolean).toEqual(fakeBoolean)
})
```

That's okay, but it gets a little cumbersome to read. Consider the alternative, where you make things a little less DRY,
but it's easier for the eye to skim:

```js
it("does something", () => {
  const subject = new StateHolder(1, "hello", true)

  expect(subject.number).toEqual(1)
  expect(subject.string).toEqual("hello")
  expect(subject.boolean).toEqual(true)
})
```

There's no easy rule to put here, aside from being judicious about DRYing your test data. One rule that gets somewhat
close:

> If they're just basic values (strings, numbers, booleans), pass it in directly. If they're complex objects, DRY them.

```ts
functionUnderTest(fakeNumber, fakeString, fakeBoolean) // not so good
functionUnderTest(1, "foo", false) // good

otherFunctionUnderTest({ id: 1, name: "Foo", hasPaid: false } as User) // not so good
otherFunctionUnderTest(testUser) // good
```

### Write declarative test helpers

```js
// ❌
jest.spyOn(Date, "now").mockImplementation(() => new Date("2021-12-01T10:00Z").valueOf())

// ✅
mockTime("2021-12-01", "10:00")
```

While we can relax being DRY for primitive test values, let's be more DRY for test helpers. As much as possible, when you have an _intent_ in a test, consider capturing it in a test helper. In addition to making
the test easier to read, it's easier to change _how_ we do that thing in the future.

### Avoid `if`s in your tests

An `if` statement (or other control flow statements like `while`, `switch`, `try/catch`, etc.) in your test file is
usually a code smell.

Definitely do not use it for branching logic, instead break it into two tests:

```js
// bad times
it("does something", () => {
  const [someThing, oneThing, someOtherThing] = doSomething()
  if (someThing) {
    expect(oneThing).toEqual("foo")
  } else {
    expect(someOtherThing).toEqual("bar")
  }
})
```

Avoid using it for type refinement as well for things like removing nil-ish values. Use `just` or helper functions
instead:

```js
// ❌
it("does something", () => {
  const foo: Foo | undefined = maybeBuildFoo()
  if (foo) {
    // now is refined to Foo
    actOnFoo(foo)
  }
})

// ✅
it("does something", () => {
  const foo: Foo = just(maybeBuildFoo())
  actOnFoo(foo)
})

// ✅ little test helpers are also good
it("does something", () => {
  const foo: Foo = definitelyBuildFoo()
  actOnFoo(foo)
})
const definitelyBuildFoo = () => just(maybeBuildFoo())
```

### Avoid loops in your tests

```ts
// ❌
for (let i = 0; i < 5; i++) {
  it("when i = " + i, () => {
    expect(someFn(i)).toEqual(/* ... */)
  })
}

// ✅
it.each(
  [
    { a: 1, b: 2, c: 3 },
    { a: 11, b: 22, c: 33 },
  ],
  "where a = $a, b = $b, c = $c",
  ({ a, b, c }) => {
    expect(someFn(a, b)).toEqual(c)
  },
)
```

The presence of loops is almost always a code smell. It can lead to less maintainable code, subtle bugs, boundary
mistakes, etc. Use the [`it.each` functionality](https://jestjs.io/docs/api#1-testeachtablename-fn-timeout) to express
different test inputs/outputs whenever possible. If a `for` loop is necessary, provide a justification.

### Avoid root-level `describe` wrappers

Avoid wrapping entire test files logic in one root `describe` block. Instead, use `it` and `describe` as necessary at
the root indentation.

```ts
/** File under test: src/utils/room-utils.ts */

// ❌ Don't do these -- they're redundant, as Jest provides this context for us in the output
describe("src/utils/room-utils" /* ... */)
describe("Room Utils" /* ... */)

// ✅ Instead, write `it` test cases directly at the root indentation as needed
it("transforms the room into a meeting" /* ... */)

// ✅ It's also fine to have root-level `describe`s that group distinct parts of the module and/or test file
describe("#transformRoomIntoMeeting" /* ... */)
describe("#transformRoomIntoLobby" /* ... */)
```

### Use declarative phrasing for `it` blocks

Write `it` block descriptions as declarative statements that describe what the code does, not what it "should" do.

```ts
// ❌ Don't use "should" - it's redundant and wordy
it("should create a new transaction with a unique id", () => {
  /* ... */
})
// ✅ Use declarative phrasing as complete sentences
it("creates a new transaction with a unique id", () => {
  /* ... */
})

// ❌ Don't use incomplete sentence fragments
it("new transaction creation", () => {
  /* ... */
})
// ✅ Write as complete sentences that read naturally after "it"
it("creates a new transaction with a unique id", () => {
  /* ... */
})
```

### Make the "expected change" obvious in the code

```ts
// ❌
const updatedUser = changeName("Ginger Test", user1)
expect(updatedUser).toEqual({
  id: 1,
  name: "Ginger Test",
  hometown: "Seattle, WA",
  age: 19,
  eyeColor: "green",
})

// ✅
const updatedUser2 = changeName("Ginger Test", user2)
expect(updatedUser2.name).toEqual("Ginger Test")
```

In the first case, it's unclear from skimming the file what was expected to change. This lack of terseness adds mental burden to understanding the test. Additionally, if the shape of the user were to change, this test would need to be updated unnecessarily.

### Use `testId()` for UUIDs in tests

Use `testId()` from `gather-common-including-video/dist/testHelpers/testId` instead of `uuid()` for any UUID you need in a test or test helper. They're deterministic, so `testId("someLabel")` will return the same ID each time.

```ts
// ❌ fresh random uuid, not reproducible, requires holding in a const
const roomId = uuid()
const room = await factories.room.create({ id: roomId })
expect(room.id).toEqual(roomId)

// ✅ deterministic, stamped with an `aaaaaaaa-` prefix
const room = await factories.room.create({ id: testId("r1") })
expect(room.id).toEqual(testId("r1"))
```

**Readable failure output.** Every `testId()` result is stamped with a constant `aaaaaaaa-` prefix so it is visually obvious in `expect` failures whether a UUID came from a `testId` or not.

```
// at a glance, you can tell what are testId()s vs regular uuids
Expected: "aaaaaaaa-c96b-4c87-86fe-f6372900c12b"
Received: "441b56fa-ebc9-430b-94ea-a788a695a2df"
```

**Labeling convention.** Keep labels short and semantic, scoped by model type: `r1` / `r2` for rooms, `d1` for desks, `u1` for users, `w1` for workspaces, `mem1` for members, `mtg1` for meetings, `msg1` for messages, etc. Use `id1`, `id2` for arbitrary ids where the type doesn't matter.

**When to inline vs bind to a variable.** If a single testId is referenced a couple of times, inline it. If it is referenced many times across a test, bind it to a variable.

```ts
// inline for 1-2 refs
room.addDesk({ id: testId("d2"), label: "Window" })

// variable when used many times
const roomId = testId("r1")
// ... many references to roomId below
```

Production code should keep using `uuid()`. `testId` is test-only. (We have a lint rule guarding against it.)

### Wrap 3rd party dependencies

```ts
// ❌
jest.mock("@google/api")
jest.mocked(google).mockResolvedValue({
  calendar: {
    listEvents: jest.fn().mockResolvedValue([
      /* ... */
    ]),
  },
})

// ✅
jest.mock("src/services/google")
jest.mocked(googleCalendar.listEvents).mockResolvedValue([
  /* ... */
])
```

We will borrow again from Justin Searls [here](https://youtu.be/Af4M8GMoxi4?si=ohsJ8ieLk6PUvB2f&t=891) (14:50 - 18:50) for an explanation. Wrapping 3rd party dependencies makes mocking easier, insulates the rest of our code from 3rd party details, and makes it slightly easier to swap out later.

### Be judicious about "pre-checks"

**Pre-checks** are a term Andrew invented to describe `expect` statements that happen before the `Act` to demonstrate
the value subsequently changes after the `Act`. As an example:

```js
it("returns the number of times an odd sum was found", () => {
  expect(adder.getOddSumsCount()).toEqual(0) // this is a pre-check

  adder.sum(1, 0) // odd

  expect(adder.getOddSumsCount()).toEqual(1)
})
```

Again, the pre-check isn't strictly wrong, but we should ask ourselves:

1. Does this meaningfully improve our confidence in the test, and
2. Does it scale well?

To answer number two, let's expand the number of things we're checking, to see how it starts to get out of hand:

```js
it("does something", () => {
  expect(subject.foo).toEqual("fooOriginal")
  expect(subject.bar).toEqual("barOriginal")
  expect(subject.baz).toEqual("bazOriginal")

  subject.changeState()

  expect(subject.foo).toEqual("fooChanged")
  expect(subject.bar).toEqual("barChanged")
  expect(subject.baz).toEqual("bazChanged")
})
```

And then what happens if we have multiple tests around the same method? Do we always repeat the pre-checks?

```js
it("does something", () => {
  expect(subject.foo).toEqual("fooOriginal")
  expect(subject.bar).toEqual("barOriginal")
  expect(subject.baz).toEqual("bazOriginal")

  subject.appendToAllStates("One")

  expect(subject.foo).toEqual("fooOne")
  expect(subject.bar).toEqual("barOne")
  expect(subject.baz).toEqual("bazOne")
})

it("does something else when a flag is passed in", () => {
  expect(subject.foo).toEqual("fooOriginal") // this is now duplicated code
  expect(subject.bar).toEqual("barOriginal") // this is now duplicated code
  expect(subject.baz).toEqual("bazOriginal") // this is now duplicated code

  subject.appendToAllStates("One", { uppercase: true })

  expect(subject.foo).toEqual("fooONE")
  expect(subject.bar).toEqual("barONE")
  expect(subject.baz).toEqual("bazONE")
})
```

It becomes hard to know where to draw the line, and can exponentially increase the LoC in tests.

But let's say we're in a case where it does give us some meaningful confidence. Take this example:

```js
it("logs the odd sums", () => {
  const logger = jest.fn()
  const adder = new WeirdAdder({ logger })

  expect(logger).not.toHaveBeenCalled() // pre-check

  adder.sum(1, 0)

  expect(logger).toHaveBeenCalledWith("1 is an odd sum")
})
```

Here, that pre-check does tell us something meaningful: the logger doesn't happen to be called on the adder's
instantiation. But if that distinction is meaningful, we can just write a separate case for it explicitly:

```js
it("logs the odd sums", () => {
  const logger = jest.fn()
  const adder = new WeirdAdder({ logger })

  adder.sum(1, 0)

  expect(logger).toHaveBeenCalledWith("1 is an odd sum")
})

it("does not log anything initially", () => {
  const logger = jest.fn()

  const adder = new WeirdAdder({ logger })

  expect(logger).not.toHaveBeenCalled()
})
```

Now that pre-check is turned into an important call-out to anyone reading the tests, rather than being embedded
implicitly into a different test. And if that second test doesn't seem to deliver that much value to have been written
in the first place, it doesn't really belong as a pre-check either. (This connects back to the "80% useful tests"
principle.)

As an aside, they can sometimes use them while building a test to make sure the test has the right setup values, as
scaffolding that is eventually deleted.

### Do not produce logs in your tests

Tests should not produce log output during normal execution. Log statements clutter test output and make it harder to identify real issues or important information. The noise they create in test output can mask real problems, making it harder to troubleshoot for an individual test in your IDE or in CI.

Log output in tests creates noise that makes it difficult to:

- Debug failing tests efficiently -- separating the "expected errors" from "unexpected errors" that may be causing your test to fail
- Identify when new warnings or errors are introduced that represent issues with test setup or unexpected failures

By keeping test output clean, we maintain a high signal-to-noise ratio that helps developers quickly identify and resolve issues.

```ts
// ✅ Silence expected logs in your tests
it("processes user data", () => {
  silenceLoggerErrors("User validation failed")
  const result = processUserWithInvalidData(userData)
  expect(result.isValid).toEqual(false)
})
```

`Logger.info` and below is silenced by default. Usually you can control the log level by setting `process.env.LOG_LEVEL` in the `testSetup.js` file, like `process.env.LOG_LEVEL = "error"`; it's up to a team to decide what is a reasonable log level for a given package.

**Use logging silence helpers:**

When your code under test produces log output that's expected but not relevant to the test, use the available silence helpers:

- `silenceConsoleWarnings()` - silences `Logger.warn` calls (the name is bad, we need to fix it 🙇)
- `silenceConsoleErrors()` - silences `Logger.error` calls (the name is bad, we need to fix it 🙇)
- `silenceErrors(message)` - silences errors on an arbitrary logger (e.g. `silenceErrors(console, "error", ...)`)
- `silenceLogger[Warnings|Errors](message)` - silences specific `Logger.[warning|error]` calls

These helpers ensure that only the specific expected logs are silenced, while still allowing unexpected errors or issues to surface during testing.

### Don't test impossible states

Don't write tests for inputs that the type system already prevents — passing `123` where the type is `string`, checking "malformed" data that can't arrive through the real code path, verifying that a repo object has a `.get` method when the type guarantees it. Focus on states that actually occur in production.

This gives ["a software tester walks into a bar"](https://www.reddit.com/r/ProgrammerHumor/comments/qbmvlr/a_software_tester_walks_into_a_bar/) energy — it wastes time checking cases that don't matter, making the test suite harder to read with no added confidence in the code.

```ts
// ❌ testing a state the type system prevents; authId is always a string
it("returns false when authId is a number", () => {
  const result = isOwnUser({ authId: 123 }, authUserId)
  expect(result).toEqual(false)
})

// ❌ testing that a well-typed object has the methods it has
it("returns false when repo has no get method", () => {
  const result = lookupUser({ values: () => [] }) // missing .get
  expect(result).toEqual(false)
})

// ✅ test states that can actually happen
it("returns false when the user does not match", () => {
  const result = isOwnUser(factories.user.build({ authId: testId("other") }), authUserId)
  expect(result).toEqual(false)
})
```

### Don't test framework plumbing

Don't test that lifecycle hooks, re-render methods, or framework internals don't trigger side effects. That's testing the framework, not your feature.

```ts
// ❌ testing that a lifecycle hook doesn't fire a callback
it("does not fire callback on prop change", async () => {
  await mountPresenter()
  presenter.onPropChange()
  expect(callback).not.toHaveBeenCalled()
})

// ✅ test the behavior users care about
it("fires callback when visibility changes", () => {
  toggleVisibility(item)
  expect(callback).toHaveBeenCalledTimes(1)
})
```

If a framework guarantees behavior (e.g. MobX reactions only fire on change, React doesn't re-render when props are equal), trust it. Test your code's behavior within the framework, not the framework's own invariants.

### Don't test self-evident config

Don't write tests that assert the value of a static config property or a one-liner override that is already plainly visible in the source. If the property is `enablePermissions = false` and there is no branching logic around it, a test that asserts `expect(obj.enablePermissions).toEqual(false)` is restating the code — it doesn't add confidence.

```ts
// ❌ the test just mirrors the implementation line
it("disables per-row permission checks", () => {
  expect(token.enablePermissions).toEqual(false)
})

// ❌ same — constant return value is obvious from the source
it("is not visible to clients", () => {
  expect(token.isVisibleToClients()).toEqual(false)
})
```

If we tested every constant or flag assignment, our required test coverage would explode with no meaningful gain. Reserve tests for behavior: branching, computation, or integration with other systems. A property that is set once and never conditionally changed is already "tested" by reading the line.

The exception is when the value has **non-obvious downstream consequences** that a reader couldn't predict from the assignment alone or by understanding what the config value represents.

### Be sparing with comments

Test cases should almost always be self-explanatory through the `it` name, factories, and a clean Arrange-Act-Assert structure. If you reach for a clarifying comment in a test, that's usually a sign the test is set up wrong — rename the `it`, extract a helper, simplify the arrangement, or split into multiple tests.

```ts
// ❌ the comment is explaining a subtle setup choice — that's a smell
it("produces identical paths for builder vs driver-fallback resolution", () => {
  const driverOnly = new AppRouter()
  driverOnly.setDriver(new RouterDriver(mockReactRouter))

  const builderRouter = new AppRouter()
  builderRouter.setDriver(new RouterDriver(mockReactRouter))
  // Map only the routes we assert on below — the driver side resolves
  // through the testRoutes tree and covers the same ids.
  builderRouter.setRoutes({
    [AppRoutes.SignIn]: "/signin",
    [AppRoutes.RoomDetail]: "/workspaces/:workspaceId/rooms/:roomId",
    [AppRoutes.Dashboard]: "/workspaces/:workspaceId",
  })

  expect(builderRouter.getPathForRoute(AppRoutes.SignIn)).toEqual(
    driverOnly.getPathForRoute(AppRoutes.SignIn),
  )
})

// ✅ make the test more obvious through the input
it("produces identical paths for builder vs driver-fallback resolution", () => {
  const routesMirroringDriverFallback = { [AppRoutes.SignIn]: "/signin" }
  // ...
  builderRouter.setRoutes(routesMirroringDriverFallback)

  const res = builderRouter.getPathForRoute(AppRoutes.SignIn)
  expect(res).toEqual(driverOnly.getPathForRoute(AppRoutes.SignIn))
})
```

If the comment adds information the `it` name doesn't, fold it into the name. If it doesn't, delete it.

### Never comment above a test case

Don't put a comment between the previous test and an `it` or `describe`. Such a comment restates the behavior a second time in prose, so the two descriptions drift apart the moment someone edits the test. The `it` name states the behavior; the arrangement shows the nuance. If either fails to, fix the name or the arrangement.

```ts
// ❌ the comment is just the it name in longer form
// Isolation test — confirms AppRouter honors the routesMap handed to
// setRoutes rather than reaching for a module-level global. Mirrors
// the same check on the PathBuilder class itself.
it("uses the routesMap passed to setRoutes, not a global", () => {
  router.setRoutes({ [AppRoutes.SignIn]: "/completely/different/path" })

  expect(router.getPathForRoute(AppRoutes.SignIn)).toEqual("/completely/different/path")
})
```

The fix is to delete the comment — the `it` name and the single `setRoutes` call already say all of it.

This also holds for comments that justify _why_ the behavior is the way it is. That reasoning belongs where the behavior or design is defined — next to the code, type, or config it explains — not next to a test that happens to cover it. A reader changing the production code won't find a rationale buried in a spec file, and a test is the wrong place to litigate a design decision.

```ts
// ❌ the rationale is stranded in the spec file
// We keep stale members in the list because the presence service can lag
// behind the roster by a few seconds after a mass disconnect, and dropping
// them early makes the sidebar flicker.
it("keeps members whose presence has expired", () => {
```

Put that paragraph on the production code path that implements it, then let the test name stand alone.

## Configuration

### Do not spread from other environments

It may seem harmless to do something like this:

```js
const testConfig: HttpServerConfig = {
  ...devConfig,
}
```

But if `devConfig` happens to spread from `prodConfig`, suddenly you might wind up with real API keys in your tests. To
avoid this particular footgun, declare the config explicitly, or have a shared `baseConfig` that doesn't contain service
keys:

```js
// good
const baseConfig = {
  /* ... */
}
const devConfig = { ...baseConfig, serviceKey1: "foo", serviceKey2: "bar" }
const testConfig = { ...baseConfig, serviceKey1: "fakeFoo", serviceKey2: "fakeBar" }
```

## Test factories

### Use them instead of incomplete data fakes

```ts
// ❌
// @ts-expect-error this is the only data we need of the user
const user1: User = { name: "Andrew" }

// ✅
const user2 = factories.user.build({ name: "Andrew" })
```

Leverage factories to generate domain models of our code, as they handle type checking for us and DRY our assumptions
about data shapes. The schema could continue to evolve and require other default data, which would then require all incomplete fakes to be updated with some new field. By consolidating with a factory, we can provide type-safe fakes with reasonable defaults and allow the test to focus on the test data that matters.

### Let the library handle merging in `params`

The library will deeply merge the passed in `params` with your default values.

```ts
// ❌
const thing1Factory = Factory.define<{ width: number; height: number }>(({ params }) => ({
  width: params.width || 10,
  height: params.height || 10,
}))

// ✅
const thing2Factory = Factory.define<{ width: number; height: number }>(() => ({
  width: 10,
  height: 10,
}))
```

### Reserve `create` for factories that persist to a DB

The `#create` method of a factory is async, and by convention is expected to persist to a DB. The `#build` is for making
an object in memory. (It's a convention that comes from Rails.) E.g. you should never see `factories.someThing.create()`
in browser tests because those tests shouldn't be talking to a DB.

### Provide realistic values

```ts
const thingFactory = Factory.define<{ url1: string; url2: string }>(({ sequence }) => ({
  url1: "foo", // not great, not a "realistic" URL
  url2: "http://test.url.com/", // better, a more "realistic" URL
}))
```

### Unique-ify factory values where useful

Connect it to the ID and "unique-ify" them when they are often referenced or looked at for debugging in tests:

```ts
const thingFactory = Factory.define<{ id: string; name: string; hometown: string }>(
  ({ sequence, params }) => {
    const id = params.id ?? sequence.toString()
    return {
      id,
      name: `User_${id}`, // good, maybe being able to "see" the name will be convenient in debugging tests
      hometown: "Test Hometown", // good, not everything needs to be unique-ified
    }
  },
)
```

### Watch out for `id` when unique-ifying your values

If your object has an `id`-like property, and you're using `sequence` to unique-ify other values, keep them aligned.
This has a subtle inconsistency:

```ts
const thingFactory = Factory.define<{ id: string; name: string; hometown: string }>(
  ({ sequence, params }) => {
    return { id: sequence.toString(), name: `User_${sequence}` }
  },
)
```

If you specify an id, the name will be out of sync:

```ts
factories.thing.build({ id: 42 }) // { id: 42, name: User_1 }
```

Instead, roll them together into a single value:

```ts
const thingFactory = Factory.define<{ id: string; name: string; hometown: string }>(
  ({ sequence, params }) => {
    const id = params.id ?? sequence.toString()
    return { id, name: `User_${id}` }
  },
)
```

### Only override factory values that matter for the test

```ts
// ❌
const user1 = factories.user.build({
  name: "Ginger",
  age: 18,
  hometown: "Seattle",
  favoriteColor: "red",
})
const updatedUser1 = changeName("Ginger Test", user1)
expect(updatedUser1).toEqual("Ginger Test")

// ✅
const user2 = factories.user.build({ name: "Ginger" })
const updatedUser2 = changeName("Ginger Test", user2)
expect(updatedUser2).toEqual("Ginger Test")
```

The purpose of factories is to abstract away the creation of test data that is irrelevant to the test, while still producing type-safe, realistic fake data. Only provide overrides that actually matter or are used in the test. Providing other values will distract from what is expected to change in the test.

### Pre-bind repeated factory params into a reusable preset

When you pass the same transient or params to a factory in multiple places, create a reusable preset with `.transient()` or `.params()`.

```ts
// ❌ repeated transient boilerplate
await factories.desk.create({}, { transient: { room } })
// ... later
await factories.desk.create({}, { transient: { room } })
// ... later
await factories.desk.create({ name: "Window" }, { transient: { room } })

// ✅ bind once, reuse
const deskFactory = factories.desk.transient({ room })
await deskFactory.create()
// ... later
await deskFactory.create()
// ... later
await deskFactory.create({ name: "Window" })
```

### Set up and use factories to create implicit parent models

```ts
// ❌
const workspace = await factories.workspace.create()
const office = await factories.office.create({ workspaceId: workspace.id })
const room = await factories.room.create({ workspaceId: workspace.id, officeId: office.id })
const desk = await factories.desk.create({
  workspaceId: workspace.id,
  officeId: office.id,
  roomId: room.id,
})
// ...

// ✅
const desk = await factories.desk.create()
// the workspace, office, room, and other related data are created implicitly
```

## Database interactions

### Use the database socially

```ts
// ❌
jest.mock("../db/user")
jest.mocked(getUser).mockResolvedValue({
  /* ... */
})

// ✅
await factories.user.create(/* ... */)
```

Database interactions cross a network boundary, but we include them as part of social unit tests. They are the most prominent exception to our definition of the networking layer being a unit test boundary. We include DB socially because the DB is _so complex_ and our logic is so often deeply woven with it. Mocking out the DB in practice introduces a huge surface area of bugs and lack of safety, where the tests pass but the app breaks.

Plenty of smart people firmly believe in mocking out the DB. It can be done well, and does have upsides. It also requires great discipline around testing and opens up considerable risks. We made a tactical choice to include the DB socially to favor confidence over speed.

### Encapsulate setup

Do not mock DB functions or DB interactions. Instead, use test factories and/or DB functions to set up the data as needed for your test to run correctly. Ideally, you should abstract your setup effectively to keep it DRY across multiple tests.

```ts
// ❌
await factories.workspace.create(/* ... */)
await factories.user.create(/* ... */)
await factories.workspaceMember.create(/* ... */)
await setAdminPrivileges(/* ... */)

// ✅
const { workspace, user, workspaceMember } = await createWorkspaceWithAdminUser()
```

### Interact with repos socially

Repos are our data-access layer, so treat them like the DB (see [Use the database socially](#use-the-database-socially)): don't fake the `Repos` object, and don't `jest.mock` a specific repo. Faking repos punches the same holes as mocking the DB — the test passes while the real wiring breaks. Every module has a harness that stands up real repos; use it.

```ts
// ❌ faking the whole Repos object
jest.mock("src/v2/repositories/Repos", () => ({ Repos: { member: { get: jest.fn() } } }))

// ❌ faking a specific repo
jest.mock("gather-game-logic/dist/src/repos/DeskBookingRepo", () => ({
  /* ... */
}))

// ❌ faking the server-side repos wrapper
jest.mock("gather-http-and-game-server-common/dist/src/withHSRepos", () => ({
  withHSRepos: jest.fn((_opts, fn) => fn({ createModel: jest.fn(), runInActionWithTx: jest.fn() })),
}))
```

**Browser / mobile** — use `TestSetupHarness.createAndEnterSpaceAsNewUser()` (from `gather-browser/testHelpers/TestSetupHarness`). It spins up a real game-logic client and initializes the global `Repos` singleton with real repos backed by that client. This is generally all you need.

```ts
// ✅
const { client, factories } = await TestSetupHarness.createAndEnterSpaceAsNewUser()
```

**gather-game-logic** — use a `GameLogicTestDriver` (from `testHelpers/framework/GameLogicTestDriver`). Create state through `driver.factories`, drive behavior through a client, and read repos for real via `driver.state.<Repo>` / `client.state.<Repo>`.

```ts
// ✅
const testDriver = new GameLogicTestDriver(sharedGameLogic)
const factories = testDriver.factories
const member = await factories.member.create({ role: MemberRole.Admin })
const testClient = testDriver.createClient({ authUserId: member.authUserId })
// ...exercise repos for real:
await testClient.state.Desk.createDesk({
  /* ... */
})
```

**gather-http-server** — let the handler build its repos through `withHSRepos` for real, and set up the data it reads with `factories.*.create(...)` (persisted to the test DB). When a test needs repos directly, call `withHSRepos(options, fn)` (from `gather-http-and-game-server-common/dist/src/withHSRepos`) rather than stubbing it. The models it loads are destroyed once `fn` settles, so return what the test asserts on as plain values or serialized models: reading a relation after that can come back empty instead of failing.

```ts
// ✅
const member = await factories.member.create()
const attendeeIds = await withHSRepos(undefined, async (modelRepos) => {
  const { meeting: loadedMeeting } = await loadMeetingAsAttendee({
    modelRepos,
    workspaceId: member.workspaceId,
    meetingId: meeting.id,
    memberId: member.id,
  })
  return [...loadedMeeting.attendeeIds]
})
```

## Mocking

### Avoid partial mocks

```ts
// ❌
jest.mock("src/utils", () => ({
  ...jest.requireActual("src/utils"),
  getRandomIntegerInRange: jest.fn(),
}))

// ✅ extract commonly mocked, related functions to a separate module
jest.mock("src/random")
```

Justin Searls captures the reasoning very well [here](https://youtu.be/Af4M8GMoxi4?si=PzPP885s_Vadi7t0&t=295) (4:55 - 8:25). Basically, when a module is partially mocked, it becomes hard to determine the root cause when a test fails. Partial mocking means a failing test can signal either a behavior change or some contract change, and it's unclear which.

Quite often, only a couple functions will "need" to be mocked, and those can often make sense living in a separate module. Since they need to be mocked anyway, it will then be more natural to create a `__mocks__` mock file and reuse it.

### Use `jest.replaceProperty` to control exported constants

To control an exported constant, config flag, or other property in a test, use [`jest.replaceProperty`](https://jestjs.io/docs/mock-function-api#replaced-properties) instead of partially mocking the module with a getter.

```ts
// ❌ partial mock plus a mutable variable, just to flip one value
var mockMaxRetries = 1
jest.mock("../retryPolicy", () => ({
  ...jest.requireActual("../retryPolicy"),
  get MAX_RETRIES() {
    return mockMaxRetries
  },
}))

// ✅
import * as retryPolicy from "../retryPolicy"

jest.mock("../retryPolicy")

jest.replaceProperty(retryPolicy, "MAX_RETRIES", 1)
```

`jest.replaceProperty` restores the original value automatically when `restoreMocks` is on, because Jest then runs `jest.restoreAllMocks()` before each test. Our base config turns it on, so there's no mutable `mockMaxRetries` to reset between tests. It also sidesteps the [partial-mock](#avoid-partial-mocks) pitfalls — the rest of the module keeps running for real.

It needs a plain object to write to, which is what decides whether you need that `jest.mock` line:

| Replacing a property on                        | Works                                                 |
| ---------------------------------------------- | ----------------------------------------------------- |
| an object (`process.env`, a config object)     | yes                                                   |
| `jest.mock("<module>")` with no factory        | yes, and the values you don't replace stay real       |
| `jest.mock("<module>", () => ({ ... }))`       | yes                                                   |
| a module's real exports, or a `__mocks__` file | no — throws `Property X is not declared configurable` |

The last row is the surprising one: a `__mocks__` file is itself a real module, so its exports compile to the same read-only getters the original has. (A package that compiles its own files with Babel is the exception — Babel emits writable properties.)

When the module has a `__mocks__` file and a test needs its own value, replace on something inside the module instead of on the module itself. Group the constants into one exported object and the property you're replacing belongs to that object, which is writable whether or not the module is mocked:

```ts
// retryPolicy.ts
export const RETRY_POLICY = { maxRetries: 5, backoffMs: 200 }

// __mocks__/retryPolicy.ts
export const RETRY_POLICY = { maxRetries: 1, backoffMs: 0 }

// the test
jest.replaceProperty(RETRY_POLICY, "maxRetries", 3)
```

A value the mock computes rather than states — one that varies per test — belongs behind a `jest.fn()` in the mock file, and the test sets it with `jest.mocked(getRetryPolicy).mockReturnValue(...)`.

### Put `jest.mock` statements at the top after imports

```ts
// ❌
describe("with some case", () => {
  jest.mock(/* ... */)
})

// ✅
jest.mock(/* ... */)

describe("with some case", () => {})
```

`jest.mock` statements are actually hoisted _above_ `import` statements during execution in Jest. This means you can't "scope" a `jest.mock` statement to a describe block, it will get lifted out magically but create the impression that it's scoped.

### Refer to spied methods directly

While you can return a spy from `jest.spyOn`, it's more natural to read in a test when you refer to the original method:

```ts
// not so good
const spy = jest.spyOn(console, "log").mockReturnValue()
// ...
spy.mockClear()
// ...
expect(spy).toHaveBeenCalledWith(/* ... */)

// good
jest.spyOn(console, "log").mockReturnValue()
// ...
jest.mocked(console.log).mockClear()
// ...
expect(console.log).toHaveBeenCalledWith(/* ... */)
```

It also gets around scoping issues, in case you're spying from a different file, you can still refer to the spied method
naturally here.

### Move complicated mocks into mock files

If you find yourself ever doing more than providing simple default values at only the first level, it's probably time to
consider making a mock file (under `__mocks__/thing`), so that structure is kept dry:

```js
// good
jest.mock("...", () => {
  foo: jest.fn().mockReturnValue(42)
})

// not so good
jest.mock("...", () => {
  foo: {
    bar: () => ({ baz: jest.fn().mockReturnValue(42) })
  }
})
```

### When there isn't a mock file, provide an inline mock

Sometimes there isn't a mock file and you want to provide behavior of the module exports.

```js
// not so good
jest.mock("../dateUtils")

mocked(currentTime).mockReturnValue(new Date("2021-11-20T09:00"))
mocked(formatDate).mockReturnValue("11/20/2021")
```

This works fine, but it's not really clear visually that `currentTime` and `formatDate` come from `dateUtils` file.

```js
// better
jest.mock("../dateUtils", () => ({
  currentTime: jest.fn().mockReturnValue(new Date("2021-11-20T09:00")),
  formatDate: jest.fn().mockReturnValue("11/20/2021"),
}))
```

This pattern has the added advantage of _only_ exposing the functions you mention, and no others, so the test becomes
more explicit about which parts of a module are being used. When you don't provide an inline mock and there's no mock
file, Jest will simply parse the file and replace all exports with Jest mock `jest.fn`'s.

### Use `mockReturnValue` for simple values

```ts
// ❌
jest.fn().mockImplementation(() => 42)

// ✅
jest.fn().mockReturnValue(42)
```

**Why?**

`mockReturn*` (or `mockResolved*` / `mockRejected*`) is declarative, simple to read, and only returns values.

### Use `when()` for simple "if this then that" mock behavior

```ts
// ❌
jest.fn().mockImplementation((arg) => {
  if (arg === 1) return "1"
  if (arg === 2) return "2"
  return "default"
})

// ✅
when(jest.fn())
  .calledWith(1)
  .mockReturnValue("1")
  .calledWith(2)
  .mockReturnValue("2")
  .mockReturnValue("default")
```

Using `jest-when` functionality is more declarative and easy to read, which fits with our strategy
of [favoring declarative over imperative code](../writing-code/STANDARDS.md#favor-declarative-programming-over-imperative).

### Only mock what is necessary and provide mock values that are used

```ts
// ❌
jest.mock("src/foo/bar")
jest.mocked(bar).mockReturnValue("not used")

// ✅
// (nothing)
```

Avoid mocking modules unnecessarily. This goes back to principles of social unit testing. Leaving unnecessary mocks in tests punches holes in our code for no reason and weakens test confidence.

### Avoid importing directly from `__mocks__` files

(Covered by this [lint rule](https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/no-mocks-import.md))

```ts
// ❌
import { specialFooBehavior } from "../../__mocks__/foo"

// ✅
import * as fooModule from "../../foo"
useAdditionalMockBehaviorInMocksFile(fooModule).specialFooBehavior
```

When you import directly from `__mocks__` in test, you run a mock file more times than Jest expects, and it will create two separate allocations in memory. The test will get its own "copy" of the mock file contents, separate from what is injected into the implementation.

```ts
// __mocks__/bar.ts
export const bar = []

// __tests__/test.ts
import { bar } from "../bar"
import { bar as directMockBar } from "../__mocks__/bar" // <-- this creates a separate allocation

jest.mock("../bar")

it("does something", () => {
  bar.push(1)
  directMockBar.push(2)
  bar // [1]
  directMockBar // [2] <-- they're separate arrays!
  expect(bar).not.toBe(directMockBar)
})
```

### Use `testSetup.js` to mock out modules that always need to be mocked

```ts
// ❌
// across hundreds of tests...
jest.mock("src/lib/axios")

// ✅ only once in testSetup.js
jest.mock("src/lib/axios")
```

Modules that "need to be mocked" generally can create a foot-gun for future test authors. They will write a test that exercises the module, the test might fail in some mystifying way, and they waste some time discovering that it needs to be mocked. Set your team up for success by adding "required mocks" to `testSetup.js` so new test files don't need to know it must be mocked.

### Use `beforeEach` for timer mocks setup

```ts
// ❌
describe("with some case", () => {
  jest.useFakeTimers()
  // ...
})

// ✅
beforeEach(() => {
  jest.useFakeTimers()
})
describe("with some case", () => {
  // ...
})
```

Both `jest.useFakeTimers` and `jest.useRealTimers` are **global operations** affecting the rest of the tests in the file; they are not scoped to an `it` or `describe` block (see docs [here](https://jestjs.io/docs/jest-object#jestusefaketimersfaketimersconfig), Andrew wrote them). Placing them in the `beforeEach` sets the "default" for the entire test file, and then that setting can be overridden with the opposite invocation in a specific test, like so:

```ts
beforeEach(() => {
  jest.useFakeTimers()
})

it("some case involving real timers", () => {
  jest.useRealTimers()
  // ...
})
```

### Avoid mocking at arbitrary layers

```ts
// given foo -> bar -> baz -> qux -> httpCall...

// ❌
jest.mock("./baz")

// ✅ the outermost layer
jest.mock("./qux")
// ✅ if you can't reach the outermost layer with reasonable test setup
jest.mock("./foo")
```

Related section of Justin Searls' talk [here](https://youtu.be/Af4M8GMoxi4?si=qsRuvoFxKxF4Io6o&t=1447) (24:05 - 26:07).

### Keep the SUT free of mocks

```ts
// in __tests__/test.ts...

// ❌
jest.mock("../test", () => ({ ...jest.requireActual("../test"), foo: jest.fn() }))

// ✅ extract foo to some place else, or don't mock it
jest.mock("../foo")
```

The code above doesn't actually work. Jest + TS makes it practically impossible (read: Andrew has not figured out how to do it). But aside from it not being feasible, it is a bad test design smell that contaminates the SUT. Only mock modules outside the SUT.

### No need to manually clear or restore mocks

Jest cleans up mocks between tests when its config sets `clearMocks` and `restoreMocks`, so a hook that only cleans up mocks is noise:

```ts
// ❌ Not needed - handled automatically
afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

// ✅ The jest base config handles this for you
// No manual cleanup required
```

Our jest base config sets `clearMocks: true` and `restoreMocks: true`, so each test starts clean. Jest defaults both to `false`, so check your config before deleting a cleanup hook. Without them, keep it.

### No need to manually destroy `Repos` between tests

In `gather-browser` and `gather-mobile`, an `afterEach` in `gather-browser/testSetup.js` tears down the `Repos` collection after every test case that initialized it through `TestSetupHarness`: it unmounts any mounted React trees, then destroys every started repo, which runs their destructors and unsubscribes their listeners and reactions.

```ts
// ❌ Not needed - the central teardown destroys collection repos after each case
afterEach(() => {
  Repos.meetingFrontend.destroy()
})

// ❌ Not needed either
afterEach(() => {
  Repos.reset()
})
```

This only covers repos in the `Repos` collection. A repo instantiated directly in the test (`new SomeRepo()`), and any non-repo object with a lifecycle (presenters, services, controllers), is not in the collection — those still need whatever cleanup they always did. Destroying a repo _as the behavior under test_ is also still fine; the central teardown is idempotent about it. Without a central teardown like this one, keep each test's own cleanup.

### Never use `Reflect` or casts to access private state

If you need to read or write private fields, or call private methods in a test, that's a signal to test through the public API instead, or to restructure for testability (extract a collaborator, expose a testing seam). `Reflect.get`, `Reflect.set`, and casts to access private members should be extremely rare — if truly unavoidable, encapsulate in a well-named helper, comment why, and flag for human review.

```ts
// ❌ reaching into private state to set up and invoke
Reflect.set(roomFilter, "ownMemberIdForVisibilityFallback", memberId)
Reflect.set(roomFilter, "getVisibilityMemberInfo", () => ({ memberId }))
const result = (roomFilter as unknown as { isOwnMethod: (key: string) => boolean }).isOwnMethod(
  "Member",
)

// ✅ drive the same behavior through the public API
roomFilter.processModel("Member", factories.member.build({ id: memberId }))
```

### Don't manually override methods on the SUT

Replacing methods on the subject under test with `obj.method = () => ...` or `Reflect.set(obj, "method", ...)` is fragile and tends to make the test tautological — you're testing that your override returns what you told it to return. Set up real system state through public APIs, or use proper DI/mocking at boundaries.

```ts
// ❌ overriding SUT methods to force a code path
Reflect.set(roomFilter, "isSubscribedToModel", () => false)
Reflect.set(roomFilter, "getVisibilityMemberInfo", () => ({ memberId }))

// ✅ configure the real system so the code path is exercised naturally
const filter = createRoomFilter({ subscriptions: [], memberId })
```

### Don't manually override methods on collaborators

Directly replacing methods on collaborator objects is usually a signal you're testing implementation details. If you _must_ override a collaborator, use `jest.spyOn`. With `restoreMocks` on, it restores the original after each test, and it makes the override visible in the test output.

```ts
// ❌ raw method replacement — won't be cleaned up, easy to leak between tests
someObj.someMethod = () => ({
  /* ... */
})

// ✅ if you must override, use spyOn so cleanup is automatic
jest.spyOn(someObj, "someMethod").mockReturnValue({
  /* ... */
})
```

### Avoid brittle one-off type casts

Don't cast to ad-hoc inline type literals that duplicate a slice of an existing type. These drift silently when the real type changes, they're hard to skim, and they obscure what the test is actually doing. Use the real type, narrow it, or restructure the test so the cast isn't needed.

```ts
// ❌ brittle inline slice — duplicates part of the User type and drifts when User changes
const result = (response as unknown as { user: { id: string; email: string } }).user

// ✅ use the real type
const result = (response as UserResponse).user
```

### Avoid mocking `console.log`

```ts
// ❌
jest.spyOn(console, "log").mockImplementation(() => {})

// ✅
jest.mock("../Logger")
```

When silencing `info` statements in tests, mock out the `Logger` rather than `console` directly. The `console` is a primary way Node and Jest communicates to the engineer for errors. It's also a common way to debug issues ("console.log driven development"), which will then surprisingly not show in the test because the engineer doesn't realize `console` is mocked.

```ts
// ❌
jest.spyOn(console, "log")

// in the implementation...
console.log("debug") // will not print
```

Andrew has lost tens of hours from this mistake over his career, hunting around for why the code isn't running when in fact the log statements were just being swallowed. Let's not keep repeating it.

```ts
// ❌
jest.mock("../Logger")
jest.spyOn(Logger, "error").mockImplementation(noop)
jest.spyOn(Logger, "warn").mockImplementation(noop)

// ✅
import { setUpErrorSilencing } from "./logger"

setUpErrorSilencing()
it("handles some error case", () => {
  silenceLoggerErrors("Whiteboard failed to save for roomId")
  silenceLoggerWarnings("This is a warning")
  // ...
})
```

If you mock out `Logger` or `Logger.error`, you may be silencing legitimate errors from the server that would signal your test setup is wrong. Using `silenceLoggerErrors` or `silenceLoggerWarnings` ensures that only the errors/warnings you provide are the ones that get sent to the Logger.

## Error checking

### Be specific for `.toThrow` and not specific for `.not.toThrow`

When checking if an error is thrown, be specific with the error message, otherwise you'll get false positives.

```js
// ❌ might error for some unrelated reason like a syntax error
expect(() => someAction()).toThrow()

// ✅
expect(() => someAction()).toThrow("Some error message")
```

When checking if an error is _not_ thrown, be not specific with the error message, otherwise you'll get false positives.

```js
// ❌ might error with a different error message and this would still pass
expect(() => someAction()).not.toThrow("Some error message")

// good
expect(() => someAction()).not.toThrow()
```

### Prefer strings over regexes for `.toThrow`

`.toThrow` accepts either a string (substring match) or a regex. Prefer strings — they're simpler to read and write. Reach for a regex only when you need pattern features like wildcards or alternation.

```js
// ❌ regex when a string would work
expect(() => someAction()).toThrow(/foo/)

// ✅
expect(() => someAction()).toThrow("foo")

// ✅ regex is justified when you actually need pattern matching
expect(() => someAction()).toThrow(/foo.*bar/)
```

### Avoid `try/catch` in test cases to check for errors

This test may still pass, even if the code no longer throws an error:

```js
// ❌
it("throws an error when doing something", async () => {
  try {
    // doSomething might not actually error, and this test will still pass
    await doSomething()
  } catch (e) {
    expect(e.message).toEqual("Some error message")
  }
})
```

Instead, use `.rejects` and `.toThrow`.

```js
// ✅
it("throws an error when doing something", async () => {
  expect(() => doSomething()).toThrow("Some error message")
  await expect(doSomethingAsync()).rejects.toThrow("Some error message")
})
```

### Await the result, don't use `.resolves`

Prefer `const res = await ...` over `await expect(...).resolves.toEqual(...)`. It's easier to read and
debug — you can inspect `res` in a failing test instead of getting a generic promise rejection.

```js
// ❌
it("returns the value", async () => {
  await expect(fetchData()).resolves.toEqual({ id: 1 })
})

// ✅
it("returns the value", async () => {
  const res = await fetchData()
  expect(res).toEqual({ id: 1 })
})
```

## Assertions

### `toEqual` instead of `toBe`, usually

(Covered by `prefer-to-equal-for-primitives` lint rule.)

`.toBe` asserts about _referential identity_. While it's equivalent to checking the value for primitive JS types (
string, boolean, number, ...), favor reserving `toBe` for only assertions where you're specifically checking the
referential identity.

```js
expect(1).toBe(1) // nope
expect(1).toEqual(1) // yep

expect({ foo: 1 }).toEqual({ foo: 1 }) // yep, checks contents
expect({ foo: 1 }).not.toBe({ foo: 1 }) // yep, checks referential identity
expect(obj1).toBe(obj2) // yep, checks referential identity
```

### Avoid basic syntactic sugar matchers

(Covered by [this lint rule](https://github.com/jest-community/eslint-plugin-jest/blob/main/docs/rules/no-restricted-matchers.md))

```ts
// ❌
expect(res).toBeTruthy()
expect(res).toBeFalsey()
expect(res).toBeNull()

// ✅
expect(res).toEqual(true)
expect(res).toEqual(false)
expect(res).toEqual(null)
```

The basic syntactic sugar matchers do not make code easier to skim, especially when there are several `expect(...).toEqual` lines together. Keep things simple by sticking with `.toEqual`.

The syntax highlighting is also nicer for `toEqual`:

| ![expect(handIsRaised).toBeTrue()](https://i.imgur.com/spiKXal.png) | ![expect(handIsRaised).toEqual(true)](https://i.imgur.com/70A7Yvj.png) |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |

Here's a list of syntactic sugar matchers to generally avoid:

- `toBeNull` -- basic sugar
- `toBeUndefined` -- basic sugar
- `toBeNaN` -- basic sugar
- `toBeFalse` -- same as above
- `toBeTrue` -- same as above
- `toHaveProperty` -- just assert on the value, you get more specificity from the test
- `toBeFalsey` -- same as above
- `toBeTruthy` -- same as above

### Assert element presence explicitly in RTL tests

In React Testing Library tests, don't lean on a query as if it were an assertion. `getByText` (and the other `getBy*` queries) throw when the element is missing, but a bare `getByText("foo")` line reads like a query — it's not obvious it's checking anything. And `expect(getByText("foo").props.children).toEqual("foo")` is worse: the query already matched on that text, so re-asserting it is redundant, and reaching into `.props.children` is brittle.

Make the presence check explicit with a presence matcher:

```ts
// ❌ reads like a query; not obvious it asserts anything
getByText("foo")

// ❌ redundant (the query already matched "foo") and brittle
expect(getByText("foo").props.children).toEqual("foo")

// ✅ web (@testing-library/jest-dom)
expect(getByText("foo")).toBeInTheDocument()

// ✅ mobile (@testing-library/react-native)
expect(getByText("foo")).toBeOnTheScreen()
```

For absence, use the `queryBy*` variant (it returns `null` instead of throwing) with the negated matcher, rather than `toEqual(null)`:

```ts
// ✅ web
expect(queryByText("foo")).not.toBeInTheDocument()

// ✅ mobile
expect(queryByText("foo")).not.toBeOnTheScreen()
```

### Keep `expect(...).toWhatever` on one line

Structure the `actual` input so the assertion reads on a single line. If the call would wrap, pull it out into a `const` above.

```ts
// ❌ assertion spans multiple lines — the actual is buried
expect(
  routePathBuilder.build(AppRoutes.RoomDetail, {
    urlParams: { workspaceId, roomId },
    queryParams: { messageId },
  }),
).toEqual(`/workspaces/${workspaceId}/rooms/${roomId}?messageId=${messageId}`)

// ✅ pull the call out, keep the expect on one line
const res = routePathBuilder.build(AppRoutes.RoomDetail, {
  urlParams: { workspaceId, roomId },
  queryParams: { messageId },
})
expect(res).toEqual(`/workspaces/${workspaceId}/rooms/${roomId}?messageId=${messageId}`)

// ✅ trivial actual — fine to keep inline
expect(getFoo()).toEqual("foo")

// ✅ multi-line expected value is fine, the actual is still on one line
expect(getRouteConfigs()).toEqual([
  { path: "/workspaces/:workspaceId", exact: true, middleware: ["auth"] },
  {
    path: "/workspaces/:workspaceId/rooms/:roomId",
    exact: true,
    middleware: ["auth", "rateLimit"],
  },
])
```

Tests are easier to visually scan if `expect(something).toWhatever` fits on one line. It creates a standard reading pattern for skimming a test for functionality.

### Inline expected values

```ts
// ❌
const expected = [
  /* ... */
]
expect(doSomething()).toEqual(expected)

// ✅
expect(doSomething()).toEqual([
  /* ... */
])
```

### Test one thing, but be pragmatic about it

Test cases should generally "test one thing", but it's perfectly fine to write multiple `expect` statements within a
test case to make the test realistic.

It's also okay to be a little hand-wavy about the "test one thing" rule, and you can write the test cases to be generic
enough to consolidate multiple cases.

Take something like this:

```js
it("returns a status 200 in the happy path", async () => {
  const res = await runSomeHttpHandler()

  expect(res.status).toEqual(200)
})

it("returns the collection of thingys", async () => {
  const res = await runSomeHttpHandler()

  expect(res.resource).toEqual([
    /* ... */
  ])
})
```

It's "not wrong", but it's pretty reasonable to stick them into the same case so our test files don't explode in size:

```js
it("returns the collection of thingys", async () => {
  const res = await runSomeHttpHandler()

  expect(res.status).toEqual(200)
  expect(res.resource).toEqual([
    /* ... */
  ])
})
```

### Don't combine assertions into an arbitrary tuple

```ts
// ❌
expect([thingA, thingB]).toEqual([true, 1])

// ✅
expect(thingA).toEqual(true)
expect(thingB).toEqual(1)
```

Multiple `expect` lines are fine, so there's no reason to pack unrelated values into an array to save one. The tuple isn't a value the code produces. A failure prints the whole array diff, so you compare elements to find the one that moved. Packing a mock's `.mock.calls.length` in also costs you `toHaveBeenCalledTimes`, which prints the actual call count on failure.

### Avoid redundant examples within a test

When a test exercises an equivalence or invariant, one representative example is usually enough — two at most. Each additional example hits the same code path, adding noise without adding coverage. Trust the reader to generalize from a clear case.

```ts
// ❌ three variants of the same equivalence check — all take the same path
it("produces identical paths for builder vs driver-fallback resolution", () => {
  // ... setup ...

  expect(builderRouter.getPathForRoute(AppRoutes.SignIn)).toEqual(
    driverOnly.getPathForRoute(AppRoutes.SignIn),
  )
  expect(
    builderRouter.getPathForRoute(AppRoutes.RoomDetail, { urlParams: { workspaceId, roomId } }),
  ).toEqual(
    driverOnly.getPathForRoute(AppRoutes.RoomDetail, { urlParams: { workspaceId, roomId } }),
  )
  expect(
    builderRouter.getPathForRoute(AppRoutes.Dashboard, { urlParams: { workspaceId } }),
  ).toEqual(driverOnly.getPathForRoute(AppRoutes.Dashboard, { urlParams: { workspaceId } }))
})

// ✅ one representative case is enough when it exercises all the paths sufficiently
it("produces identical paths for builder vs driver-fallback resolution", () => {
  // ... setup ...

  expect(
    builderRouter.getPathForRoute(AppRoutes.RoomDetail, { urlParams: { workspaceId, roomId } }),
  ).toEqual(
    driverOnly.getPathForRoute(AppRoutes.RoomDetail, { urlParams: { workspaceId, roomId } }),
  )
})
```

If the extra examples genuinely exercise different branches (e.g. a route with params vs. one without), split into different test cases. If there's more than 3 cases, consider `it.each` to reduce test case setup noise.

### Use `pluck` to pull out a slice of data from an array for assertions

Use [Ramda's](https://ramdajs.com/) [`pluck`](https://ramdajs.com/docs/#pluck) function to map across an array of values and grab a particular prop.

```js
// ❌
expect(users.length).toEqual(3)
expect(users[0].name).toEqual("Andrew")
expect(users[1].name).toEqual("Billy")
expect(users[2].name).toEqual("Charles")

// ✅
expect(pluck("name", users)).toEqual(["Andrew", "Billy", "Charles"])
```

While we generally try to avoid using 3rd party libraries as a foundation of our tests, Ramda is extremely well-tested
and can be considered "part of JS" as far as code safety is concerned.

### Never `toHaveLength` + index into elements

Don't split an array assertion into a length check followed by indexing into individual elements. Assert the full array
directly — it's more concise and less brittle.

```js
// ❌
expect(results).toHaveLength(1)
expect(results[0]).toEqual({ pathname: "/", matches: [] })

// ✅
expect(results).toEqual([{ pathname: "/", matches: [] }])
```

For arrays with many elements where you only care about specific fields, combine with `pluck`:

```js
// ✅
expect(pluck("name", results)).toEqual(["Andrew", "Billy"])
```

### Be explicit about empty things

It's just easier to read.

```js
// ❌
expect(emptyArray).toHaveLength(0)
expect(Object.keys(emptyObject)).toHaveLength(0)

// ✅
expect(emptyArray).toEqual([])
expect(emptyObject).toEqual({})
```

### Avoid snapshot testing except in restricted cases

If you don't know about snapshot testing already, you can skip this section, because we'll probably not use them much
anyway.

Jest offers a shiny feature called [snapshot testing](https://jestjs.io/docs/snapshot-testing) which tries to automate
some parts of test maintenance for an engineer.

While it sounds great, there are many ways that snapshot testing is a footgun that encourages testing practices that
won't advance our goals at Gather. So, if you _really_ want to use snapshot testing, here's some cases where it's
permissible to use inline snapshots only:

1. `toThrowInlineSnapshot` --
   explanation [here](https://kentcdodds.com/blog/effective-snapshot-testing#error-messages-andlogs)
2. large generated output, e.g. tests for a codemod
3. css code (doubtful we'll need this any time soon)

### Avoid testing log statements

```ts
// ❌
expect(Logger.info).toHaveBeenCalledWith("some log")
// ✅
// (nothing)

// ❌
expect(Logger.error).toHaveBeenCalledWith("some error log")
// ✅
expect(() => doSomething()).toThrow("some error")
```

Tests should test behavior, not implementation. Testing log invocations should generally be avoided because they tend to be testing implementation details and not functionality. Log tests can decrease maintainability as log statements are likely to change over time, so they should be used judiciously.

**Exceptions:**

1. Cases where the only observable behavior is a `Logger.warn` or `Logger.error` statement (instead of a thrown error, etc.)
2. The log statement is essential to the functionality of the test subject, e.g. you're testing a CLI command and need to ensure a certain log is printed for the user to read
3. The logging is complicated or has business logic in it, and you want to validate the different edge cases

Exceptions should have a justification in the comments.

### Avoid testing metrics

```ts
// ❌
expect(mockEmitWorkspaceMetric).toHaveBeenCalledWith(expect.objectContaining({ amount: 5 }))
// ✅
// (nothing)
```

Metrics are observability code, so we [mock them at the boundary](#when-to-mock). That leaves nothing to assert except the mock call, which just restates the production line that called it. Metric names and tags change often, so the assertion breaks when the behavior didn't. Assert on the behavior that triggered the emission instead.

**Exceptions:**

1. The metric drives product behavior, e.g. usage-based billing reads the `UsageMetric` rows that `UsageMetricEmitter` writes
2. The emission has real logic in it (accumulation, intervals, thresholds) and you want to cover the edge cases

Exceptions should have a justification in the comments.

### Avoid testing basic setters and getters

This connects to the rule about "write mostly useful tests."

Don't write tests for trivial getter/setter behavior, especially when using helper functions that are already tested:

```js
// ❌ Not useful - just testing basic get/set behavior
it("sets the user name", () => {
  const user = new User()

  user.setName("Alice")

  expect(user.getName()).toEqual("Alice")
})

// ❌ Not useful - createSetterFor is already tested, this adds no value
it("sets the status via generated setter", () => {
  const obj = { status: "initial" }
  const setStatus = createSetterFor(obj, "status")

  setStatus("updated")

  expect(obj.status).toEqual("updated")
})

// ✅ Useful - tests meaningful business logic
it("updates user status and logs the change", () => {
  const user = new User({ name: "Alice", status: "active" })

  user.deactivate()

  expect(user.status).toEqual("inactive")
  expect(auditLog.lastEntry()).toMatchObject({ action: "user_deactivated", userId: user.id })
})
```

If you're using a utility like `createSetterFor(...)` that already has its own tests, testing it socially in your code doesn't add confidence—you're just verifying that basic property assignment works, which JavaScript handles reliably. Always question whether your test is adding value.

### Use `toEqual` for up to 2 prop assertions, `toMatchObject` otherwise

```ts
// ❌
expect(obj.prop1).toEqual(1)
expect(obj.prop2).toEqual(2)
expect(obj.prop3).toEqual(3)

// ✅
expect(obj).toMatchObject({ prop1: 1, prop2: 2, prop3: 3 })
```

It strikes a balance between ease of reading (`expect(obj.prop1)` is obviously a partial matcher to the whole object) while not overwhelming a test with visual clutter for larger matches.

### Use `.toIncludeSameMembers` for order-agnostic array comparisons

Use [`.toIncludeSameMembers`](https://jest-extended.jestcommunity.dev/docs/matchers/array/#toincludesamemembersmembers) when you need to compare array contents but don't care about order. It's more expressive and precise than `expect.arrayContaining`.

There are other matchers available as well for array comparisons (e.g. comparing subsets, etc.).

```ts
// ❌
expect(result).toEqual(expect.arrayContaining([1, 2, 3]))

// ✅
expect(result).toIncludeSameMembers([1, 2, 3])
```

### Use concrete, non-dynamic expected values

```ts
// ❌
const res1 = someFunctionUnderTest()
const expected1 = someOtherFn()
expect(res1).toEqual(expected1)

// ✅
const res2 = someFunctionUnderTest()
expect(res2).toEqual({
  /* ... */
})
```

Using dynamically generated expected values have 2 issues:

1. They might be tautological -- the code in `someOtherFn` might be similar to `someFunctionUnderTest`, so you're basically defining the expected result from what's already under test
2. They're hard to visualize -- it's hard to grasp what the return value of `someOtherFn` is without reading it, whereas an explicit, hard-coded value is clear and easy to read
