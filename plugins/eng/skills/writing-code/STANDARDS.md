<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction](#introduction)
- [Why this matters](#why-this-matters)
- [Contributing](#contributing)
- [Principles](#principles)
  - [Keep a product mindset](#keep-a-product-mindset)
  - [Optimize for sustainable team velocity](#optimize-for-sustainable-team-velocity)
  - [Keep the kitchen clean](#keep-the-kitchen-clean)
  - [Design for change](#design-for-change)
  - [Make time for Continuous Improvement (Kaizen 改善)](#make-time-for-continuous-improvement-kaizen-%E6%94%B9%E5%96%84)
- [Strategies](#strategies)
  - [Keep a product mindset](#keep-a-product-mindset-1)
    - [Ask for design feedback early](#ask-for-design-feedback-early)
    - [Be scrappy](#be-scrappy)
    - [Optimize after measuring](#optimize-after-measuring)
    - [Don’t trust the client](#dont-trust-the-client)
  - [Optimize for sustainable team velocity](#optimize-for-sustainable-team-velocity-1)
    - [Write automated tests for your code following the Gather Testing Style Guide](#write-automated-tests-for-your-code-following-the-gather-testing-style-guide)
    - [Readability over cleverness/conciseness](#readability-over-clevernessconciseness)
    - [Favor declarative programming over imperative](#favor-declarative-programming-over-imperative)
    - [Favor evaluation of expressions over control flow and `let` reassignment](#favor-evaluation-of-expressions-over-control-flow-and-let-reassignment)
    - [DRY, WET, and the cost of the wrong abstraction](#dry-wet-and-the-cost-of-the-wrong-abstraction)
  - [Keep the kitchen clean](#keep-the-kitchen-clean-1)
    - [Limit the spread and blast radius of hacks](#limit-the-spread-and-blast-radius-of-hacks)
    - [Avoid unnecessary control flow branches](#avoid-unnecessary-control-flow-branches)
    - [Make implicit assumptions explicit](#make-implicit-assumptions-explicit)
  - [Design for change](#design-for-change-1)
    - [Aim for high cohesion, low coupling](#aim-for-high-cohesion-low-coupling)
    - [Create data abstractions and avoid primitive obsession](#create-data-abstractions-and-avoid-primitive-obsession)
    - [Tell, Don’t Ask](#tell-dont-ask)
    - [Refactor procedural code to OO/FP code when complexity grows (e.g. you have > 8 execution paths)](#refactor-procedural-code-to-oofp-code-when-complexity-grows-eg-you-have--8-execution-paths)
    - [Don’t talk to strangers (Law of Demeter)](#dont-talk-to-strangers-law-of-demeter)
    - [Favor OOP over FP](#favor-oop-over-fp)
  - [Make time for Continuous Improvement](#make-time-for-continuous-improvement)
    - [When something is jank, fix it (or: Devote 10% energy on refactoring)](#when-something-is-jank-fix-it-or-devote-10%25-energy-on-refactoring)
    - [Learn and practice something new each week](#learn-and-practice-something-new-each-week)
- [Rules](#rules)
  - [Extract magic numbers](#extract-magic-numbers)
  - [Avoid hidden side effects / give descriptive function names](#avoid-hidden-side-effects--give-descriptive-function-names)
  - [No side effects at module import time](#no-side-effects-at-module-import-time)
  - [Don't arbitrarily `return` in the middle](#dont-arbitrarily-return-in-the-middle)
  - [Avoid deep nesting](#avoid-deep-nesting)
  - [Filter before iterating instead of guard-returning in the callback](#filter-before-iterating-instead-of-guard-returning-in-the-callback)
  - [Write small functions / methods (< 20 lines)](#write-small-functions--methods--20-lines)
  - [Write small classes / files (typically < 100 lines, definitely < 500 lines)](#write-small-classes--files-typically--100-lines-definitely--500-lines)
  - [Favor private methods over non-exported functions beside a class](#favor-private-methods-over-non-exported-functions-beside-a-class)
  - [Wrap your 3rd party code](#wrap-your-3rd-party-code)
  - [Write code that survives when data structures gain new fields](#write-code-that-survives-when-data-structures-gain-new-fields)
  - [Use ternary or `doIt` instead of `let` reassignment for conditional variable assignment](#use-ternary-or-doit-instead-of-let-reassignment-for-conditional-variable-assignment)
  - [Encapsulate conditionals](#encapsulate-conditionals)
  - [Avoid double negatives](#avoid-double-negatives)
  - [Use long names for long scopes](#use-long-names-for-long-scopes)
  - [Don't name things after their structural role](#dont-name-things-after-their-structural-role)
  - [Descend only one level of abstraction in functions/methods](#descend-only-one-level-of-abstraction-in-functionsmethods)
  - [Avoid pass-through anonymous functions](#avoid-pass-through-anonymous-functions)
  - [Avoid implicitly accepting extra callback arguments](#avoid-implicitly-accepting-extra-callback-arguments)
  - [Do not pass methods as arguments](#do-not-pass-methods-as-arguments)
  - [Don't add defensive guards for states the type system prevents](#dont-add-defensive-guards-for-states-the-type-system-prevents)
  - [Use a null object instead of guarding an absent collaborator](#use-a-null-object-instead-of-guarding-an-absent-collaborator)
  - [Make switch statements exhaustive with `assertUnreachable`](#make-switch-statements-exhaustive-with-assertunreachable)
  - [Prefer `as const` objects over TS enums and string-literal unions](#prefer-as-const-objects-over-ts-enums-and-string-literal-unions)
  - [Favor `DateTimeExt` over JS `Date` objects](#favor-datetimeext-over-js-date-objects)
  - [Include the unit in numeric time names](#include-the-unit-in-numeric-time-names)
  - [Use `switchEnv` for environment-dependent values](#use-switchenv-for-environment-dependent-values)
  - [Respect abstraction layer boundaries](#respect-abstraction-layer-boundaries)
  - [Favor strong type safety and justify exceptions](#favor-strong-type-safety-and-justify-exceptions)
  - [Prefer type casts over @ts-expect-error](#prefer-type-casts-over-ts-expect-error)
  - [Avoid promise chains (.then/.catch) in favor of async/await](#avoid-promise-chains-thencatch-in-favor-of-asyncawait)
  - [Avoid `await foo().catch(...)`; use `try`/`catch` or `tryCatchAsync`](#avoid-await-foocatch-use-trycatch-or-trycatchasync)
  - [Don't use the `void` operator on promises; use `fireAndForget`](#dont-use-the-void-operator-on-promises-use-fireandforget)
  - [Top-down vertical ordering of function dependencies](#top-down-vertical-ordering-of-function-dependencies)
  - [Use only the necessary number of parameters, fewer is better](#use-only-the-necessary-number-of-parameters-fewer-is-better)
  - [Keep log messages stable; put variable data in attributes](#keep-log-messages-stable-put-variable-data-in-attributes)
  - [Be judicious about logging PII; never log secrets](#be-judicious-about-logging-pii-never-log-secrets)
  - [Route observability through the gather-opentelemetry bridge](#route-observability-through-the-gather-opentelemetry-bridge)
  - [Don't give every entity its own reaction on shared state](#dont-give-every-entity-its-own-reaction-on-shared-state)
  - [Assign undefined instead of deleting a class field](#assign-undefined-instead-of-deleting-a-class-field)
  - [Comments](#comments)
    - [Write good comments, but write good code first](#write-good-comments-but-write-good-code-first)
    - [Explain why, not what](#explain-why-not-what)
    - [Explain the system once, in the place that owns it](#explain-the-system-once-in-the-place-that-owns-it)
    - [Put comments at the relevant line](#put-comments-at-the-relevant-line)
    - [Pinpoint which decisions actually need context](#pinpoint-which-decisions-actually-need-context)
    - [Write for experienced teammates](#write-for-experienced-teammates)
    - [Link to the source](#link-to-the-source)
    - [Explain code that looks wrong](#explain-code-that-looks-wrong)
    - [Enforce rules with code, not comments](#enforce-rules-with-code-not-comments)
    - [Don't use section-divider comments in classes](#dont-use-section-divider-comments-in-classes)
    - [Don't reference the old way of doing things in comments](#dont-reference-the-old-way-of-doing-things-in-comments)
    - [Don't use forbidden phrases](#dont-use-forbidden-phrases)
    - [Clean up existing TODOs that show up in your PR diff](#clean-up-existing-todos-that-show-up-in-your-pr-diff)
    - [Attach Linear stories to TODOs](#attach-linear-stories-to-todos)
    - [Only tag a Linear issue that still has work in it](#only-tag-a-linear-issue-that-still-has-work-in-it)
    - [Writing a comment is an analysis tool](#writing-a-comment-is-an-analysis-tool)
- [Patterns](#patterns)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Introduction

This document makes our guiding principles and standards more concrete in an effort to drive operational excellence in engineering. The patterns and standards we follow or intend to follow are broken into three sections, with different purposes for each:

> **Principles**: there are five high-level principles that every engineer should hold in the back of their mind at all times. They frame and motivate the creation of strategies and rules that help actualize the principles.
>
> **Strategies**: these are abstracted patterns or mindsets that help us achieve our principles. They may have examples of code, but for the most part, they’re more zoomed out. Dig through the strategies to find software engineering patterns you want to strengthen. It’s best to focus on one or two in a given week.
>
> **Rules**: these are more concrete, code-oriented standards and patterns that we aim to follow in the codebase. Some will hopefully be turned into lint rules over time.

The **principles**, being more abstract, will probably not reveal specific concrete actions or decisions to be taken. They help ground conversations in our engineering work through all phases of product delivery and maintenance. We should hold these principles in mind when evaluating tradeoffs.

The **strategies** and **rules**, being more specific, can be used to guide code and provide feedback. Feel free to link to strategies or rules while providing PR feedback, as each section provides a detailed justification and explanation of the pattern.

Finally, there will be a section for Gather-specific patterns, around topics like rendering, frontend state storage, our modules system, etc. That section is not yet complete.

# Why this matters

Working in a large team on a shared codebase means finding alignment. Setting expectations around how we write code and what we prioritize means we can be on the same page about what matters. Finding alignment is hard, takes work, and means knowing which details to sweat. It raises the bar on engineering quality, speeds up our long-term velocity, and lowers costs to building.

Working in a large shared codebase without alignment is like living in a large shared house without rules around doing the dishes. The amount of labor becomes unbalanced and resentment quickly builds on both sides. We don't want that for Gather or our codebase. If everyone is writing code "their own way", it quickly leads to conflict.

![](https://i.imgur.com/rtvm3wO.png)

Alignment helps lead to a shared voice in a codebase. When you can't easily distinguish who wrote what code, it means you can navigate the code faster. Imagine reading a book where every chapter changes the writing style, switches between 1st and 3rd person perspective, and changes how time is treated. It would be difficult to read. In the same way, a codebase where every module or function is radically different leads to increased mental overhead in reading.

The **strategies** and **rules** generally focus on patterns of software engineering, rather than style. These sections are not meant to be JS code style guide, explaining why to use `//` vs `/** */`, or `const` vs `let`. Instead, they focus more broadly around how we structure and write code to keep it readable.

They may feel frustrating or limiting at times. We strive to give every engineer independence and latitude to write code well and evolve the style of our codebase. We need to balance this with ensuring the code is understood and unsurprising across a large group of people with diverse backgrounds. This tradeoff means agreeing upon concrete patterns that we agree as a team are worth the time and effort. Each strategy and rule incurs a maintenance cost, so new ones should be considered carefully before adding.

# Contributing

This is a living document that evolves over time. Changes are tracked in VCS and proposed as PRs for the team to discuss. We may consider a more formal process in the future.

Your contributions are strongly encouraged! If you find strategies, rules, or patterns that are missing, or you want to help set a new one for Gather, open a PR for discussion.

> **Keep the AI skill in sync.** The catalog of Principles, Strategies, and Rules in this document is mirrored as one-line entries in [`SKILL.md`](SKILL.md) so that AI agents writing code in this repo apply every standard. When you add, rename, remove, or restructure an entry here, update the skill in the same PR.

# Principles

## Keep a product mindset

Ultimately, our goal is to build a stellar product. Our work as engineers at Gather should be in service of this core purpose. In anything we do, we want to have a good answer to “is this helping us quickly build a high quality product?”

It’s important to build the right thing, and not just build a thing right. We should strive to understand deeply the needs of our users and the requirements on the product to meet those needs in the context of the particular problem we’re working on. When we make engineering tradeoffs we should take these considerations in mind.

Speed when building is critical; we need to always be thinking about it. Not just so that we make want we want to make faster, but also so that we can iterate faster and converge to the correct product and system faster. We want to be scrappy. This means quickly pivoting when you encounter unnecessary complexity/difficulty, and seeking the simplest path towards what really matters.

This principle manifests differently in different situations. We sometimes want to be extremely experimental and bias for learning over perfection. Other times, we’ll have a very clear idea of what needs to be built and make it fully perfect the first time around. What path we choose depends on our understanding of the users and the product.

![](https://i.imgur.com/1VBWhur.png)

[https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp](https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp)

Common to both paths is the end goal of building a very high quality product, and being thoughtful about what it takes to get there. We should be writing code that helps us iterate on and deliver a great experience, and thinking critically about how to achieve that goal most efficiently.

## Optimize for sustainable team velocity

Building a stellar product means iterating fast and continuing to evolve over time. We want to make sure we’re not trading short-term velocity for long-term slowness. We’re a team of software engineers, so we win when everyone goes fast, not when some individuals go fast. When you write code, build for the benefit of your team, not just yourself.

As a codebase grows, it becomes increasingly difficult to bolt on new functionality, or extend systems to new use cases. High quality code will help us deliver features rapidly for years to come.

![](https://res.cloudinary.com/value-object/image/upload/c_scale,w_1920/v1615565461/DDDEUTR/Design_Tradeoff.jpg)

[https://dddeurope.academy/ddd-accelerator/](https://dddeurope.academy/ddd-accelerator/)

Good design, clean code, driving down technical debt, testing, and refactoring all help reduce the cost of adding functionality over time.

Our goal is to continuously evolve a codebase that invites change, so that the product can grow sustainably and change over time. The payoff of good design and architecture is in reducing the cost of change in the future.

Making decisions like not writing tests, not writing comments, or sacrificing clean code may help an individual or small group go faster in the short-term, but will lose in the long-term. Poorly designed code is fast to build, but hard to extend. Hacking may be easier than preserving good design, but it passes the buck to the next person who deals with your code, leading to fragility, code rot, and bugs.

Writing maintainable code that is easy to understand and change improves the overall speed of a team. Code you write will most likely be worked on by other people down the road. If you design your code poorly, it slows them down exponentially more than it would slow you down to design it better.

## Keep the kitchen clean

In a kitchen, it’s hard to cook a meal when there’s dirty dishes filling the sink, the spice rack is disorganized, and we don’t know how old that chicken in the fridge is. A good restaurant has a place for all things, a well-organized system for a highly functioning team. Hence the term “_mise en place_”.

In a codebase, it’s hard to write features when there’s TODOs everywhere, convoluted code, giant utils files, and no tests.

![](https://i.imgur.com/uLwwTNZ.png)

[https://blog.monouso-direct.com/mise-en-place/](https://blog.monouso-direct.com/mise-en-place/)

Engineers need time to write not just the feature (or bugfix), but also to clean the kitchen while they’re there. Sometimes that means generally cleaning up types, refactoring code, or unwinding some hacks.

![](https://martinfowler.com/articles/is-quality-worth-cost/cruft-impact.png)

[https://martinfowler.com/articles/is-quality-worth-cost.html](https://martinfowler.com/articles/is-quality-worth-cost.html)

Other times it means doing a larger redesign of the system, so it will be ready to extend for the next feature. Engineers should be distrustful of the instinct to bolt some other piece of functionality onto a poorly structured system. Yes, it might be easier, but it means the next person who works on the code has to deal with an accretion of poor design choices.

Once a feature is built, it’s not “free”. That feature must be maintained, iterated upon to meet customer expectations, and built around or on top of to be kept free of regressions. Much like building a house, the house isn’t finished once it’s built; it requires continuous upkeep. Every software feature adds **maintenance load**. [Maintenance load](https://chelseatroy.com/2021/01/14/quantifying-technical-debt/) is the effort spent maintaining existing functionality. Asking a team to add more features when they’re at capacity on maintenance load is like trying to pour water into an overfull glass.

Technical debt can be conceptualized as interest payments being deducted from an engineer’s time. As technical debt grows, the efficiency of an engineer goes down, because they’re spending more of their energy and time paying off the interest from the debt. Paying the interest on technical debt is unavoidable, it has to be done in order to build new features.

![](https://www.excella.com/wp-content/uploads/2016/02/bluff.png)

[https://www.excella.com/insights/what-is-technical-debt](https://www.excella.com/insights/what-is-technical-debt)

As time goes on, it feels like productivity of an engineering team grinds to a halt. Product is wondering why nothing is getting done while Engineering feels like they’re working their tails off. It’s partially due to being bogged down in maintenance load and technical debt.

It also means paying down technical debt on a regular basis. As a codebase becomes increasingly messy, it costs engineers more time and energy in implementing each new feature. Our ideal is to pay down tech debt regularly down to a baseline.

![](https://blog.crisp.se/wp-content/uploads/2013/10/Screen-Shot-2013-10-11-at-17.33.441.png)

[https://blog.crisp.se/2013/10/11/henrikkniberg/good-and-bad-technical-debt](https://blog.crisp.se/2013/10/11/henrikkniberg/good-and-bad-technical-debt)

Practically, what we’ll likely see is setting a debt ceiling and cycling through periods of debt accumulation and cleanup.

![](https://blog.crisp.se/wp-content/uploads/2013/10/Screen-Shot-2013-10-11-at-17.35.191.png)

[https://blog.crisp.se/2013/10/11/henrikkniberg/good-and-bad-technical-debt](https://blog.crisp.se/2013/10/11/henrikkniberg/good-and-bad-technical-debt)

## Design for change

![](https://i.imgur.com/8gxPwjr.png)

No system is perfect, so we must embrace change in the code we write. We should make it easy to change business logic or design assumptions and not require shotgun edits across 40 files. By making our code easy to change, it gives us agility to adapt the product and also lets us remove cruft more rapidly.

Writing clean, well-architected code is about maximizing code _flexibility_, making it easy to change the parts, at the expense of some complexity understanding the whole system. By providing the right abstractions and encapsulations, you make it ease for components to work together and change behavior as needed.

![](https://i.imgur.com/wE2Hvx1.png)

[https://www.youtube.com/watch?v=XXi_FBrZQiU](https://www.youtube.com/watch?v=XXi_FBrZQiU)

It’s easy to write code making a bunch of assumptions about data structures, business logic, and how systems interact. But as soon as those are made, it makes the new code resistant to change. If you assume a data structure is a certain way, then suddenly the data structure can’t change without downstream consumers changing.

Tests are key to designing for change and supporting refactoring. Without tests, only the original author has any reasonable shot at safely refactoring the code, and even then there’s still huge risks for regressions. Tests allow you to redesign a system and ensure it still works correctly overall.

Refactoring and incremental design will be much harder to do if other principles and strategies aren’t generally respected. If the first pass is a couple of tightly coupled 1000-line monster functions, it will be much harder to safely change and refactor the system. (A 3,000-line `Workspace.ts` that started off innocently enough ends up very resistant to change, because it wasn’t built to change.) Write your code so it’s easy to change later once you discover what’s wrong about it.

The first time you write a feature, you’ll only have a rough sense of what needs to be built. There are many unknowns. It’s unclear what abstractions will be necessary.

This doesn’t mean abandon all coding practices, it just means you don’t need three layers of indirection to build the first prototype. It’s a way to avoid design paralysis. The goal is to provide enough design to make it easy to refactor later into better design. Consider the figure below for a decent meta-workflow for each iteration of a feature.

![](https://i.imgur.com/6bSf4C9.png)

1. Build whatever spaghetti code you want to get the feature working
2. Reflect on what you’ve learned, and pull out objects and functions to decompose the problem
3. If you didn’t drive with or write tests along with the implementation, write them now
4. Open the PR and complete the review process
5. Think about how you could improve your “first pass” of spaghetti code next time

On subsequent passes, when you have more context about the problem space and requirements, and a sense for what does and doesn’t work, refactor your code first. This should be easy with tests already in place. Restructure the system to fit in the new use case. Let abstractions and design emerge.

## Make time for Continuous Improvement (Kaizen 改善)

If you’re producing the same quality of code week after week following the same patterns and tools, there’s something wrong. We want to embrace a culture of continuous improvement, or kaizen.

Made famous by [The Toyota Way](https://en.wikipedia.org/wiki/The_Toyota_Way), “[kaizen](https://en.wikipedia.org/wiki/Kaizen)” means “change for better”. When you see something that’s broken or incorrect, fix it. Don’t leave it for the next person to tackle. One mark of a senior engineer is being able to deliver their work while making the system better as a whole during the process. When something is broken that can’t reasonably be tackled ad hoc, clarify what could be done to address the problem and advocate for its prioritization.

![](https://i.imgur.com/CmPMW6S.png)

Kaizen extends beyond fixing the problems around you in the codebase. It’s an invitation to look inward at your own processes and workflows. What is inefficient, cumbersome, or annoying about your daily work? What parts of your IDE do you still not understand or use slowly? What tools or software could you be using to make you more effective?

Finally, embracing Kaizen is about growing your own skillset as a software engineer and our design sense. Through intentional practice, we can improve the quality of our “first pass” of code over time, so that well-designed code comes just as naturally as churning out a 500-line procedural mess. How could you refine your craft? What concepts could you practice to build up your software design skills? What tests are you still bad at writing? What are some strategies or rules in this document that feel unfamiliar?

![](https://i.imgur.com/aV8n7AQ.png)

# Strategies

## Keep a product mindset

### Ask for design feedback early

A new abstraction that impacts majority of the team shouldn't come as a surprise, it should already feel reasonably familiar and intuitive by the time it lands in staging. One pitfall we've seen is an engineer going into a cave to design A New Way Of Doing Things™ but fail to get feedback early on whether the implementation is actually more understandable/clean/easy to use to others. The people who are going to "use" your code are your teammates, and other teams. Make sure you're actually solving their problems, and doing it in a way that's intuitive to them, not just to you.

Getting feedback early provides two benefits:

- More data points from other engineers on what the abstraction should do and what an intuitive interface looks like
- Avoid having to do significant rework at the PR stage

Practical actions would be what you'd expect: a RFC, a Slack thread or sync convos (with meeting notes into Slack or RFC).

### Be scrappy

Scrappiness doesn't just mean "hacking something together to get it working quickly" (though that is one aspect). It's about recognizing how to apply the minimum amount of work for the desired outcome, and being willing to quickly cut your losses when something turns out to be harder than it's worth. This still shows up even when the goal is high quality engineering. Some examples:

- You’ve written some complicated logic to handle one rare edge case. Instead of spending a lot of time on including it, step back and ask, "is it actually important for the product that we support this edge case." Often the answer is no.
- You're trying to fix some bug, it's pretty unclear what's going on, and you don't have a way to reproduce it. Instead of a) bashing your head against a wall trying to guess what's happening or devising increasingly complicated mocks for e2e tests, or b) doing a whole rewrite of the thing that's buggy, you can c) hotfix a couple quick logs/metrics into the affected code so you can just see what's actually happening when it happens, and get a lot more clarity with a lot less work
- You want to refactor something (e.g. a 3,000-line `Workspace.ts`) and hide a bunch of complexity behind an abstraction boundary, but then find yourself passing a bunch of optional args across the boundary because there's more varied cases than you first realized. You can give up on that design and instead put the boundary a little farther out, where it contains less functionality but the boundary is very clean

The emphasis is on quickly pivoting when you encounter unnecessary complexity/difficulty, and seeking the simplest path towards what really matters.

### Optimize after measuring

aka “don’t prematurely optimize”. Optimized code is often more complex or less readable in order to achieve its performance gains.

A concrete case for this would be around when to use declarative programming. Many FP-oriented immutable operations like `reduce` or `map` may be slower than writing it in vanilla JS, but it comes at the cost of readability.

```ts
// sad, but slightly faster
const arr2 = []
for (let i = 0; i < arr.length; i++) {
  arr2.push(arr[i] + 1)
}

// easy to read, but 2% slower
const arr2 = arr.map((x) => x + 1)
```

Interestingly, because of the constantly evolving JS engines, some patterns that were considered very slow are no longer quite so bad. Consider a `reduce` that either mutates an object or spreads a new object for each iteration, it is now basically equivalent.

![](https://i.imgur.com/ShcQpdz.png)

In many parts of our codebase, small or even large performance gains won’t matter because we’re not running that code often enough. However, in other parts, like in the rendering engine, a small difference could have huge impacts.

In general (for browser, video, engine, etc.), default to writing readable code, and optimize once you see evidence that it’s needed and that writing another way improves the performance. If you’re working in extremely large datasets or in the rendering engine, it’s safe to assume you should optimize for performance.

The same goes for adding complexity or abstractions in your code before understanding the patterns that will emerge. You don't need to handle every edge case or make every possible flow highly performant until you discover it's actively a problem.

### Don’t trust the client

Always assume input from the client is malicious. That means **sanitizing and validating** inputs on frontend and backend and avoiding remote execution risks.

## Optimize for sustainable team velocity

### Write automated tests for your code following the Gather Testing Style Guide

There are abundant reasons to write automated tests for your code. It prevents regressions, enables refactoring, provides documentation to future readers, and encourages better software design.

The key here is **automated tests**. If you do a manual test of your code and have no automated tests, it means the next person to touch the code or anything up- or downstream, they also have to do those manual tests, and they might not know what needs to be done.

Read and follow the [Gather Testing Style Guide](../unit-testing/testingStyleGuide.md) for more on writing tests.

### Readability over cleverness/conciseness

Design software to be easy to _read_ rather than easy to _write_. Each line of code is only written once but read many times by many engineers.

It’s better to be verbose and explicit than concise and implicit. This shows up in avoiding abbreviations (`peerManager` instead of `prManager`), naming your functions well, and adding comments. It also means avoid relying on some arcane aspect of the JS/TS language when there’s a more obvious alternative.

**Exceptions**: you can lean on shared/expected knowledge of the engineering team, and that knowledge can evolve over time.

### Favor declarative programming over imperative

Declarative programming means describing the logic or _intent_ of a subroutine without expressing its control flow. Imperative programming means controlling all the low-level details of the control flow. A common metaphor given is with baking a cake. With declarative programming, you’re telling a chef to bake a chocolate cake with sprinkles. With imperative programming, you’re laying out all the ingredients, specifying the order in which they’re mixed, etc.

Declarative programming takes some practice to learn the “vocabulary” of common operations like `map`, `filter`, `reduce`, etc. But once the vocabulary is shared, engineers can express themselves more effectively and simply with declarative programming. It also makes code easier to read, because the reader can focus on the intents, rather than inferring the intent from the control flow.

```ts
// there's SO MANY KINDS of imperative vs declarative, here are a couple:

// === Iterating ===
// bad
for (let i = 0; i < arr.length; i++) {
  doSomething(arr[i])
}
// also bad
for (const el of arr) {
  doSomething(el)
}

// good
arr.forEach(doSomething)

// === Transforming (many -> many mapping) ===
// bad
const res = []
for (let i = 0; i < input.length; i++) {
  res.push(fn(input[i]))
}

// good
const res = res.map(fn)

// === Filtering (many -> some) ===
const res = res.filter(filterFn)

// === Reducing (many -> one) ===
const sum = res.reduce(concat, "")
```

**Exceptions**: declarative programming and Ramda in particular [can have performance implications](https://stackoverflow.com/questions/71401443/differences-between-lodash-and-ramda#:~:text=Key%20Differences,most%20likely%20to%20change%20last.). If you’re working in low-level, extremely performant code (e.g. rendering engine), it may be more reasonable to be imperative. Bear in mind to **optimize after measuring**.

### Favor evaluation of expressions over control flow and `let` reassignment

(Related rule: [User ternary or `doIt` instead of let reassignment](#use-ternary-or-doit-instead-of-let-reassignment-for-conditional-variable-assignment)

The evaluation of _expressions_ is much easier to reason about than reading through control flow. Consider this snippet of code:

![](https://i.imgur.com/I3mQHVq.png)

Without looking inside the `if` block, it’s impossible to know whether `foo` is ever assigned to anything. Mutable variable assignment is generally harder to read, and doesn’t fundamentally create guarantees about assignment. With a `let/if` combo, you don’t know _for sure_ that your variable will get assigned. It’s also hard to know if other side effects or intents are happening within the control flow statement.

Contrast that with this code snippet:

![](https://i.imgur.com/YpmnHea.png)

Even without knowing the contents of the transformations, it’s abundantly obvious that `foo` is getting initialized to something. The reader doesn’t need to make a mental bookmark that `foo` can be reassigned and jump back and forth in the code to understand its value. The value of `let foo` is **temporal** (which line of code you’re on), while the value of `const foo` is not, which eases mental burden.

### DRY, WET, and the cost of the wrong abstraction

DRY means Don’t Repeat Yourself. WET means Write Everything Twice. These two diametrically opposing forces can and should coexist. The goal is to make it easy to create change in the system, which a principle like DRY can both make easier and harder.

If you follow DRY religiously, you wind up with the wrong abstractions. There are [many](https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction) [great](https://medium.com/ni-tech-talk/caught-in-a-bad-abstraction-55bfe6634b83) [articles](https://alexkondov.com/the-cost-of-wrong-abstractions/) out there on how the wrong abstraction is more expensive the code duplication. If you follow WET religiously, you may be creating unnecessary work when there’s an obvious abstraction to be made.

## Keep the kitchen clean

### Limit the spread and blast radius of hacks

Hacks can be mostly harmless and easy to manage by yourself, but quickly spiral out of control in a team context. When we write a hack, we know it’s a hack and shouldn’t be followed. But when you encounter something in the codebase that you haven’t written, it’s common to treat it as gospel and not just change it, holding [Chesterton’s Fence](https://fs.blog/chestertons-fence/) in mind. It’s easy to not know it’s a hack, and then build off it. Before you know it, the relatively innocent hack has replicated itself throughout the codebase and metastasized into a horrible pattern that is much harder to unwind.

If you’re going to write something you know is subpar in quality, make sure it doesn’t propagate itself in the codebase in the long run. Two techniques here (do either or both):

1. **Isolate via abstraction**: abstract it well, so others don’t have to worry about it, and it doesn’t impact the design of future development
2. **Isolate in time**: put a timeline on when this hack is going to get removed or made correct, and hold to it

Encapsulate the hack into a function or object that can be modified or extended later to incorporate better behavior. Aggressively label it as a workaround (even including `Workaround` in the name) to ward against people pattern-matching against it. Even better, identify when this hack should be removed (`[EXPIRE BY YYYY-MM-DD]`), so when someone comes along later and sees we’ve passed the expiration date of the hack, it can drive change.

In code and comments, call it a workaround rather than a hack. Read out of context, in a security audit for example, “hack” can sound like an exploit. “Patch” doesn’t work either: it already names our game-state and database patches (`applyPatches`, `DbPatch`), so a workaround labeled that way wouldn’t stand out in a search.

As an example, let’s assume that initially we’re going to pass some data along with an object as a “hack”, which will eventually live on a different object, and needs some additional parsing:

```ts
// bad
type Obj = { extraData: string }
const myFn1 = (obj) => {
  const data: ExtraData = JSON.parse(obj.extraData) as ExtraData
  // ...
}
const myFn2 = (obj) => {
  const data: ExtraData = JSON.parse(obj.extraData) as ExtraData
  // ...
}

// good
const myFn1 = (obj) => {
  const data = getExtraDataWorkaround(obj)
  // ...
}
// We're putting the data on Obj right now because of X, Y, Z.
// Eventually it'll be moved onto OtherObj, see ENG-1234.
// [EXPIRE BY 2022-10-01]
const getExtraDataWorkaround = (obj: Obj): ExtraData => JSON.parse(obj.extraData)
```

With the “good” approach, we can later change the implementation of `getExtraDataWorkaround` and see the places where it’s used to understand the spread of the hack and what code needs to be changed.

Your hacks should usually be at the "leaves" of code flows. You can imagine that code flows are like the branches of a tree, there is the main trunk path, which branches off into increasingly smaller, more focused, code, ending in leaves. If your main trunk is a hack, the tree itself loses stability, and the hack impacts the entire codebase. Making subsequent design decisions predicated on the hack make it increasingly difficult to fix the hack later.

A great example of a hack that is not at the leaves would be encoding workspace IDs as `somerandomuuid\My Workspace Name`. There's a few issues with this hack:

1. It's a hack that didn't buy much time. It would've been just as easy to store the UUID and the workspace name as separate fields, and combine them.
2. Every caller now assumes there's a `\` in the workspace ID, and that what comes after it is the workspace name. If you want the workspace name, you have to parse the id. Picture this assumption repeated in **45 places**. So the hack wasn't kept DRY or isolated via abstraction. It also affects how we write URLs.

```ts
// InviteForm.tsx
const [workspaceUuid, workspaceName] = workspaceId.split("\\")

// WorkspaceDetails.tsx
const workspaceHref = `${basePath}/app/${workspaceId.replace("\\", "/")}`

// workspacesApi.ts
const roomsUrl = `/api/workspaces/${encodeURIComponent(workspaceId)}/rooms`
```

You can start to see how this hack is serving at the foundation of the code flows and design. It is not on the leaves and not isolated. Much of the code is structured _around_ the assumption that the ID is serialized in this particular way.

So, be cautious and have a sense for what happens to the hack. Be aware of how easy a hack can entrench and replicate itself through others copying it as a pattern. Hacks are only tolerable when it’s abstracted, isolated, and there’s a plan for how to address it later.

### Avoid unnecessary control flow branches

Consider this code:

```ts
if (transientParams.itemIds) {
  const roomItems: { [id: string]: RoomItem } = {}
  transientParams.itemIds.forEach((id: string) => {
    roomItems[id] = mockItem.transient({ id }).build()
  })

  return roomItems
}

const id = sequence.toString()
const roomItems: { [id: string]: RoomItem } = { [id]: mockItem.transient({ id }).build() }
return roomItems
```

There’s some code duplication here, namely around `mockItem.transient({ id }).build()` and the type information. If that logic changed, the person would need to know they should update it in two places.

Contrast that with this code:

```ts
const itemIds = transientParams.itemIds || [sequence.toString()]
const roomItems: { [id: string]: RoomItem } = itemIds.reduce(
  (acc, id) => ({ ...acc, [id]: mockItem.transient({ id }).build() }),
  {},
)

return roomItems
```

### Make implicit assumptions explicit

Assumptions about the business domain, logic, or behavior that’s shared across modules, make those dependencies explicit with code.

Consider this implicit assumption about video streams and how many we display in a carousel:

```ts
// browser.js
const CAROUSEL_SIZE = 16
const visibleStreams = allStreams.slice(0, CAROUSEL_SIZE)

// video.js
const MAX_VIDEOS = 16
const connectedStreams = allStreams.slice(0, MAX_VIDEOS).forEach(connectToStream)
```

There’s an assumption here that only 16 videos display at a time in the carousel. There’s an implicit assumption and dependency between the two modules, but it’s not obvious or captured in code. This also violates the DRY principle.

Instead, you should make a shared value which connects the two modules together:

```ts
// shared.js
const MAX_VIDEOS_DISPLAYED = 16
```

## Design for change

### Aim for high cohesion, low coupling

**Cohesion** is how much elements in a class or module actually belong together, keeping related code together. **Coupling** is how much classes depend on each other.

In simpler terms, **cohesion** is “are all the things in this file/class/module related to each other?” and **coupling** is “how many other files/class/modules does this file/class/module depend on or interact with or know the inner workings of it?”

Within a module, it makes sense and is reasonable for all the elements to be closely entwined. Outside the module, however, the network should be simple, with ideally few dependencies, and ideally the module protects the inner workings and shape of its elements.

There are [four quadrants](https://enterprisecraftsmanship.com/posts/cohesion-coupling-difference/) that code falls into:

![](https://i.imgur.com/f9eWTbg.png)

Ideally we want low coupling and high cohesion:

![](https://i.imgur.com/PsskEKq.png)

In practice, we usually see code that falls into the category of “poorly selected boundaries” or “god object”.

![](https://i.imgur.com/DBEdrWF.png)

![](https://i.imgur.com/9d5LwNB.png)

There are many kinds of high coupling, but here’s an easy one to avoid: don’t make assumptions about the structure of other data models or manipulate them directly.

```ts
// bad
const followPlayer = (player, pet) => {
  // HIGH COUPLING -- assumes data structure (array) of `inventory` and
  // prop names (`type`, "Fish") of inventory items.
  if (!player.inventory.filter((x) => x.type === "Fish").length) return

  // HIGH COUPLING -- assumes position of a thing, and how count is tracked,
  // and manipulates it directly.
  player.inventory[0].count -= 1
  // ...
}

// good
const followPlayer = (player, pet) => {
  if (!player.hasFish()) return
  player.removeFish()
}
```

Similarly, there are many kinds of low cohesion. An easy one to avoid are “utils” junk drawers that hold a bunch of unrelated code, like a catch-all `api/v1/index.ts` or a giant `Workspace.ts`. Large files/classes are often an indicator of low cohesion, though not always.

There’s some pretty great [answers in Stack Overflow](https://stackoverflow.com/a/29523753/2672869) and many [blog posts](https://asleekgeek.com/high-cohesion-loose-coupling-1731b1f74bf6) on the topic if you want to dig more.

### Create data abstractions and avoid primitive obsession

Objects should **abstract** the data and not just provide an interface of getters/setters. From Martin’s Clean Code:

> Hiding implementation is not just a matter of putting a layer of functions between the variables […] A class does not simply push its variables out through getters and setters. Rather it exposes abstract interfaces that allow its users to manipulate the _essence_ of the data, without having to know its implementation.

Example:

```ts
// bad
player.inventory.items = { ...player.inventory.items, [itemId]: item }

// also bad
player.inventory.setItems({ ...player.inventory.items, [itemId]: item })

// good
player.inventory.addItem(item)

// also good, FP style
const player = addItemToPlayerInventory(player, item)
```

In the above example, it would make sense to have `Inventory` and `InventoryItem` classes or FP domains.

This strategy addresses the code smell called **primitive obsession**, where plain data objects are used in place of richer objects. From [Refactoring Guru](https://refactoring.guru/smells/primitive-obsession):

> Like most other smells, primitive obsessions are born in moments of weakness. “Just a field for storing some data!” the programmer said. Creating a primitive field is so much easier than making a whole new class, right? And so it was done. Then another field was needed and added in the same way. Lo and behold, the class became huge and unwieldy.

When you establish a pattern of using POJOs for everything, it becomes harder to encapsulate behavior and DRY up your code. Assume, for example, that a user’s phone number is stored as a simple string. It seems innocuous as first:

```ts
type User = { phoneNumber: string } // e.g. "555-123-4567"
```

Pretty soon the frontend is making assumptions about the shape of the data, and doing things like `user.phone.split('-').join('.')` to show the formatting differently. That’s fine, but what happens when people start joining from other countries, and you want to display the country code? Should you be storing the country code redundantly in the database? What about providing different flavors of formatting for the phone number? Or provide validation logic, which differs by country?

Suddenly that design decision becomes much harder to unwind, you must find all the places where that primitive was used. If a richer object had been written originally:

```ts
type User = { phoneNumber: PhoneNumber }
```

Then the `PhoneNumber` class could be easily extended in various ways to accommodate new behaviors.

At the same time, there's a danger with creating rich objects or structures prematurely, you can end up proliferating [data classes](https://refactoring.guru/smells/data-class), which are a separate code smell. Thoughtfulness is required around creating level of abstraction, and you should ask yourself "can this entity reasonably be represented as a primitive data type?" For example, should the first name of a user be a `string` or a `FirstName` class? Well, it depends: are you likely to only need to access the data, or do you expect to perform operations on it?

When it's not obvious that this entity will change and has behavior associated with it, default to using primitive data types. The cost of sometimes refactoring a primitive obsession where appropriate is less than the cost of too many data classes.

### Tell, Don’t Ask

The purpose of objects is to encapsulate and act on data that it contains. So it’s often an anti-pattern to ask an object for its data and then act on it. This is captured in the phrase, [Tell, Don’t Ask](https://martinfowler.com/bliki/TellDontAsk.html).

![](https://i.imgur.com/toDwcbT.png)

In code:

```ts
// bad
if (user.age > ADULT_AGE_LIMIT) {
  /* ... */
}

// good
if (user.isAdult()) {
  /* ... */
}

// bad
const addUserAsAdmin = (user) => {
  const previousRoles = user.roles
  user.roles = [...user.roles, "admin"]
}

// good
const addUserAsAdmin = (user) => {
  addRole(user, "admin") // FP style
  user.addRole("admin") // OOP style
}

// bad
const isAdminPresent = user.roles.includes("admin") // ask + bad encapsulation

// good
const addUserAsAdmin = (user) => {
  addRole(user, "admin") // FP style
  user.addRole("admin") // OOP style
}

// bad
const isAdminPresent = user.roles.includes("admin") // ask + bad encapsulation

// good
user.isAdmin() // tell
```

The _meaning_ of data and its interpretation should be the responsibility of objects (or functions). This is an easy one to miss.

```ts
// e.g. in a react hook somewhere...
// bad
if (memberMovedEvent.roomId) {
  // room ID has changed, do something
}

// good, FP style
if (roomIdChanged(memberMovedEvent)) {
  /* ... */
}
// good, OOP style
if (memberMovedEvent.roomIdChanged()) {
  /* ... */
}
```

### Refactor procedural code to OO/FP code when complexity grows (e.g. you have > 8 execution paths)

On a basic level, good design is about adding the right amount of abstraction to 1. handle growing complexity, and 2. keep the code easy to change. Starting with procedural code to solve a problem that isn't complex is perfectly reasonable. But as the complexity grows and your number of execution paths (total number of pathways through the code) grows, your code will benefit from transitioning to OOP or FP abstractions to reduce the complexity. Highly structured code comes at the expense of being able to understand the whole system, but comes with the benefit that you shouldn't need to understand the whole (if the abstractions are right).

![](https://i.imgur.com/wwk9dzV.png)

Sandi Metz provides a great talk ([Polly want a message](https://www.youtube.com/watch?v=XXi_FBrZQiU)) on this topic to dig in more.

### Don’t talk to strangers (Law of Demeter)

It may be tempting to reach from where you are through a bunch of intermediary objects (or data structures) to some distant one. Let’s say you have a customer, which has a bike, and a bike has wheels, and wheels have a tire, and a tire can be patched. From customer, it may be tempted to do this:

```ts
customer.bike.wheels[0].tire.patch()
```

In this code, `customer` is talking to distant strangers: `wheels` and `tire`. It means that if `Wheel` or `Tire` changes, you might unexpectedly be changing code in `Customer` as well. This leads to a splash of code changes across many different, somewhat unrelated, files. Your code is now less flexible and more resistant to change.

Avoiding this strategy is known as “don’t talk to strangers”, or more formally as the [Law of Demeter](https://en.wikipedia.org/wiki/Law_of_Demeter). Usually LoD violations can be fixed by improving the interfaces, and passing messages through the intermediate objects with method invocations. With the previous example, we might fix it this way:

```ts
customer.bike.repair()

class Bike {
  repair() {
    this.wheels.forEach((wheel) => wheel.repair())
  }
}

class Wheel {
  repair() {
    this.tire.patch()
  }
}

class Tire {
  /* ... */
}
```

While LoD violations can lead to code inflexibility, they don’t always, and LoD shouldn’t be followed religiously. Sandi Metz in [POODR](https://smile.amazon.com/Practical-Object-Oriented-Design-Agile-Primer/dp/0134456475/ref=pd_lpo_1?pd_rd_i=0134456475&psc=1) puts it this way:

> Its fixed rules are not an end in themselves; like every design principle, it exists _in service_ of your overall goals. Certain “violations” of Demeter reduce your application’s flexibility and maintainability, while others make perfect sense.

Message chains like `customer.bicycle.wheel.tire.patch()` occur when your design thoughts are unduly influenced by objects you already know. [ … ] tantamount to saying, “there’s some behavior way over there that I need right here, and I know how to go get it.” The code knows not only what it wants but _how_ to navigate through a bunch of intermediate objects to reach the desired behavior.

>

### Favor OOP over FP

We chose OOP over FP as our central organizing paradigm: entities organize naturally as classes, which fits Domain-Driven Design. We liberally borrow FP concepts — declarative array operations, pure helpers, immutable value objects — but the unit of organization is the class, not the module of free functions.

The most common violation: a cluster of exported functions that all operate on the same type — loading it, deriving values from it, modifying it. That's data and behavior separated; the type is a domain model waiting to happen, and free functions clustered around one data shape are methods that haven't moved in yet (the "feature envy" smell). Put the behavior on the model.

For example, a feature starts as one function, then splits into several files, each exporting one function, all threading the same state object through their first parameter:

```
services/orders/
  loadOrderState.ts          // builds OrderState
  decideOrderDiscounts.ts    // (state: OrderState) => Discount[]
  buildOrderInvoice.ts       // (state: OrderState, discounts) => Invoice
  sendOrderInvoice.ts        // orchestrates the three above
```

Each file looks tidy in isolation, but the seams are wrong. The state type is exported solely so siblings can pass it around; every field is public because any function might need it; the "pipeline" order (load, then decide, then build) lives only in the orchestrator's imports; and understanding one step means grepping across files for who else touches the shared type.

```ts
// bad — data and behavior separated, state type public glue
export interface OrderState {
  order: Order
  customer: Customer
  priceTable: PriceTable
}
export const decideOrderDiscounts = (state: OrderState): Discount[] => { ... }
export const buildOrderInvoice = (state: OrderState, discounts: Discount[]): Invoice => { ... }

// good — the state is the object; the pipeline steps are its methods
export class OrderInvoicing {
  static async load(repos: Repos, orderId: Uuid): Promise<OrderInvoicing> { ... }

  private constructor(
    private readonly order: Order,
    private readonly customer: Customer,
    private readonly priceTable: PriceTable,
  ) {}

  decideDiscounts(): Discount[] { ... }
  buildInvoice(discounts: Discount[]): Invoice { ... }
}
```

The fields go private (nobody outside needs the raw state anymore), the shared interface disappears, and the callsite reads as the narrative the file layout only implied:

```ts
const invoicing = await OrderInvoicing.load(repos, orderId)
const discounts = invoicing.decideDiscounts()
const invoice = invoicing.buildInvoice(discounts)
```

The orchestrating function gets the same treatment: make it a noun-named service class with constructor-injected collaborators. Tests then inject fakes through the constructor instead of `jest.mock`-ing sibling modules or spying on `getInstance`:

```ts
export class OrderInvoiceService {
  static getInstance = lazily(() => new OrderInvoiceService(EmailService.getInstance()))
  constructor(private readonly emailService: EmailService) {}

  async sendForOrder(orderId: Uuid): Promise<void> { ... }
}
```

This complements "Refactor procedural code to OO/FP code when complexity grows": the trigger there is execution-path count; the trigger here is behavior clustering around a shared type — most visibly a state type exported only to thread between sibling modules. Two small functions sharing a type don't warrant a class — reach for this when the shared type is the only reason the export exists, or when a positional pile of results (a big `Promise.all` destructure, a context object grown to 4+ fields) is standing in for `this`.

Another example: a meeting reminder pipeline consolidation, where `loadMeetingReminderState` / `decideMeetingReminderRecipients` / `buildMeetingReminderPayload` (three files threading `MeetingReminderState`) became `MeetingReminder.load()` / `.decideRecipients()` / `.buildPayloads()`.

## Make time for Continuous Improvement

### When something is jank, fix it (or: Devote 10% energy on refactoring)

If we devoted even 10% of time for each feature on refactoring, our codebase would look dramatically different. Continuously improvement and refactoring is key to combating code rot and mounting technical debt.

When you see something that looks wrong, either fix it, or mark it to be addressed later. One-off improvements are made even easier with stacked PRs via [Graphite](https://app.graphite.com/), so the PRs stay focused.

### Learn and practice something new each week

We want to grow in our engineering craft over time. Pick something to intentionally practice each week, and make a little space each day or week to work on it. Maybe you want to try out a new workflow tool like [Graphite](https://app.graphite.com/). Or you want to experiment with encapsulation patterns in FP or OOP. Or you want to improve your shortcuts across your IDE and terminal. Whatever it is, find something interesting to pick up, and share with your team.

# Rules

## Extract magic numbers

Extracting magic numbers is one way to make the “configuration” of the business logic more obvious. Extracting them to the top of the file makes it easier to then move them to configurable values. Also it gives a name to what is otherwise a meaningless or implicit value.

## Avoid hidden side effects / give descriptive function names

Functions should not have surprising side effects. Instead, those should be referenced in the function name. Your function name should reasonably encapsulate what it does, otherwise it's misleading. If your function does multiple things, say it: `getUserAndSubscribeToNewsletter`, `deleteObjectByKeyAndSendObjectUpdates`, etc.

```ts
// bad
const addUserToNewsletter = async (email: string) => {
  const user = await getUserByEmail(email)
  if (!user) {
    const newUser = await createUser(email) // <-- side effect!
    await newUser.update({ newsletter: true })
    return newUser
  }
  await user.update({ newsletter: true })
  return user
}

// good
const upsertUserAndSubscribeToNewsletter = /* ... */
```

## No side effects at module import time

Importing a module must do nothing but define things. No timers started, no transports registered, no connections opened, no globals mutated, no SDK initialized — no `initializeSomething()` call sitting at the top level of a file.

```ts
// ❌ jobQueue.ts — importing this file, for any reason, opens the connection
connectToQueue(QUEUE_URL)

export const enqueueJob = (job: Job) => {}

// ✅ the module defines; the entry point decides when
export const initializeJobQueue = () => connectToQueue(QUEUE_URL)

export const enqueueJob = (job: Job) => {}
```

Why this one matters more than it looks:

- **You don't control when it runs.** The trigger is the import graph — what's reachable and in what resolution order — not your code. Adding an unrelated import, reordering two, or a bundler deciding to split a chunk changes when the side effect fires, or whether it fires at all.
- **Nobody can opt out.** A test that wants one pure function from the file gets the whole side effect, and its only escape is `jest.mock` on a module it doesn't care about. Same for a CLI command, a script, or a bundle that only wanted a type.
- **It's invisible at the callsite.** `import { enqueueJob } from "./jobQueue"` reads as free. Nothing in the diff of the importing file says a subsystem just started.
- **Ordering bugs stop being local.** When boot order genuinely matters — a client that must be connected before the first caller reaches for it — hanging it off import order makes correctness a property of the entire import graph instead of one readable sequence at the entry point.

So export an initializer and call it from whatever owns startup: the app entry point, a load task, the server bootstrap. Startup order then reads as a sequence in one file, and it's reviewable.

Defining a value is not a side effect — that's what modules are for. The line is whether importing the module changes anything outside it. For work that's expensive but must stay lazy, keep it behind first use rather than at import: `static getInstance = lazily(() => new Foo(Bar.getInstance()))` (`lazily` from `gather-common-including-video/dist/src/fpHelpers`).

Two legitimate exceptions, both narrow: **polyfills and instrumentation shims** that must patch globals before anything else loads (keep them in a dedicated file whose only job is that, imported first by the entry point and named so the import reads as deliberate), and **framework registration files** where the framework defines importing as the registration mechanism.

## Don't arbitrarily `return` in the middle

It is common to expect functions to return early near the top of the function (as guard clauses), or at the end of the function.

Avoid returning arbitrarily in the middle unless you have good reasoning. With a bit of code restructuring, you can probably push the return statement to the beginning or end.

Here's a good example of where it's easy to reduce the number of returns:

```ts
// bad
if (otherThing) {
  const foo = doSomething()
  return computeAValue(foo)
}
return computeAValue("someThing")

// good
return computeAValue(otherThing ? doSomething() : "someThing")
```

If you need multiple statements in your `if` block to do the work, consider pulling it out into its own function, or just inline with `doIt` when it's small enough:

```ts
// bad
if (otherThing) {
  // statement 1
  // statement 2
  // statement 3
  return computeAValue(foo)
}
return computeAValue("someThing")

// good
return otherThing ? doSomethingComplicatedAndReturnValue(foo) : computeAValue("someThing")
```

There are times when a return statement in the middle makes sense, when you want to "bail out" once you know the answer, or when you know there is no more work to be done.

```ts
const computeSomething = (thing, data) => {
  if (!thing) return null

  const dataFoo = calculateFoo(data)
  if (!fooIsReasonableForThing(thing, dataFoo)) return null

  return calcAnswerWithValidatedStuff(thing.foo, dataFoo)
}
```

## Avoid deep nesting

Deeply nesting blocks of code can reduce readability of your code. It indicates likely complexity in control flow that should be refactored.

A code block that has more than 2 levels of `if` blocks becomes very hard to read, especially when there’s other `else` branches to manage. If you need more than 2 levels, it should be refactored.

```ts
// kind of okay, max 4 execution paths
if (cond1) {
  if (cond2) {
  }
}

// hard to reason about, up to 8 execution paths when `else` is involved
if (cond1) {
  if (cond2) {
    if (cond3) {
    }
  }
}
```

When you encounter multiple layers of `if` nesting, you have a few options to address it:

1. Add guard clauses to exit early to remove a layer of `if` checking

   ```ts
   // problem code
   if (user) {
     // do something with user with too many if's
   }

   // becomes...

   if (!user) return
   // do something with user
   ```

2. Extract out other functions

   This can get you into trouble by just hiding execution paths in a deep stack trace, but is sometimes a good strategy by encapsulating logic into well-named chunks of code.

   ```ts
   // bad
   if (user) {
     if (user.email) {
       if (!user.signedUp) {
         newsletter.register(user)
       }
     }
   }

   // good
   if (user) {
     user.signUpForNewsletterIfNecessary()
   }
   ```

The same goes for deep nesting in general, not just with `if` statements. Deep nesting can indicate a function is operating at too many levels of abstraction and a lack of encapsulation of business logic.

Consider an `init` method too large to put in this document. It's 150 lines, with a max depth of 6. Can you easily, at a glance, know what is important to glean from this code, or what it's doing?

Contrast it with a refactoring like this, so now we're at 18 lines and a max depth of 1, without any variable reassignment:

```ts
class SomeClass {
  init() {
    return new Promise<void>((res) => {
      if (this.initialized) return res()

      this.awaitingInit.push(res)
      if (this.initializing) return

      this.initializing = true
      this.setUpCapacityFetching()

      // this will be MUTATED by the various functions below
      const initializedStatus = new InitializedStatus()

      this.unsubscribeWorkspace = this.loadWorkspace(initializedStatus)
      this.unsubscribeRooms = this.loadRooms(initializedStatus)
      this.unsubscribeUsers = this.loadUsers(initializedStatus)
      this.unsubscribeUserAccess = this.loadUserAccess(initializedStatus)
      this.loadRoomItems(initializedStatus)
    })
  }
}
```

## Filter before iterating instead of guard-returning in the callback

When a loop body starts by skipping some elements, express the skip as a `filter` on the collection instead of a guard `return` inside the callback. The pipeline states up front which elements get processed, and the callback body is left with only the real work. For nil checks, use `isNotNil` from `fpHelpers` — it's a type guard, so the filtered array is narrowed for you.

```ts
// bad, the guard hides which elements are actually processed
someArray.forEach((x) => {
  if (!x) return
  doSomething(x)
})

// good, the skip is declared up front and `x` is narrowed
someArray.filter(isNotNil).forEach((x) => doSomething(x))
```

Exception: hot paths / performance-sensitive code. Each `filter` allocates an intermediate array, so an in-callback guard is acceptable there (see [Optimize after measuring](#optimize-after-measuring)).

## Write small functions / methods (< 20 lines)

Functions should do one thing. If your function is more than 20 lines, it's probably doing more than one thing at different levels of abstraction and should be broken apart. When your function gets too long, it can be hard to hold the understanding of the function in your head, and becomes more complicated to test.

When you break a function apart, orient toward DDD: ask which model, value object, repo, service, or presenter should own the extracted behavior (see [Architecture building blocks](v2ArchitectureBuildingBlocks.md) and [Favor OOP over FP](#favor-oop-over-fp)). Don't split a function and drop the pieces into a random utils file — that trades one smell for another.

## Write small classes / files (typically < 100 lines, definitely < 500 lines)

Similar to writing small functions, classes and modules should do one thing. There's no magic number here, but if it's more than 100 lines, it's a smell, and more than 500 lines it's very hard to hold it all in your head as someone new to the code.

The same DDD orientation applies when splitting a class or file: the pieces should land on the architecture building block that owns them (a model's behavior onto the model, cross-domain coordination into a service, UI logic into a presenter — see [Architecture building blocks](v2ArchitectureBuildingBlocks.md)), not into a grab-bag helpers module (see [Aim for high cohesion, low coupling](#aim-for-high-cohesion-low-coupling)).

## Favor private methods over non-exported functions beside a class

When a file holds a class, a helper used only by that class belongs on the class as a `private` method, not as a non-exported function sitting next to it. The method gets `this`, so it stops taking the class's own state as parameters. `private` states the scope that a bare module-level `const` only implies. And the class stops being a partial description of its own behavior — you read the class, not the class plus the neighborhood.

```ts
// ❌ part of how CsvReport works, but living outside it and re-threading its state
const formatRow = (row: Row, separator: string): string => {}

export class CsvReport {
  render(rows: Row[]): string {
    return rows.map((row) => formatRow(row, this.separator)).join("\n")
  }
}

// ✅
export class CsvReport {
  render(rows: Row[]): string {
    return rows.map((row) => this.formatRow(row)).join("\n")
  }

  private formatRow(row: Row): string {}
}
```

Module scope is right when the function is genuinely independent of the class: a pure transform over its arguments that would read the same in any file, and that you'd move to a shared location the moment a second caller appeared.

Two cases specifically want to stay outside:

- **A helper that would otherwise be a `static`** on a class decorated with `@ga.observableClass`. The decorator makes the class name a stale reference inside its own body (the `noDirectClassRefsWhenDecorated` lint rule catches it), so module scope is the simpler answer.
- **A helper shared by two classes in the same file** — though that usually means the file wants splitting, with the helper going wherever it's most cohesive.

Don't move a private method out to module scope so a test can call it directly. Test through the public API (see [Never use `Reflect` or casts to access private state](../unit-testing/testingStyleGuide.md#never-use-reflect-or-casts-to-access-private-state)).

## Wrap your 3rd party code

Interacting with a 3rd party vendor or library introduces a brittleness to the codebase, making assumptions about the interface, types, and API, which are subject to change outside of our control.

Wrap vendor code in an abstraction layer that we control. This allows us to control the API, protects tests from details of the 3rd party API, and makes upgrades much easier by consolidating the interactions with the vendor library. Wrapping the code limits the coupling between our code and the vendor's.

**Exceptions**: foundational libraries like `ramda` , `phaser`, or `react` do not need to be wrapped, though it's better when things like phaser or react are consolidated. There's a tradeoff of surface area of the library, how much we use it, and whether it's reasonable to couple it to our codebase.

```ts
// in a controller...

// bad
const client = new google.auth.OAuth2({...})
client.setCredentials(token)
const calendarApi = google.calendar({ version: "v3", auth: client })
const calendars = (await calendarApi.calendarList.list()).data.items

// good
const googleCalendar = new GoogleCalendar(token)
const calendars = await googleCalendar.listCalendars()

// (in another file)
class GoogleCalendar {
  constructor(token) {
    this.client = new google.auth.OAuth2()
  }
  listCalendars() { /* ... */ }
}
```

## Write code that survives when data structures gain new fields

If one module depends on another, that dependency should be physical. That means importing from the other module, and not just copy-pasting some code or constant from it.

In describing operations to be done on data structures, make sure they are _complete_ without having to update code everywhere. For instance, perhaps we want to build an object by merging some parameters provided by the user and defaults:

```ts
type Obj = { foo: string; bar: string; baz: string }

const newObj: Obj = { ...objDefaults, foo: params.foo, bar: params.bar, baz: params.baz }
```

This type of code is brittle, because what happens when `Obj` is extended to include another data field? Suddenly the `newObj` code isn't merging in that field, even if it was provided by `params`. Merging the two dynamically will solve the problem:

```ts
const newObj: Obj = { ...objDefaults, ...params }
```

While the mistake is very obvious in a contrived example, identifying this problem will be subtle in the real world. Always ask yourself if your code will continue to work correctly if the objects were extended with other data fields. Try to build dynamic algorithms.

## Use ternary or `doIt` instead of `let` reassignment for conditional variable assignment

When the assignment depends on a conditional, either use a ternary (when it's simple evaluation) or a `doIt` helper when you need a closure and multiple variables.

```ts
// bad
let foo
if (something) {
  foo = "v1"
} else {
  foo = "v2"
}

// good
const foo = something ? "v1" : "v2"

// good when it doesn't fit in a ternary or you need scoped variables
const foo = doIt(() => {
  if (something) {
    // statements...
    // statements...
    return "v1"
  }
  // statements...
  // statements...
  return "v2"
})
```

## Encapsulate conditionals

Boolean logic is hard to understand, and it's even harder when you need to interpret the _meaning_ of the checks being written. Pull out a named function or method to describe the interpretation of the check for improved readability.

```ts
// bad
if (timer.time <= Date.now() && !timer.recurrent) {
  /* ... */
}

// good
if (timerHasExpired(timer)) {
  /* ... */
}
// also good
if (timer.shouldBeDeleted()) {
  /* ... */
}
```

This applies with extra force when two or three boolean checks travel together: that compound is a domain concept waiting for a name. Put the predicate on the model (or another domain construct — value object, repo, presenter) that owns the state being read, not in a random utils file. If most of the sub-expressions read off one object, that object is the home.

An example from a `ChatService`, where the same "does this message mention the current user" compound was duplicated in both `_shouldPlaySound` and `_shouldShowNotification`:

```ts
// bad, a service assembles the domain concept inline (and duplicates it across methods)
const isMentionedDirectly = message.hasMention(currentUser.id)
const isMentionedViaAtChannel =
  message.hasAtChannelMention && message.channel.hasMember(currentUser)
const isMentionedViaAtHere =
  currentUser.canReceiveNotifications &&
  message.hasAtHereMention &&
  message.channel.hasMember(currentUser)
const isMentioned = isMentionedDirectly || isMentionedViaAtChannel || isMentionedViaAtHere

// good, the concept lives on the model that owns the state
const isMentioned = message.isMentioning(currentUser)
```

`ChatMessage` already exposes `hasMention`, `hasAtChannelMention`, and `hasAtHereMention` — composing them into an `isMentioning(user)` method on the model gives the concept one name, one home, and one test site.

## Avoid double negatives

Negating a negatively-named predicate forces the reader to resolve a double negative in their head. Use the predicate that states the condition in the positive direction instead — the `fpHelpers` predicates come in pairs (`isEmpty`/`isNotEmpty`, `isNil`/`isNotNil`, `isUndefined`/`isNotUndefined`) precisely so a `!` never has to touch a negative name.

```ts
// bad, reader must resolve "not not empty"
if (!isNotEmpty(users)) return

// good
if (isEmpty(users)) return
```

The same applies to booleans and predicates you define: name them in the positive direction (`isEnabled`, `hasAccess`) so the worst a caller writes is a single `!`, never `!isDisabled`.

## Use long names for long scopes

The longer the scope of the function or the method, the more it matters to be precise with your names.

If you have a controller that's only a few lines long, having a generic variable like `fields` could be fine. But when it's a part of a 20-line function, greater specificity matters: `updateRoomTemplateFieldsFromUser`.

Or better yet, write functions with smaller scopes.

## Don't name things after their structural role

`Wrap`, `Wrapper`, `Helper`, `Util`, `Delegate`, `Base`, `Impl` — these name a slot in the plumbing, not the thing in the slot. They fit anything, so they tell a reader nothing, and the reader has to open the file to learn what they were promised in the name. Name the thing after the distinct job it does or the mechanism it's built on.

The most common shape is an interface plus one concrete implementation, where the implementation gets named after the interface:

```ts
// ❌ the name says "this implements Deferrable" — which the `implements` clause already says
class DeferrableWrap implements Deferrable {}

// ✅ the name says what makes this implementation distinct
class DeferrableAbortSignal implements Deferrable {}
```

Name an implementation after whatever separates it from the other implementations that could exist: its backing mechanism (`AbortSignal`, `Redis`, `InMemory`), its strategy (`Jittered`, `Exhaustive`), or its source (`Prisma`, `Livekit`).

Did you write this code, and end up with only one implementation? Delete the interface and keep the class — the interface is what forced the non-name. This applies to the code you just wrote, not to an interface that was already there, and not to one whose second implementation you're partway through writing. An interface with two implementations coming stays; name each one for its mechanism.

The same applies to parameters and fields. A constructor parameter called `delegate` names the pattern you used; name what the collaborator _is_ (`spanProcessor`, `downstreamExporter`) so the class body reads as behavior instead of pattern trivia.

`Wrapper` earns its keep in exactly one place: [Wrap your 3rd party code](#wrap-your-3rd-party-code), where wrapping the vendor is the whole job. Even there, prefer naming the capability we get (`Calendar`, `SpriteStore`) over the mechanic (`GoogleCalendarWrapper`).

## Descend only one level of abstraction in functions/methods

As part of making functions do only one thing, ensure that all statements within the function are at the same level of abstraction. Consider this controller code:

```ts
const userId = userInfo.id

const workspaceData = await getWorkspaceById(path.workspace)
const safeICalLink = getSafeICalLink(workspaceData)
const hasWorkspaceWideCalendar = !!safeICalLink

const calendarConnections = await getCalendarConnections({
  workspaceId: path.workspace,
  userId,
  provider: CalendarProvider.Google,
})

if (calendarConnections.length === 0) {
  return { status: StatusCodes.OK, resource: { hasWorkspaceWideCalendar, personalCalendars: [] } }
}

// Note: We'll need to handle multiple connections once supported.
const calendarConnection = calendarConnections[0]
const selectedCalendars = new Set(calendarConnection.settings.selectedCalendarIds)
googleCalendarAuthClient.setCredentials(calendarConnection.token)
const calendar = google.calendar({ version: "v3", auth: googleCalendarAuthClient })
const calendars = await calendar.calendarList.list()

const personalCalendars = (calendars.data.items || [])
  .map(({ id, primary, summary, summaryOverride, backgroundColor }) => ({
    id: id ?? "",
    accountId: calendarConnection.accountId,
    accountEmail: calendarConnection.accountEmail,
    summary: (summaryOverride || summary) ?? "",
    primary: !!primary,
    selected: id ? selectedCalendars.has(id) : false,
    color: backgroundColor ?? "",
  }))
  .sort((a, _b) => (a.primary ? -1 : 0))

return { status: StatusCodes.OK, resource: { personalCalendars, hasWorkspaceWideCalendar } }
```

In this controller handler, we see several levels of abstraction. Some are higher level, like `getWorkspaceById` or `getCalendarConnections`. We see a lower level of abstraction, however, in knowing how to set up and authenticate with the Google Calendar API library. Then we see a lowest level, of parsing the payload from the API response into domain objects we control, or that an account-wide calendar is represented by the existence of a `safeICalLink`.

Mixing levels of abstractions like this generally lead to confusion. Instead, when you need to drop down a level of abstraction, that's usually a signal to delegate to another method or function. Contrast that with the following:

```ts
const userId = userInfo.id

const workspaceData = await getWorkspaceById(path.workspace)
const hasWorkspaceWideCalendar = workspaceHasWideCalendar(workspaceData)
const calendarConnections = await getGoogleCalendarConnectionsFor(path.workspace, userId)
if (isEmpty(calendarConnections)) {
  return { status: StatusCodes.OK, resource: { hasWorkspaceWideCalendar, personalCalendars: [] } }
}

const calendarConnection = firstCalendarConnectionWorkaround(calendarConnections)
const personalCalendars = await getCalendars(calendarConnection)

return { status: StatusCodes.OK, resource: { hasWorkspaceWideCalendar, personalCalendars } }
```

Here it's much easier to see what's going on with the code flow at a high level. A reader can drop down in abstraction level into more `getCalendars` for more details, which is responsible for connecting to Google Calendar, parsing the payload, etc.

## Avoid pass-through anonymous functions

When it's safe to implicitly pass along arguments, supply a function directly as a callback rather than wrapping it with an anonymous function. This makes your code easier to read and reinforces FP principles and patterns.

Only apply this rule when you're working with functions that you control or are known to be stable (e.g. ramda functions).

```ts
const handleEvent = (event: Event) => {
  /* ... */
}
const subscribe = (eventName: string, cb: (event: Event) => void) => {
  /* ... */
}

// bad, unnecessary anonymous function
subscribe("someEvent", (event: Event) => handleEvent(event))

// good
subscribe("someEvent", handleEvent)
```

## Avoid implicitly accepting extra callback arguments

Extra parameters passed to a function are simply ignored. But there's a risk: if the function changes and more parameters are added, you might be accidentally passing the wrong values to the function.

`Array.prototype.forEach` and `Array.prototype.map`, for example, pass the `(element, index, originalArray)` as parameters to the callback function. Most people are only interested in the `element`, and will drop the other two arguments on the floor.

```ts
// ❌
const strings = ["foo", "bar"]
const doSomethingWithString = (str: string) => {
  /* ... */
}
strings.forEach(doSomethingWithString)
```

However, what happens when you change `doSomethingWithString` to also accept a number as a second parameter, but you don't intend for it to represent the index?

```ts
// ❌
const strings = ["foo", "bar"]
const doSomethingWithString = (str: string, indent: number) => {
  /* ... */
}
strings.forEach(doSomethingWithString) // no type error, but incorrect behavior
```

A subtle bug can also be found with mapping:

```ts
// ❌
// (parseInt takes a radix, which would be the index, and sadness ensues)
;["0", "1", "2"].map(parseInt) // [0, NaN, NaN]
```

There are two remedies: wrap in an explicit anonymous function, or use specialized functions like Ramda's `forEach` and `map` which only pass the element (specific to collection processing).

```ts
// good, shows parameters are being truncated
const handleEvent = (event: Event) => {
  /* ... */
}
subscribe("someEvent", (event: Event, _context: Context) => handleEvent(event))

// good, only works on the elements
const doSomethingWithString = (str: string) => {
  /* ... */
}
forEach(doSomethingWithString, strings)
const transformed = map(doSomethingWithString, strings)
```

## Do not pass methods as arguments

It's very easy to accidentally lose the `this` execution context when passing methods as arguments.

```ts
// bad, likely to break context and `this` will be incorrect
myArr.forEach(this.doSomething)
// okay, but bind can be unfamiliar and confusing
myArr.forEach(this.doSomething.bind(this))
// good, use explicit arrow functions for methods
myArr.forEach((x) => this.doSomething(x))
```

## Don't add defensive guards for states the type system prevents

If a value is typed as `string`, don't check `typeof x !== "string"`. If a method exists on a type, don't check `"get" in obj && typeof obj.get === "function"`. Excessive guards for impossible states bloat code 2-3x and obscure the actual logic. Guard at system boundaries only (user input, external APIs, untyped payloads).

When TypeScript doesn't know the type but you effectively do (e.g., you know the shape of a model from how it was constructed), use a type cast rather than a chain of runtime guards. The cast is a one-line acknowledgment; the guards are noise that makes the reader think the impossible cases are real.

```ts
// ❌ guards that can never fire — we know Account always has these fields and methods
const authProviderId = account.authProviderId
if (typeof authProviderId !== "string") return false
if (!("isAnonymous" in account) || typeof account.isAnonymous !== "function") return false

// ✅ cast once, then use normally
const { authProviderId, email } = account as Account
```

If you genuinely can't trust the types at a boundary (e.g., parsing an external payload), encapsulate the validation in one place rather than sprinkling guards throughout the consuming code.

```ts
// ✅ validate at the boundary, trust the result everywhere else
const account = parseAccount(rawPayload) // returns false if does not parse correctly, or whatever
if (!account) return false
doSomethingWith(account.authProviderId) // no guards needed here
```

## Use a null object instead of guarding an absent collaborator

When a collaborator only exists in some environments, the tempting shape is `Collaborator | undefined` plus a guard wherever it's used. The absence then has to be re-handled at every call site, and the guards outnumber the code doing work:

```ts
// ❌ every method re-asks whether the store is there
class DraftEditor {
  private _store = DiskDraftStore.isSupported() ? new DiskDraftStore() : undefined

  async save(draft: Draft) {
    if (!this._store) return
    await this._store.write(draft)
  }

  async restore() {
    if (!this._store) return []
    return this._store.readAll()
  }
}
```

Give the type a second implementation that satisfies the same contract by doing nothing, and decide once, where the collaborator is built:

```ts
type DraftStore = { write(draft: Draft): Promise<void>; readAll(): Promise<Draft[]> }

class DiskDraftStore implements DraftStore {
  /* ... */
}

/** Stands in where the platform has no disk: drafts don't survive a restart. */
class DiscardingDraftStore implements DraftStore {
  async write() {}

  async readAll() {
    return []
  }
}

// ✅ one decision at construction; the methods just do their job
class DraftEditor {
  private _store: DraftStore = DiskDraftStore.isSupported()
    ? new DiskDraftStore()
    : new DiscardingDraftStore()

  async save(draft: Draft) {
    await this._store.write(draft)
  }

  async restore() {
    return this._store.readAll()
  }
}
```

Name the stand-in after what it does to the work it's handed — `DiscardingDraftStore`, `NoDraftStore` — rather than after the pattern ([Don't name things after their structural role](#dont-name-things-after-their-structural-role)). A `Null` prefix is recognizable enough to use when nothing else fits.

Put the doc comment on the stand-in, and say what its emptiness means for the product ("drafts don't survive a restart"), because that consequence is invisible in a body with no statements.

Two cases where this is the wrong tool:

- **Callers need to behave differently, not just skip work.** A null object is right when the answer to "the collaborator is missing" is "do nothing, carry on". If the caller has to show different UI or take another path, that branch is real domain logic — keep it, and see [Encapsulate conditionals](#encapsulate-conditionals) for naming it.
- **The absence is a misconfiguration.** Silently doing nothing turns a broken deploy into a quiet feature outage. Fail loudly at startup instead.

## Make switch statements exhaustive with `assertUnreachable`

When you switch over a finite union or enum, prove you handled every case. End the switch with `assertUnreachable(x)` (from `gather-common/dist/src/utils`) in the `default` branch. It takes a `never`, so if someone adds a new variant and forgets a case, `x` is no longer `never` and the build fails — the switch points you straight at what to update.

This is an example of [Write code that survives when data structures gain new fields](#write-code-that-survives-when-data-structures-gain-new-fields): rather than trusting each switch to be found and updated by hand when a variant is added, `assertUnreachable` makes the compiler demand it.

```ts
// ✅ exhaustive — adding a new NoteFormat breaks the build until this switch handles it
switch (note.format) {
  case NoteFormat.Summary:
    return renderSummary(note)
  case NoteFormat.Transcript:
    return renderTranscript(note)
  default:
    return assertUnreachable(note.format)
}
```

Don't use `default` as a real fallback for cases you didn't enumerate. A `default` that returns a value or does work silently swallows new variants — the code keeps compiling, takes the fallback branch, and the missing case ships as a bug instead of a build error. Reserve `default` for `assertUnreachable`.

```ts
// ❌ default hides the missing case — a new NoteFormat silently renders as unknown
switch (note.format) {
  case NoteFormat.Summary:
    return renderSummary(note)
  default:
    return renderUnknown(note) // did a new variant land here? nobody finds out until it breaks
}
```

The exception is input that genuinely isn't a closed set (e.g. a raw string from an external payload). There a real `default` is correct — handle the unknown case explicitly and add a comment noting the switch isn't meant to be exhaustive.

## Prefer `as const` objects over TS enums and string-literal unions

For a fixed set of named values, use an `as const` object rather than a TS `enum` or a bare
string-literal union.

```ts
// ❌ enum — TS team is moving away from them: https://www.totaltypescript.com/erasable-syntax-only
export enum MeetingStatus {
  InProgress = "InProgress",
  Cancelled = "Cancelled",
}

// ❌ string-literal union — no runtime presence, so members aren't referenceable by
// name and listing the values needs a hand-maintained array that can drift from the type
type MeetingStatus = "InProgress" | "Cancelled"

// ✅ as const object — structurally typed, tree-shakeable, one source of truth
export const MeetingStatus = {
  InProgress: "InProgress",
  Cancelled: "Cancelled",
} as const satisfies Record<string, string>
export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus]
```

Use `as const satisfies Record<...>`, not a `: Record<string, string>` type annotation — the
annotation widens values to `string`, which makes indexed access `string | undefined` under
`noUncheckedIndexedAccess`. `satisfies` validates the shape while preserving the literal types, so
`MeetingStatus.InProgress` is `"InProgress"`, never `undefined`.

Default to keys and values that match, in PascalCase — `{ InProgress: "InProgress" }`,
not `{ InProgress: "inProgress" }`. It keeps the member name and its wire value the same
string, so there's one thing to grep for and no mental mapping between the two. This is a
convenience default, not a hard rule: use a different value shape when something external dictates
it (an existing DB column, a third-party API's casing, a persisted value you can't migrate).

Derive the list of values from the object instead of hand-maintaining a parallel array:

```ts
// ❌
const ALL_STATUSES: MeetingStatus[] = ["InProgress", "Cancelled"]

// ✅
const ALL_STATUSES = Object.values(MeetingStatus) // MeetingStatus[]
```

## Favor `DateTimeExt` over JS `Date` objects

The built-in `Date` is a poor tool for date logic: it's mutable, months are zero-indexed, arithmetic means hand-rolled millisecond math, and timezone handling is limited. Use `DateTimeExt` (from `gather-common/dist/src/valueObjects/DateTimeExt`), our wrapper around Luxon's `DateTime`, for constructing, comparing, adding/subtracting, and formatting dates. It's immutable, has a clear arithmetic and formatting API, and follows the "Wrap your 3rd party code" rule so we control the surface area.

```ts
// ❌ mutation and millisecond math
const expiresAt = new Date()
expiresAt.setTime(expiresAt.getTime() + 24 * 60 * 60 * 1000)

// ✅
const expiresAt = DateTimeExt.now().plus({ hours: 24 })
```

**Exception**: boundaries that speak `Date` — Prisma fields, v1 interop, 3rd party APIs. Convert at the boundary with `DateTimeExt.fromJSDate(...)` on the way in and `.toJSDate()` on the way out, and keep everything in between on `DateTimeExt`.

## Include the unit in numeric time names

A number named `duration` could be milliseconds, seconds, or minutes. Nothing checks that its writer and its reader agree. A mismatch fails silently by a factor of 1k or 60k. Put the unit in the name, or carry it in the type with Luxon's `Duration`. Convert where the unit changes.

```ts
// ❌
const delay = index * stagger
type MeetingRow = { duration: number }

// ✅
const delayMs = index * staggerMs
type MeetingRow = { durationMinutes: number }
```

Option keys a library defines, such as Playwright's `{ timeout: 5_000 }`, keep the library's name.

## Use `switchEnv` for environment-dependent values

When a value differs by environment, use `switchEnv` from `gather-env-config/dist/src/env` instead of a chain of `isLocal()` / `isTest()` / `isProd()` checks. `switchEnv` takes one entry per `Env` member, so the compiler forces a decision for every environment — including the next one someone adds. A boolean chain routes every environment you didn't think about into whatever the final `else` happens to be, silently.

```ts
// ❌ dev falls into the Redis branch because nobody considered it
const cache = isLocal() || isTest() ? inMemoryCache : redisCache

// ✅ every environment is accounted for, and adding an Env member breaks the build until you decide
const cache = switchEnv({
  test: () => inMemoryCache,
  local: () => inMemoryCache,
  dev: () => inMemoryCache,
  staging: () => redisCache,
  prod: () => redisCache,
})
```

Pass thunks rather than bare values when a branch is expensive to build or has side effects — `switchEnv` only calls the one it selects. Bare values are fine for plain constants (all of them get evaluated).

That "the compiler forces a decision" property is the whole point, so don't defeat it: no spreading a shared default over the entries, no computing the object. If several environments share a value, name it above the call and reference it in each entry, the way `inMemoryCache` is above.

(Related: [Make switch statements exhaustive with `assertUnreachable`](#make-switch-statements-exhaustive-with-assertunreachable) — same forcing function, different shape.)

## Respect abstraction layer boundaries

Framework and infrastructure code must not know about domain models. If a framework class (e.g., a generic state manager in `src/framework`) starts referencing specific domain concepts — auth provider IDs, Account, Member — that's a design violation. The framework should be generic enough that you could open-source it without dragging your domain along.

When framework code needs domain-specific behavior, inject it: pass a callback, accept a strategy object, or use a generic type parameter. Don't hard-code domain knowledge into the framework layer.

```ts
// ❌ framework class reaching into domain models
class SyncScopeManager {
  private isOwnUser(model: ModelInstance): boolean {
    const account = this.repos.get("Account")
    return this.getAuthProviderIdFromUnknown(account) === this.authUserId
  }
}

// ✅ framework accepts an injected ownership check
class SyncScopeManager<TDomain> {
  constructor(private readonly isOwnModel: (key: string, model: ModelInstance) => boolean) {}
}
```

## Favor strong type safety and justify exceptions

TS is only safe if you don't break the rules; adding `any` or arbitrary type casting introduces risks. Where possible, follow strict typing practices, as guided by our eslint/tslint rules.

**Exception**: Sometimes it is either impossible or would take hours (not minutes) to correctly type something. There are rare cases where it's impossible or excessively complicated to type something correctly. They often involve interfacing with bad 3rd party code, parsing data, or writing foundational utilities in generics. It should first be brought to the team or someone knowledgeable about TS, and a solid effort made to address the typing issue. Make a justification in comments next to disabling the eslint rule. Similar to hacks, isolate and encapsulate the TS exemption with a function/method to keep it DRY and changeable for later.

```ts
// wrap it in a function so you can change the workaround later
const loadThingyWithDataUnsafeTS = async (id: number, data: SomeData) => {
  // Provide a justification for why ignoring this TS error / relaxing rules is safe
  return phaser.loadThingy(id, data as any)
}

const parseValueFromLocalStorageUnsafeTS = (key: string): Thing => {
  const storedJsonString = localStorage.getItem(key)
  // We know storedJsonString will always be a Thing because XYZ, this is generally safe, and it unperformant and very
  // complicated to explicitly check every part of the result for type casting.
  return JSON.parse(storedJsonString as string) as Thing
}
```

**Exception**: In tests, favor test readability over type soundness. It's more important you write maintainable tests that catch bugs, even if the type safety is a bit weaker. You can use tools like factories to help generate type-safe data easily, so you generally shouldn't need to exempt test data generated for models we control. Mostly this comes down to casting responses, especially from other external services or in dealing with functions that could return different types (for example, where the tester knows that the shape coming back will be an error, so just cast it, rather than strictly check).

## Prefer type casts over @ts-expect-error

When you need to bypass TypeScript's type checker, prefer using type casts (`foo as any`) over `// @ts-expect-error`. Type casts are less of a "hammer" - they only suppress type-checking for that specific expression, while `@ts-expect-error` can hide other unrelated issues like import errors, syntax mistakes, or other type problems on the same line.

```ts
// ❌ Bad - @ts-expect-error can hide other problems
// @ts-expect-error
const result = someComplexOperation(data)

// ✅ Good - type cast is more targeted
const result = someComplexOperation(data as any)

// ❌ Bad - could hide import or syntax errors
// @ts-expect-error
import { MaybeTypoedImport } from "./wrong-path"

// ✅ Good - import errors will still surface
import { SomeImport } from "./correct-path"
const result = (SomeImport as any).someMethod()
```

Using `@ts-expect-error` actually caused an incident in the past, because it hid a reference error:

```ts
// @ts-expect-error ❌ -- doesn't show the syntax error
doSomething(withAVariableThatDidNotExist)

// ✅ -- will reveal the syntax error but clobber any type problems
doSomething(withAVariableThatDidNotExist as any)
```

**Exception**: Use `@ts-expect-error` only when you're specifically testing that TypeScript should produce an error, or when the entire line/statement needs to be ignored for reasons that can't be addressed with casting.

## Avoid promise chains (.then/.catch) in favor of async/await

Use `async`/`await` instead of `.then()`/`.catch()` chains. Async/await is more intuitive, standard throughout our codebase, and can avoid subtle bugs.

**Why avoid promise chains:**

1. **Consistency**: async/await is the standard pattern throughout our codebase
2. **Error-prone**: Promise chains are easy to get wrong, especially with error handling
3. **Hidden subtleties**: Promise chains can hide important execution context details

Here's a specific pitfall with MobX:

```ts
// ❌ Bad - mutations in .then() won't be part of the MobX action
@ga.action.bound
doSomething() {
  somePromise.then((result) => {
    this.value = result // NOT part of the action!
  })
}
```

With this snippet, it's easy to "work around" there not being an async `@ga.action.bound` by making a promise chain. However, that hides the fact that mutations inside the `then/catch` will not be part of an action.

By forcing yourself to use `async/await`, you have to make clearer choices like having an async bound function, that then delegates to `@ga.action`s.

```
// ✅ Good - with await, it's clear what's part of the action
async doSomething = () => {
  const result = await somePromise
  this.setValue(result)
}

@ga.action()
setValue(result) {
  // ...
}

// ✅ Also good - if you need the action behavior in the continuation
@ga.action.bound
doSomething() {
  fireAndForget(somePromise.then(ga.action((result) => {
    this.value = result // Now properly wrapped in action
  })))
}
```

One exception is using `.then` when you need to chain off something that you are deliberating doing as a fire-and-forget.

```ts
// ✅ this is fine
fireAndForget(
  somePromise.then(() => {
    // ...
  }),
)
```

## Avoid `await foo().catch(...)`; use `try`/`catch` or `tryCatchAsync`

Don't attach `.catch()` to an awaited promise, whether the result is discarded or stored:

```ts
// ❌ Bad
await foo().catch((e) => handleError(e))

// ❌ Bad
const a = await foo().catch(() => fallback)
```

This mixes promise-chain error handling with `await`, which has the same problems as a full
`.then()`/`.catch()` chain (see [Avoid promise chains](#avoid-promise-chains-thencatch-in-favor-of-asyncawait)).
It reads awkwardly, the `catch` callback's return type silently widens the result, and it's easy to
misjudge what value `a` holds when `foo()` rejects.

Use a `try`/`catch` block instead:

```ts
// ✅ Good
try {
  await foo()
} catch (e) {
  handleError(e)
}
```

When you need to assign the result, reach for `tryCatchAsync` so the value stays in a `const`:

```ts
// ✅ Good
const a = await tryCatchAsync({ try: () => foo(), catch: () => fallback })
```

> **Lint rule**: `@gathertown/no-await-catch` enforces this at build time.

## Don't use the `void` operator on promises; use `fireAndForget`

Don't prefix a promise with the `void` operator to float it. `void somePromise()` hides your intent — a reader can't tell whether ignoring the result is deliberate or a mistake — and it drops rejections on the floor, so a failure surfaces as an unhandled promise rejection with no logging.

```ts
// ❌ Bad - void hides intent and swallows errors
void Router.getInstance().replace(Routes.SignInForm)
onVerifyCode={() => void presenter.verifyOTP()}
```

Make a deliberate choice instead:

- If the caller can wait for the result, `await` it — or `return` it so the caller awaits.
- If you're intentionally not awaiting it, wrap it in `fireAndForget`. That states the fire-and-forget intent explicitly and logs any rejection instead of silently discarding it.

```ts
// ✅ Good - awaited when the result matters
await Router.getInstance().replace(Routes.SignInForm)

// ✅ Good - explicit fire-and-forget, rejections are logged
onVerifyCode={() => fireAndForget(presenter.verifyOTP())}
```

`fireAndForget` lives in `gather-common-including-video/dist/src/promises`.

## Top-down vertical ordering of function dependencies

Put related code close together vertically, and organize your functions top-down in order of the call stack.

```ts
// bad
const petStuff1 = () => {}
const playerStuff1 = () => {}
const mapStuff1 = () => {}
const petStuff2 = () => {}
const playerStuff2 = () => {}
const mapStuff2 = () => {}

// good
const petStuff1 = () => {}
const petStuff2 = () => {}

const playerStuff1 = () => {}
const playerStuff2 = () => {}

const mapStuff1 = () => {}
const mapStuff2 = () => {}

// bad
const third = () => "done"
const second = () => third()
const first = () => second()

// good
const first = () => second()
const second = () => third()
const third = () => "done"
```

## Use only the necessary number of parameters, fewer is better

Uncle Bob says this in Clean Code about parameter length:

> The ideal number of arguments for a function is zero (niladic). Next comes one (monadic), followed closely by two (dyadic). Three arguments (triadic) should be avoided where possible. More than three (polyadic) requires very special justification -- and then shouldn't be used anyway.

Depending on what you're doing, 1-2 parameters are very reasonable. Beyond that, you're missing an opportunity to create helpful objects or data structures.

```ts
// bad
createEvent("Title", "2022-01-01 9:00", "2022-01-01 9:00")

// good
const range = new DateRange("2022-01-01 9:00", "2022-01-01 9:00")
createEvent("Title", range)

// bad -- just preserve the whole object
doSomething(foo.name, foo.description, foo.start, foo.end)

// good
doSomething(foo)
```

There's no reasonable hard and fast rule about parameter lengths. The “[I know it when I see it](https://en.wikipedia.org/wiki/I_know_it_when_I_see_it)” holds here. You should use it as a signal or a code smell, a potential opportunity to explore, rather than a rigid requirement.

## Keep log messages stable; put variable data in attributes

Log aggregation (an errors inbox, alert-on-new-error, spike detection) groups entries by their message string. If you interpolate unique values — IDs, timestamps, URLs, user input — into the message, each call produces a distinct group. That breaks deduplication, buries never-before-seen errors in the noise, and hides spikes.

Keep the message a short, stable string. Pass variable data through our context helpers — a bare object won't be picked up as structured fields. Worse, the logger passes any non-context arg through `util.format`, so a bare `{ roomId }` gets stringified into the message itself (`"Failed to load room { roomId: 'abc-123' }"`), which re-introduces the exact fragmentation the rule is meant to prevent. Only objects tagged by these helpers are treated as attributes:

**Backend** (`gather-server-common/src/logger`) — use `logContext` for attributes and `logErrorContext` for the `Error` itself:

```ts
import { logContext, logErrorContext, Logger } from "gather-server-common/dist/src/logger"

// ❌ Bad — unique id/timestamp in the message; every call is a new error group
Logger.error(`Failed to load room ${roomId} at ${Date.now()}`, err)

// ✅ Good — stable message, variable data in structured context
Logger.error("Failed to load room", logContext({ roomId }), logErrorContext(err))
```

**Frontend** (`gather-browser/src/utils/console`, re-exported from `gather-common-including-video`) — use `buildErrorContext`, which bundles the error and its attributes together:

```ts
import { buildErrorContext } from "gather-browser/src/utils/console"

// ✅ Good — stable message, error + attributes via buildErrorContext
Logger.error("Failed to load the room layout", buildErrorContext(err, { roomId }))
```

This matters most for `warn` and `error` logs, which feed error grouping and on-call alerts.

## Be judicious about logging PII; never log secrets

Logs ship to a third-party vendor and are retained, and anyone with access to that vendor can read them. Every piece of user data in logs widens the blast radius of a credential leak and complicates future data-deletion requests.

**Prefer stable IDs over PII.** User IDs, workspace IDs, and room IDs are cheap, unambiguous, and correlate across systems.

**Never log secrets.** This bar is absolute:

- Auth tokens, API keys, session cookies
- `Authorization` and `Set-Cookie` header values
- Values from the secrets manager and other credentials
- URLs whose query string may carry auth or session tokens — OAuth callbacks, signed webhook URLs, presigned S3 links, etc. Log the path only, or strip the token params. Logging general query params (e.g., request-debugging attributes in an error handler) is fine.

**Be careful with user-generated content.** Chat messages, calendar event titles/descriptions, physical locations, file names, and document contents are user data at scale and should almost never land in logs verbatim. If you need to log a payload that embeds them, redact first — see `redactedStringForPatches` in `gather-game-persistence` for the established pattern (a `JSON.stringify` replacer that swaps known PII keys with `"[REDACTED]"`). Add new domain-specific redactors following that shape rather than building a global redactor.

```ts
// ❌ Bad — raw patch embeds chat message text, calendar titles, etc.
Logger.error("Failed to apply patches", logContext({ patches: JSON.stringify(result.dbPatches) }))

// ✅ Good — redact known PII fields before logging
Logger.error("Failed to apply patches", logContext({ patches: redactedStringForPatches(result) }))
```

When in doubt, default to an ID.

## Route observability through the gather-opentelemetry bridge

All telemetry for the observability vendor goes through the `gather-opentelemetry` bridge, which owns the centralized config and sanitization. That covers client page actions, metrics, backend APM and custom events. Never import the vendor's agent or browser SDK directly.

- **Client** (page actions, custom metrics): the shared manager from `gather-opentelemetry/bridge/rum-registry`.
- **Backend** (APM, custom events): `gather-opentelemetry/bridge/apm`.

This is enforced by `no-restricted-imports` (static imports) plus `no-restricted-syntax` selectors (CommonJS `require()` and dynamic `import()`), so a direct import fails lint. The one sanctioned exception is the server APM bootstrap, which must load the agent at a precise time and carries a scoped `eslint-disable`.

Names come from the registry. Every event, metric and attribute is declared in `modules/gather-opentelemetry-types/registry/`, and its `annotations.legacy.name` is the exact name the bridge call passes. When your repo has a `telemetry-authoring` skill, it has the steps, the facade for each platform, and the naming rules.

## Don't give every entity its own reaction on shared state

A class that exists once per entity (a desk's view model, a member's avatar, a chat bubble) can start reactions, and that's fine while they watch the entity's own fields. When one also reads state every entity shares (the view mode, a setting, the current user), each instance subscribes to the same value and all of them re-run when it changes. With 250 member avatars or 3,000 desks, one change wakes thousands of reactions.

```ts
// ❌ each desk watches the nameplate setting
class DeskViewModel {
  constructor(private readonly desk: Desk) {
    this.cleanupCallbacks = [
      reaction(
        () => Repos.settings.showNameplates,
        (showNameplates) => this.handleNameplatesChanged(showNameplates),
        { name: "DeskViewModel.showNameplates" },
      ),
    ]
  }
}
```

Watch the shared value once and update the instances it affects:

```ts
// ✅ one reaction for every desk, started once by the service that owns the entities
class DeskViewModel {
  static redrawEveryDeskOnNameplatesChange(): VoidFunction {
    return reaction(
      () => Repos.settings.showNameplates,
      (showNameplates) =>
        Object.values(FloorPlan.instance.desks).forEach((desk) =>
          desk.handleNameplatesChanged(showNameplates),
        ),
      { name: "DeskViewModel.showNameplates" },
    )
  }
}
```

Deriving the value where it's read, or keying the lookup by entity (`Repos.deskSelection.isSelected(desk)`), works too. [Reactions over many entities](v2ArchitectureBuildingBlocks.md#reactions-over-many-entities) lists the patterns with an example of each.

In `gather-browser`, `@gathertown/no-shared-state-reaction-per-entity` enforces this: it flags a reaction in the instance code of a per-entity class whose tracked part reads a `Repos.x.y` property. It only sees reads written in the reaction itself, so a heap snapshot with reactions grouped by name stays the check for the rest.

## Assign undefined instead of deleting a class field

To clear a field, assign `undefined` to it. Don't `delete` it.

```ts
// ❌ the object drops into dictionary mode
delete this.badStateTimer

// ✅ the object keeps its shape
this.badStateTimer = undefined
```

V8 gives objects of the same shape a fixed, fast layout. The repo compiles to ES2022, so every declared field is part of that shape from construction. Deleting one moves the object into dictionary mode, where its properties sit in a hash table. The object gets larger, its property reads get slower, and V8 rarely moves it back. A PRDE was about 2.5 KB smaller in Node once its resize callback stopped deleting a field.

The two only differ to code that asks whether the field exists. That means `in`, `hasOwnProperty`, `Object.keys` and spreads. Check for those before converting an old site.

`delete` is still right for an object used as a lookup table (`delete this.users[id]`), though a `Map` is usually the better structure there. A `no-restricted-syntax` selector enforces this rule for `delete this.<field>`.

## Comments

Comments exist to explain the _why_ — the code already says what it does. A well-placed comment takes a minute to write and can save hours of future engineering time in reading your code. This section distills three articles, each worth reading in full:

- [Best practices for writing code comments](https://stackoverflow.blog/2021/12/23/best-practices-for-writing-code-comments/) — Ellen Spertus, Stack Overflow blog
- [Writing Maintainable Code is a Communication Skill](https://max.engineer/maintainable-code) — Max Chernyak
- [Writing system software: code comments](http://antirez.com/news/124) — Salvatore Sanfilippo (antirez)

### Write good comments, but write good code first

Good code design is much more important than writing good comments. Comments are not a replacement or a bandaid for writing poorly designed code — "Don't comment bad code — rewrite it" (Kernighan & Plauger).

If your comment could be better explained through good code design (naming, abstractions, etc.), write better code. If your comment describes behavior that could be better explained in tests, write those tests. And if you find you can't write a clear comment, that's a signal the code itself is too convoluted — simplify the code first.

The most common case: comments labelling the phases of a function. Each label is naming a missing abstraction — extract the block into a function whose name says what the comment said, and the comments disappear:

```ts
// ❌ comments as block labels
const handleMemberJoin = async (member: Member) => {
  // reject the join if the workspace is at its seat cap
  const activeCount = await countActiveMembers(member.workspaceId)
  if (activeCount >= (await getSeatCap(member.workspaceId))) {
    throw new SeatCapExceededError(member.workspaceId)
  }

  // give the member their last role, or the default role on first join
  const lastRole = await loadLastRole(member)
  const role = lastRole ?? (await getDefaultRole(member.workspaceId))

  await addMember(member, role)
}

// ✅ the names now say what the comments said, and the function reads at one level of abstraction
const handleMemberJoin = async (member: Member) => {
  await assertSeatCapNotExceeded(member.workspaceId)
  const role = await resolveRole(member)
  await addMember(member, role)
}
```

(Related: [Write small functions / methods](#write-small-functions--methods--20-lines) and [Descend only one level of abstraction in functions/methods](#descend-only-one-level-of-abstraction-in-functionsmethods).)

### Explain why, not what

A comment that restates what the code does is clutter: it takes longer to read than the code itself, adds nothing, and silently goes stale when the code changes. Code tells you _how_; comments tell you _why_.

The degenerate case is the classic `i = i + 1 // Add one to i`, but the same failure shows up in subtler forms:

```ts
// ❌ "what" comment — the import statement already says all of this
// `Client` is the only value import from the SDK (client construction); everything else is types.
import { Client, type CalendarEvent, type CalendarList, type SyncToken } from "calendar-sdk"
```

```ts
// ✅ "why" comment — explains a non-obvious decision and links the platform docs behind it
// Codes the vendor's docs mention that the SDK types omit, with an Unknown fallback for anything
// else (the wire value is an open string set no matter what the types say):
// https://developers.example.com/calendar/errors#codes
const OUTCOME_BY_VENDOR_ERROR: Record<string, SyncOutcome> = {
  ...OUTCOME_BY_SDK_ERROR,
  QuotaExceeded: SyncOutcome.failed(SyncErrorCode.RateLimited, true),
}
```

Telling these apart is not a judgment call — use **the deletion test**: delete the comment and re-read the code. If the code alone still answers every question the comment answered, keep it deleted. Comments describing the code's own structure — which imports are types, what fields a class has, what a block is about to do — always fail this test, even when they read like design decisions (the ❌ example above sounds like a chosen constraint; it just describes the import list). A "why" comment survives the test because it says something invisible in the code: a business reason, a rejected alternative, a platform behavior, a link.

Run the test on every comment in your diff, new or inherited. A comment that survived earlier commits, cleanup passes, or reviews hasn't earned anything — the ❌ example above is the kind that survives a dedicated comment-trimming pass.

### Explain the system once, in the place that owns it

An explanation of how the system works belongs in exactly one place: the class, module, or doc that owns the behavior. The failure mode is a paragraph of system context planted at every site that touches the system — each caller re-describing the pipeline, each registration site restating what the thing it registers does. Every copy reads reasonable on its own. Together they mean a reader has to assemble their picture of the system from comments littered across a dozen files, and the copies start drifting apart the first time the behavior changes.

Two tells:

- **The same explanation appears in more than one file.** Then it belongs in neither. Put it where the behavior lives and delete the copies.
- **The comment explains something the reader could learn by opening the thing the comment names.** Say nothing and let them open it. If they _couldn't_ learn it there, that's the actual bug — fix the naming, the structure, or the owner's doc comment. Don't paper over it at the call site.

```ts
// ❌ server.ts — restates how RequestTimer works, in a file whose only job is to register it
// RequestTimer starts a clock on each inbound request and records the elapsed time once the
// response finishes, holding samples in a buffer until the reporter's flush interval so that
// short-lived requests still get counted instead of dropped.
app.use(new RequestTimer())

// ✅ nothing here; RequestTimer's own doc comment is where that paragraph lives
app.use(new RequestTimer())
```

Where the canonical explanation goes, in order of preference: the code itself (names, types, structure) so no prose is needed; a doc comment on the class or module that owns the behavior; a `docs/` page or module README when the concept spans modules. Call sites get a link at most.

(Related: [Aim for high cohesion, low coupling](#aim-for-high-cohesion-low-coupling) — scattered explanations usually trail scattered knowledge.)

### Put comments at the relevant line

A doc comment on a function covers the function — why it exists, what it stands in for. A fact about one statement inside it belongs on the line above that statement, where the reader meets the code it describes. Hoisting an implementation detail into the header asks the reader to carry it past the lines it does not apply to, and it outlives its subject: the statement moves or goes away, and the header keeps explaining it.

```ts
// ❌ the header carries a fact about one line further down
/** Puts the user in a group. `disband` emits a server-only event, so it is stubbed. */
const beInGroup = async (groupId: Uuid): Promise<Group> => {
  const group = await factories.group.create({ groupId })
  jest.spyOn(group, "disband").mockResolvedValue(undefined)
  jest.spyOn(user, "currentGroup", "get").mockReturnValue(group)

  return group
}

// ✅ the fact sits on the line it is about
const beInGroup = async (groupId: Uuid): Promise<Group> => {
  const group = await factories.group.create({ groupId })
  // `disband` emits a server-only event, which a client-side test cannot run.
  jest.spyOn(group, "disband").mockResolvedValue(undefined)
  jest.spyOn(user, "currentGroup", "get").mockReturnValue(group)

  return group
}
```

### Pinpoint which decisions actually need context

Most code needs no comment at all. The decisions worth explaining usually come from one of four circumstances: (1) there's a non-obvious business reason for the decision, (2) you did significant research to arrive at it, (3) you were on the fence about the chosen solution, or (4) someone asked about it in code review. Bug-fix workarounds belong here too — say what broke, so a future reader can tell whether the workaround is still needed.

### Write for experienced teammates

Your readers are experienced programmers who know Gather's terminology and systems. Lean on that shared knowledge — don't explain language basics or pad comments with detail only an outsider would need.

### Link to the source

When a decision comes from external material — platform docs, an RFC, a Stack Overflow answer you adapted, a GitHub issue — link it in the comment, right where a reader will need it (see the `OUTCOME_BY_VENDOR_ERROR` example above). A link carries the full context, alternatives, and future updates that a paraphrase can't.

### Explain code that looks wrong

When code is deliberately unidiomatic — an intentional off-by-one, a seemingly redundant guard, an ordering that matters for a non-obvious reason — say so, or the next reader will "fix" it. (Related: [Limit the spread and blast radius of hacks](#limit-the-spread-and-blast-radius-of-hacks).)

### Enforce rules with code, not comments

A comment can only ask the reader to uphold a rule; code, type checks, lint rules, and tests can enforce it. When you find yourself writing "KEEP THESE IN SYNC", "don't forget to...", or "must match...", reach for an explicit mechanism instead — derive one value from the other, make the compiler check exhaustiveness, or write a test that fails when the rule is broken.

```ts
export const PushErrorCode = {
  InvalidCredentials: "InvalidCredentials",
  DeviceNotRegistered: "DeviceNotRegistered",
  MessageTooBig: "MessageTooBig",
} as const satisfies Record<string, string>
export type PushErrorCode = (typeof PushErrorCode)[keyof typeof PushErrorCode]

// ❌ a comment pleading for sync — nothing catches the drift when a new code is added
// KEEP THESE IN SYNC with PushErrorCode!
const ALL_PUSH_ERROR_CODES = ["InvalidCredentials", "DeviceNotRegistered", "MessageTooBig"]

// ✅ derived — can't drift, no comment needed
const ALL_PUSH_ERROR_CODES = Object.values(PushErrorCode)
```

If you need to split the set rather than list all of it, don't fall back to hand-maintained subsets with a sync comment. Classify every member in an exhaustive `Record` — the compiler forces a decision for each new member — and derive the subsets from it:

```ts
const IS_RETRYABLE: Record<PushErrorCode, boolean> = {
  InvalidCredentials: false,
  DeviceNotRegistered: true,
  MessageTooBig: false,
}

const RETRYABLE_PUSH_ERROR_CODES = Object.values(PushErrorCode).filter((code) => IS_RETRYABLE[code])
```

For rules that neither derivation nor the type system can express, write a custom eslint rule in `gather-eslint-plugin`. For example, `enforceGaActionObservableClass` enforces that any class with a `@ga.action` method is decorated with `@ga.observableClass` — a rule that would otherwise be a comment on the decorator, hoping to be noticed.

(Related: [Prefer `as const` objects over TS enums and string-literal unions](#prefer-as-const-objects-over-ts-enums-and-string-literal-unions) and [Make switch statements exhaustive with `assertUnreachable`](#make-switch-statements-exhaustive-with-assertunreachable).)

### Don't use section-divider comments in classes

Don't carve a class into labelled regions with banner comments like `// === internals ===`, `// --- public API ---`, or `/* ---- helpers ---- */`. The `private` and `public` markers on the members already say which is which, and grouping members by access modifier conveys the rest. A class big enough to warrant section dividers is usually a sign the class is doing too much — split it instead.

```ts
// bad
class Foo {
  // ============ public API ============
  doThing() {
    /* ... */
  }

  // ============ internals ============
  private helper() {
    /* ... */
  }
}

// good
class Foo {
  doThing() {
    /* ... */
  }

  private helper() {
    /* ... */
  }
}
```

### Don't reference the old way of doing things in comments

Comments and test names describe the code as it is now. When a mechanism, special case, or behavior
is removed, don't leave text pointing at what used to be there — git history already records it, and
a reader who never saw the old code gets sent hunting for something that doesn't exist. Explain why
the current code is correct instead.

```ts
// ❌ explains code that was deleted
// An entry here supplies the value for a `:param` when a caller doesn't pass one — e.g. it used to
// fill the user param with the `me` sentinel. Empty today, but kept as the seam for future shared
// defaults so callers don't have to rediscover the mechanism.
const BASE_DEFAULT_PATH_PARAMS: Record<string, () => string | number> = {}

// ✅ describes only the current behavior
// An entry here supplies the value for a `:param` when a caller doesn't pass one.
const BASE_DEFAULT_PATH_PARAMS: Record<string, () => string | number> = {}
```

```ts
// ❌ the reader doesn't care that a special case once existed
it("follows the normal path on an iOS simulator (no longer special-cased)", async () => {

// ✅
it("follows the normal path on an iOS simulator", async () => {
```

### Don't use forbidden phrases

These phrases read as AI slop, so they never go in a comment:

- "the honest truth"
- "smoking gun"
- "heads-up"
- "load-bearing"
- "belt-and-suspenders"
- "I'll level with you"
- "Clean" as a verdict, either alone as "Clean." or opening a line as "Clean — ..."
- A platform comparison with no verb, like "works as on web". It reads two ways, so name what web does instead. "The same way as on web", "such as on mobile" and "as on web's sidebar" are fine.

Say the plain thing, or delete the sentence.

### Clean up existing TODOs that show up in your PR diff

We have lots of lint TODOs littered throughout our codebase. We need to steadily pay down that technical debt.

Search for the word `TODO` in your PR diff on GitHub. The goal is to clean up all TODOs that happen to show up in your diff. If they're significant changes, make a stacked PR.

### Attach Linear stories to TODOs

TODOs can be checked into the codebase when they are either: a) autogenerated as part of lint rule migrations, or b) have a Linear ticket associated with them.

If your TODO is going to be addressed immediately in a follow-up PR, just attach the current Linear ticket you're working on that's related.

### Only tag a Linear issue that still has work in it

An `ENG-1234` tag means the ticket tracks work someone still has to do. Use one on a TODO, a PR title, or a branch name only when that's true.

```ts
// ❌ ENG-1156 shipped, so this TODO will never be done
// TODO(ENG-1156): emails are redacted from logs here

// ✅
// Emails are redacted here because we can't guarantee who reads these logs.
```

Never tag an issue to say "this is the related work". Every grep for open work turns it up, and nobody can tell it's already closed without opening Linear. Say the reason in the code instead. Link Linear only when the background is too deep to fit in a sentence or two, which is rare.

### Writing a comment is an analysis tool

Articulating why code is correct forces you to check that you actually understand it — antirez calls it "rubber duck debugging on steroids". If the why won't come out clearly, you've likely found a design problem, not a writing problem.

# Patterns

TBD
