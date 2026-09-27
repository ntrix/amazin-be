# Amazin Engineering Decisions — the *why*, not just the *what*

This is living documentation, not a changelog. `README.md` says what the system does;
this file says why it's built the way it is, what else was considered, and what the
trade-off cost. Same file in both `amazin` (FE) and `amazin-be` (BE) — they're two
separate repos, not a monorepo, so this is duplicated on purpose rather than linked.

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
| CV value | High (TS strict + service layer + DTO validation = the skills that matter) | Higher *if* finished, but "one NestJS project (relay) + one modernized Express project" is arguably a better signal of range than two NestJS projects |

**Trade-off reasoning:** the concrete cost of *not yet* doing this is measurable and
already documented (`amazin-be-code-quality.md`): a 130-line `getProducts` doing
query-building + search-strategy selection + pagination in one function, because
there's no service layer to absorb it, and an `AppError` hierarchy that's adopted in
only 2 of 5 controllers. Both are direct, traceable consequences of this one decision —
not separate problems. The plan (leaf-to-root: `models/` → `domain/` → `services/<x>.ts`
→ thin `controllers/`, with `zod` replacing `express-validator` so validation, TS types,
and OpenAPI docs come from one schema) is written but intentionally not yet executed.

---
*Source evidence: `amazin-be` branches `feat/order-stock-check`, `feat/jwt-refresh-token`,
`fix/redis-login-lockout`; `amazin` branch `feat/jwt-refresh-token`; cross-referenced
against `AMAZIN_CODEBASE_OVERVIEW.md`, `amazin-be-code-quality.md`,
`amazin-fe-react-quality.md` (`../` relative to this file, human+AI-facing docs kept
outside both repos).*
