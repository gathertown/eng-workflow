# V2 Architecture Building Blocks

AI-oriented synthesis of the V2 ("2.0") architecture. Terse by design.

## Goal + principles

Goal: increase engineering/product velocity 50%. Three principles:

1. **Wrangle complexity** — encapsulation (rich domain models, not dumb data bags), abstraction (know what to expect from a file at a glance), consistency (fewer snowflake designs).
2. **80-20 TDD** — write tests to go fast. 80% of business-logic work in tests, 20% in browser. No UI/React component tests; UI work happens in browser.
3. **Reduce boilerplate and footguns** — compose behavior, don't pipe changes across 10 files.

## Big picture

Business logic (non-UI, frontend or backend) = 3 blocks: **Models ↔ Repos ↔ Services**. Frontend adds **Presenters** connecting React components to business logic. Flow: Component → Presenter → Repos/Models → (state sync / TSR) → backend.

Ubiquitous language: same names in UI, code, DB, and business conversation. V1 counterexamples: `Leftbar` rendered on right; "subscriptions" (UI) vs "reservations" (backend).

## Blocks

### Models

- Structured representation of domain, expressed as TS class. Properties, derived state (computeds), actions.
- **Default home for business logic. First concept to reach for.** Can talk to other models, repos, services.
- Have _identity_ + lifecycle (usually DB `id`). Two models with same values = different things.
- Most models are GS (game server) models: auto-loaded, persisted, serialized, state-synced.

### Value Objects

- Encapsulated behavior/data where identity doesn't matter. Same values = same object. No DB `id`.
- Cure for primitive obsession. If a primitive field represents _something_, or helper functions operate on it, make a value object (`Email`, `DateRange`, `DateTimeExt`).
- Mutability OK (MobX handles reactions); defined by properties, not identity.

### Aggregates

- Grouping of models/value objects with invariants enforced across them (e.g. Outfit = top + bottom + hair + shoes).
- Outside code refers only to aggregate root, never inner objects. Lifecycle cascades (delete outfit → delete parts). Parts meaningless standalone.
- Models owned by an aggregate need no repo of their own.

### Repositories (Repos)

- Store/retrieve/manage collections of model instances or other global state. Interface between storage layer (server↔DB, client↔server) and domain layer. Deserialize stored data into rich models.
- Expose query methods (subsets of models) and actions coordinating multiple instances.
- Model has at most one repo; may have both frontend + backend repo. Repo managing >1 model = design smell.
- Repos may talk to other repos, but mind direction: `GiftRepo` coordinating `ChatRepo` OK; `ChatRepo` knowing about gifts NOT. No clear owner → service.
- Access via global `Repos.X` singleton.

### Services

- **Stateless.** Coordinate across multiple repos, manage event chains, connect to external services. Use when no clear owner exists. Keeps repos single-responsibility.
- Noun-named classes (e.g. `AutoDNDService`, `CalendarSyncingService`).

### Presenters

- Stateful, testable class per component: UI-specific business logic connecting models to views. 1:1 presenter instance : rendered component instance.
- "Feature layer of the backend-for-the-frontend." 80% of UI dev via presenter tests.
- React translation: `useState` → observable field, `useEffect` → `autorun`/`reaction`, `useMemo` → computed getter, `useCallback` → action method.
- When your repo has a `presenter-pattern` skill, read it before writing/modifying any `*.presenter.ts`.

### View Helpers

- Shared functionality across presenters/React components. Last resort — only when code can't live anywhere else.

### Test Harnesses + Factories

- Harness = declarative test env setup (`TestSetupHarness.createAndEnterSpaceAsNewUser()` sets up repos, testDriver, testClient). Maintenance cost accepted for boilerplate reduction.
- Factories produce models/value objects with realistic defaults, overridable. Auto-create implicit default parents (`space → floor → map`); explicit parent ID skips default. `create()` populates game state; `build()` doesn't auto-create parents.
- See [testingStyleGuide.md](../unit-testing/testingStyleGuide.md) and the `unit-testing` skill.

## Model mechanics (GS)

