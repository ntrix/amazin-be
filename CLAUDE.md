# CLAUDE.md — amazin-be

Backend for a personal portfolio project (Amazon+Netflix clone). Sibling FE repo:
`amazin`. Author: `ntrix` (ntrix3390@gmail.com) — solo, no invented
collaborators/reviewers. `*@casavi.de` is a separate work identity
(relay/casavi repos only) — never use it here(no commits, no files).

## Stack

Plain JS, ESM, **zero TypeScript** — deliberate, tracked as roadmap #8/#9, not
started (rationale: `amazin-ENGINEERING.md` §3). Express 4, Mongoose 8, MongoDB
Atlas. No `services/` layer; `domain/authorization.js` is the one pure-logic
module — no Express, no Mongoose. New business logic belongs here or in a future
`services/` layer, not inline in controllers.

## Commands

`nvm use` first (Node ≥20, targets 24.x — husky fails silently otherwise) ·
`npm test` (Vitest, no real DB) · `npm run migrate[:status|:create]` (migrate-mongo) ·
`npm run lint`

`npm start` → `Server running on :5000` + `MongoDB connected` = environment ready.

## Environment

Copy `.env.example` → `.env` before first run. Required for dev:
`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`.
Optional (features degrade gracefully without them):
`SENTRY_DSN` (errors logged to console instead),
`SENDGRID_API_KEY` (contact form returns 503),
`GOOGLE_CLIENT_ID`/`GITHUB_CLIENT_ID` (OAuth buttons hidden).

## Auth & security model

- Redis lockout fails OPEN — `isLocked()` returns false on Redis error,
  `recordFailure()` silently no-ops. This is intentional: availability beats
  lockout strictness on infra blip. Do not change this to fail-closed without
  an explicit decision.
- `checkToken` middleware runs before ANY route touches `req.user`. Never read
  `req.user` in a controller without the middleware having run on that route.
- Do not log request bodies in auth endpoints — credentials appear there.
- Input from `req.body` must be shaped/validated before it leaves the service
  boundary. The `createTicket` pattern of passing raw body to an external API
  is a known gap, not a template to copy.

## Test discipline

- Tests live in the same commit as the code they cover — never in a follow-up.
- Assert outcomes, not implementation: use `toBe`/`toEqual`/`toContain` — not
  `toHaveBeenCalled`. See `tests/hardening.test.js` for the naming pattern:
  tests named after what an attacker would try, not after function names.
- New test files belong in `tests/` and follow the threat-model naming already
  there (`signInEnumeration`, `passwordLeak`, `productOwnership`...).

## Known gaps — don't silently "fix" without checking the roadmap

- `getProducts` (`productControllers.js:24`, 130 lines) — filter+search+pagination
  inline, no service layer to split it into.
- `userControllers.js` / `productControllers.js` still use raw `res.status()` —
  that's the gap, not the pattern. New code and any touched controller must use
  `AppError` subclasses from `lib/errors.js` with the global handler in `app.js`.
- `userControllers.js:112` leaks a raw caught error string to the client.

## Rules

- Never add `Co-Authored-By`/AI attribution to any commit or PR — no exceptions.
- Branch + PR, explicit confirmation before merge. `main` was force-pushed once
  already to strip AI attribution — don't trust old SHAs from stale docs.
- Never mass-delete against production Atlas — hand the script to the repo owner.
- Migrations: constructive (add) and destructive (drop) changes must be in
  separate migration files — never combined. Never run destructive migrations
  without explicit owner confirmation.
- Cross-repo: FE lives at `../amazin`. Auth contract: 15-min JWT access token +
  httpOnly rotating refresh cookie. `@types/` in FE is source-of-truth for shared
  API shapes until BE migrates to TypeScript (roadmap #8).
- On Redis/external service failures: check the fail-open decisions in
  `amazin-ENGINEERING.md` §2 before adding any "fail-closed" behavior.