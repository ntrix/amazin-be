# Amazin Engineering Decisions — the *why*, not just the *what*

This is living documentation, not a changelog. `README.md` says what the system does;
this file says why it's built the way it is, what else was considered, and what the
trade-off cost. Structure: §1–3 cover backend decisions (`amazin-be`). §4–6 cover
frontend decisions (`amazin`). Both repos carry this file because they're separate
repos, not a monorepo — duplication is intentional.

## 1. Stock consistency: per-item atomic update, not a multi-document transaction

**Decision** (`amazin-be`, branch `feat/order-stock-check`, PRs #49–#50, commit `6d975a7`,
`controllers/orderControllers.js` — `reserveStock`/`releaseStock`): decrementing
`countInStock` when an order is created uses `Product.findOneAndUpdate({ _id, countInStock:
{ $gte: qty } }, { $inc: { countInStock: -qty } })` per line item, with a manual
compensating rollback (`releaseStock`) if any item fails the guard — not a MongoDB
multi-document ACID transaction.

**Alternatives considered:** (a) a `session.withTransaction()` wrapping all order-item
decrements; (b) no stock check at all (what the code did before — verified: pre-fix,
order creation didn't touch `countInStock`, so overselling was silently possible).

**Trade-off reasoning:** a transaction gives atomicity across *all* items in one order,
but requires a replica set and adds real latency/lock contention for a benefit this
schema doesn't need — each line item only ever touches its own `Product` document,
so a single atomic `$inc` with a guard condition already gives per-item correctness.
The compensating-rollback loop trades "one all-or-nothing operation" for "N independent
atomic operations + manual undo," which is more code but has no transaction/replica-set
dependency and stays free-tier-safe on Atlas M0. The real cost: a crash between
`reserveStock` succeeding and `releaseStock` running on a later failure leaves stock
under-counted until reconciled — accepted as a low-probability, low-severity gap for
this project's scale, not something a production payments system should accept as-is.

## 2. Auth lifecycle hardened in two acts — and each act found a real bug

**Act 1 — token model** (both repos, PRs #71/#383, `auth/token.js`,
`apps/amazin/src/apis/axiosClient.ts`): replaced a 30-day JWT sitting in `localStorage`
with a 15-minute access token + an httpOnly, rotating (`refreshTokenVersion`), revocable
refresh cookie. FE gained a dedup'd refresh-on-401 interceptor (`refreshPromise` shared
across concurrent 401s, so N simultaneous expired calls trigger one refresh, not N).
**Trade-off:** a short-lived token shrinks the XSS blast radius (a stolen access token
is useless in minutes) at the cost of an extra moving part (cookie rotation, a `/refresh`
round-trip, revocation bookkeeping) that a single long-lived token never needed.
**Real cost paid:** fixing this globally set `axios.defaults.withCredentials = true` so
the refresh cookie would ride along — which silently broke two unrelated third-party
calls (TMDB movie API, the contact-form mailer) that started getting blocked by the
browser's CORS-with-credentials rule (`Access-Control-Allow-Origin: *` is invalid once
credentials are attached). Fixed with explicit `withCredentials: false` on those two
call sites (PR #396) — a concrete example of a security-motivated global default
leaking into unrelated code paths.

**Act 2 — lockout storage** (`amazin-be`, branch `fix/redis-login-lockout`, commit
`a959baa`): replaced an in-memory `setTimeout`-based login lockout (state lost on
restart, meaningless once ECS runs >1 instance) with Redis TTL keys
(`auth/loginLockout.js`). **While rewriting it, a real authentication-bypass bug
surfaced**: the old `signIn` ran `bcrypt.compareSync(password, ...)` *before* checking
lock state — so the correct password during an active lockout still succeeded, meaning
the lockout never actually stopped a correctly-guessed brute-forced password. The new
code checks `loginLockout.isLocked(email)` first, unconditionally, before any password
comparison. Redis also fails open (`isLocked`/`recordFailure` return "not locked" /
`0` on a Redis error) — a deliberate choice to prioritize availability over lockout
strictness if the cache is down, rather than locking every user out on an infra blip.

## 3. Staying on Express + incremental TypeScript, not a big-bang NestJS rewrite

**Decision:** `amazin-be` remains 0% TypeScript, no `services/` layer, as of today —
by design, not neglect. The roadmap explicitly scheduled "TS + service layer" (items
#8/#9) and then deprioritized it behind auth/security/observability work that shipped
instead (Sentry, JWT refresh, Redis lockout, Mongoose 5→8, migrations).

**Alternatives considered, with real numbers:**

| | Stay Express, add TS incrementally | Migrate to NestJS now |
|---|---|---|
| Effort | 2–3 weeks | 4–6 weeks (rewrite routing/DI/guards/pipes, not just add types) |
| Risk | Low — every step still runs | High — big-bang rewrite of an app in real production use |
| Engineering range signal | High (TS strict + service layer + DTO validation = the skills that matter) | Higher *if* finished, but "one NestJS project (relay) + one modernized Express project" is arguably a better signal of range than two NestJS projects |

**Trade-off reasoning:** the concrete cost of *not yet* doing this is measurable and
traceable in commit history: a 130-line `getProducts` doing query-building +
search-strategy selection + pagination in one function, because there's no service
layer to absorb it, and an `AppError` hierarchy that's adopted in only 2 of 5
controllers. Both are direct, traceable consequences of this one decision — not
separate problems. The plan (leaf-to-root: `models/` → `domain/` → `services/<x>.ts`
→ thin `controllers/`, with `zod` replacing `express-validator` so validation, TS types,
and OpenAPI docs come from one schema) is written but intentionally not yet executed.

## 4. TypeScript strict mode from the first commit — and why it's stayed that way

**Decision** (`amazin` FE, `tsconfig.json`, committed 2021-07-17): `strict: true` plus
the full explicit flag set: `noImplicitAny`, `noImplicitReturns`, `strictNullChecks`,
`noUnusedLocals`, `noUnusedParameters`. Set on day one, never relaxed.

**What this means in practice:** as of today, `: any` appears in 11 places in the
entire `src/` tree — all in `@types/*.d.ts` ambient declarations, none in components,
hooks, screens, or Redux slices. `as any` appears zero times. Type assertions
(`as SomeType`) exist but are confined to third-party API boundaries where the
external type is genuinely `unknown`.

**Trade-off:** a strict config fails loudly early and often, especially when adding
third-party libraries with loose typings. The cost is paid upfront (fix the type
or write a declaration), not deferred (debug a runtime `undefined.x` six weeks
later). This project never relaxed the config even when it would have been faster —
that's a more meaningful signal than "we use TypeScript" on a project with
`"strict": false`.

**Known gap this creates:** `amazin-be` has zero TypeScript. Until §3's migration
plan executes, FE `@types/` carries the shared API contract — any change to a BE
response shape needs a corresponding `@types/` update in FE.

## 5. Component architecture: extract-to-hook as a structural rule, not a style preference

**Decision** (`amazin` FE, applied throughout 2021–present): every screen gets a
same-directory custom hook for its imperative logic. `UserEditScreen/index.tsx`
alongside `useUserEdit.ts`. `ContactScreen/index.tsx` alongside `useContact.ts`.
`MapScreen/index.tsx` alongside `useMapAPIs.ts`. 29 hooks total.

**Why this matters beyond "clean code":** the hook extraction is what makes
`useEffect` dependency arrays correct without discipline — when all the stateful
logic lives in the hook, the component's `useEffect` calls are thin wrappers with
obvious, complete dependency lists. The current codebase has 37 `useEffect` calls
with zero missing dependency arrays (verified). This is structural, not vigilance.

**Trade-off:** more files per screen. Navigation requires knowing the convention.
New contributors who write logic directly in JSX break the invariant silently —
it's not enforced by a linter rule, only by convention. Worth it: no component in
the codebase exceeds 150 lines. That ceiling holds because of the hook rule, not
despite the cost.

## 6. Redux: what's used, what's not, and why the gap is deliberate

**Decision** (`amazin` FE): RTK's `createSlice` and `configureStore` adopted fully.
`createSelector` (reselect memoization) and RTK Query: not used.

**createSelector gap:** 53 `useSelector` calls use inline anonymous selector functions.
At this app's data scale — a few hundred products, single-user session — unmemoized
selectors don't cause measurable re-render cost. The trade-off was assessed and
deferred: adding `createSelector` to all 53 call sites adds complexity for a problem
this app doesn't have. In a large app with expensive derived state or many concurrent
component subscriptions, this would not be acceptable.

**RTK Query gap:** the async layer (thunks + loading/error slice fields) was written
when RTK Query was in early release. It works but is verbose compared to what RTK
Query would generate. New data-fetching endpoints should use RTK Query — the existing
layer is not a template. This is the one Redux decision that would be made differently
today.

**What this means for "Redux expertise" claims:** RTK's ergonomic surface area
(createSlice, configureStore) is used correctly throughout, including a hand-rolled
`_REQUEST`/`_SUCCESS`/`_FAIL`/`_RESET` reducer convention layered on `createSlice` —
not `createAsyncThunk`, which this codebase predates in its async layer (started 2021,
before `createAsyncThunk` had the stable API and adoption it has today; migrating
existing slices is tracked but not yet prioritized over feature work). RTK's
performance-oriented and server-state tooling (createSelector, RTK Query) isn't used
either. Both are true.

---
*Source: git history of `amazin` and `amazin-be` — branches, PRs, and commit hashes
cited inline above are all verifiable in those public repos.*