Defining a new GS model = schema (`s` builder) + class extending `BaseModel` + registration in game logic + model loader. Follow an existing model (e.g. `Meeting` in `gather-game-logic/src/models/`) for the mechanics. The one non-obvious detail: the Prisma schema and `DbQueries.generated.ts` are generated from the model schemas by `gather2 db:generate-gs-persistence`, which `gather2 db:migrate` runs as well. The builder's surface is in [docs/schemaWrapper.md](../../../docs/schemaWrapper.md).

Key patterns:

- Relationships are declared in the schema (`manyToOne` etc.); many-to-many = manual join model.
- Shared models (Object Catalog, Wearables): loaded once per server, shared across Spaces. NEVER for sensitive user data.
- Actions (`MethodAction`) are how clients change state: client call → optimistic update → websocket → server permission check → server logic → DB flush → state sync to all clients → promise resolves.
- Every action declares `requiredPermission` (`PublicMethod` if anyone). Permissions are opt-in per model; dynamic grant/revoke via `overridePermissions`. Client check: `model.hasPermissionFor("someAction")` — gate UI with it.
- Visibility: implement `isVisible_PERF_SENSITIVE(userInfo)` on every model — mandatory, even `return true`. Keep O(1), no allocations.
- Persistence automatic; per-field flush default immediate, debounce hot fields.
- Server/client-specific logic: subclass the model on that side (`ServerSpace extends Space`). No `MethodAction` on subclasses.
- Client subclasses: register with `.model()` in `clientGameLogic.ts` and add the pair to `ModelTypeOverrides` in the same file. A shared getter annotated `ResolvedModel<"Floor">` then reads as `ClientFloor` on the client with no cast. Annotate every shared member that returns a model, because game-logic's `.d.ts` emit writes an inferred type out as the base model.

## Repo mechanics

- GS models get a default `ModelRepo` free: `values()`, `get(id)`, `getOrThrow(id)`. Custom repo: `class MeetingRepo<T extends Meeting> extends ModelRepo<T>`, register via `repository` option in `logic.model(...)`.
- Frontend access: `Repos.Meeting`, not `Repos.gameSpace.state.Meeting`.
- Plain (non-GS) repo skeleton: `makeAutoObservable(this)` in small idempotent constructor; listeners/autoruns in `start()` returning dispose fn; add to `repoDefinitions`.
- Query method pattern — collection as defaulted param: `upcomingMeetings(meetings = this.values()) { return meetings.filter(m => m.isUpcoming()) }`.
- Repos know _what_ to change, models know _how_: `meeting.cancel()`, not repo mutating `meeting.canceled/canceledAt/canceledBy`.
- Create through the repo (`Repos.Map.create(...)` or model action delegating to it), not "new + save". Only a model's own repo may call `loadModel` for it.
- State placement: prefer model/value object over repo global state; prefer computed over stored derived value. In-domain events: model _tells_ repo directly (traceable) over autorun. Cross-domain reactions: service with `autorun` watching multiple repos — never repos reacting to each other's internals.
- `AsyncState(() => fetch())` wraps promise + loading/error state; presenters consume via deps to gate rendering.
- HS-owned data: frontend repo makes ts-rest calls (`tsr.payments.update(...)`); pessimistic update default. Mixing HS data into GS models: `loadNormalizedHSDataToGSModels(...)`, don't store locally in the repo (reference: `MeetingFrontendRepo.ts`).

## Presenter mechanics

- Extend `BasePresenter<Props>()(deps)` + `@ga.observableClass`. `deps` = fn returning async dependencies (AsyncState); `usePresenter` suspends until loaded, so presenter code treats deps as loaded.
- Props = component-local state only (form values, route params). **Props NOT observable** — no props in `@ga.computed` or `afterMount` reactions; use `afterMountOrPropChange` or uncached getters.
- Lifecycles: `afterObservable` (initial local state, pre-first-render; no global changes), `afterMount` (global state changes, listeners, asyncDeps), `afterMountOrPropChange` (reactions involving props). Constructor: keep empty-ish — fields not yet observable, no asyncDeps, global changes throw React errors.
- Skip the presenter when logic is trivial. Make one when: >3 React hook calls, complex filtering, async deps, >30 lines of logic, or you want TDD.
- Components: layout + styling only; may talk to presenters, models, or repos directly. Filtering/formatting logic belongs in presenter, tested.
- Pass presenter to children via `Pick<ParentPresenter, "action" | "data">` props — but NOT into generic/dumb components (those take primitives/models/value objects).
- Folder: components co-locate `X.tsx`, `X.presenter.ts`, `X.css.ts` in folder `X/` under `/components` (`common/` shared, `views/` per page/section).
- Testing: `TestSetupHarness` + factories, `new SomePresenter({})`, assert getters/actions. Don't test pass-through getters.

## Reactions over many entities

- A reaction per entity is fine while it watches that entity's own fields. When it also reads state every entity shares (a view mode, a setting, the current user, the debug view), each instance subscribes to the same value and all of them re-run when it changes. Instead:
  - Derive, don't react: a computed or keyed lookup, read where it's used, runs only when something reads it (e.g. per-target selection lookups instead of per-object reactions on the map tool).
  - One reaction per shared input that updates only the entities it affects (e.g. one side effect per office user tells only its old and new area).
  - One static reaction per class that walks the live instances, started by whatever owns the entities (e.g. `DeskOverlay.redrawEveryDeskOnLayoutChange`, started by `MapEntityService`).
  - One scheduler for many deadlines: a single repo-level timer instead of a timer or date threshold per entity.
- Keyed lookups built with `computedFn` (`Repos.selection.isSelected(target)`) are fine: a change re-evaluates each entity's lookup, a cheap comparison, and only the entities whose answer changed re-run.
- To find these groups, take a heap snapshot, group reactions by name, and count the observers on each shared value. A large group of same-named reactions that all observe one value is the pattern.
- In `gather-browser`, `@gathertown/no-shared-state-reaction-per-entity` flags a reaction in a per-entity class's instance code that reads a `Repos.x.y` property. Keyed lookups and static members pass.

## Naming: possibly-nil getters

- **90% case** (nil ≥ ~10% of the time): `getName` returns `string | undefined`; `getNameOrThrow` throws.
- **99% case** (nil almost never): bare name throws (`currentSpaceUser`); explicit `currentSpaceUserOrUndefined` / `orNull` for the rare nullable context (e.g. during loading).

## v1 → v2 concept map

| v1 concept                             | Replaced by (likelihood order)                                           |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Redux                                  | Models, Repos, Services                                                  |
| Managers                               | Services, Repos, Presenters                                              |
| Controllers (frontend)                 | Repos, Services, Models                                                  |
| Hooks                                  | Presenters, Repos, Models, Services                                      |
| React Context                          | Repos, Models, Services                                                  |
| Helpers/Utils                          | Models or Value Objects, Services, Repos, View Helpers                   |
| GSv1 "reaction" events (`playerSetsX`) | GSv2 state sync (automatic)                                              |
| GSv1 "action finished" events          | Awaited GSv2 actions; one-off "notifications" only when no state to sync |

Helpers extending JS primitives / FP / TS utilities (`arrayUtils`, `fpHelpers`, `tsUtils`) fine as plain functions.

## HTTP server vs game server ownership

- **GS owns most data.** All live/realtime data (positions, meetings, invites, chat) and nearly everything affiliated with a Space or in-space experience. Categories: standard CRUD (maps, meetings, calendars, roles) and actions with side effects (chat, recordings, invites, settings).
- **HS owns**: read-only-by-users (wearables/outfits, space templates, insights), create-only logging (feedback, bug reports), standard CRUD without realtime needs (pricing/subscriptions), specialized auth flows (SSO, OAuth callbacks), third-party webhooks (Stripe, WorkOS).
- HS domains: simple relationships, no optimistic UI needed (wait for response, then update FE).
- Data that doesn't need state sync — or would be wasteful to sync to everyone — stays local to the one client that needs it, served by HS. Calendars are the canonical example: most calendar data is pulled from the HTTP server because only the local client cares about it.
- Deciding: needs realtime sync or lives in a Space → GS. Client-local or no sync need → HS.
