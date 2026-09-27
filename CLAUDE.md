# CLAUDE.md — amazin-be

Backend for a personal portfolio project (Amazon+Netflix clone). Sibling FE repo:
`amazin`. Author: `ntrix` (ntrix3390@gmail.com) — solo, no invented
collaborators/reviewers. `tien.nguyen@casavi.de` is a separate work identity
(relay/casavi repos only) — never use it here.

## Stack

Plain JS, ESM, **zero TypeScript** — deliberate, tracked as roadmap #8/#9, not
started (rationale: `amazin-ENGINEERING.md` §3). Express 4, Mongoose 8, MongoDB
Atlas. No `services/` layer; `domain/authorization.js` is the one pure-logic module.

## Commands

`nvm use` first (Node ≥20, targets 24.x — husky fails silently otherwise) ·
`npm test` (Vitest, no real DB) · `npm run migrate[:status|:create]` (migrate-mongo) ·
`npm run lint`

## Auth & security model
- Redis lockout fails OPEN — `isLocked()` returns false on Redis error, `recordFailure()`
  silently no-ops. This is intentional: availability beats lockout strictness on infra blip.
  Do not change this to fail-closed without an explicit decision.
- `checkToken` middleware runs before ANY route touches `req.user`. Never read `req.user`
  in a controller without the middleware having run on that route.
- Do not log request bodies in auth endpoints — credentials appear there.
- Input from `req.body` must be shaped/validated before it leaves the service boundary.
  The `createTicket` pattern of passing raw body to an external API is a known gap,
  not a template to copy.

## Test discipline
- Tests live in the same commit as the code they cover — never in a follow-up commit.
- Assert outcomes, not implementation: use `toBe`/`toEqual`/`toContain` — not
  `toHaveBeenCalled`. See `tests/hardening.test.js` for the naming pattern:
  tests named after what an attacker or bad actor would try, not after function names.
- New test files belong in `tests/` and follow the threat-model naming already there
  (`signInEnumeration`, `passwordLeak`, `productOwnership`...).

## Known gaps — don't silently "fix" without checking the roadmap

- `getProducts` (`productControllers.js:24`, 130 lines) — filter+search+pagination
  inline, no service layer to split it into.
- `lib/errors.js`'s `AppError` hierarchy is only used in `orderControllers.js`/
  `uploadControllers.js` — `userControllers.js`/`productControllers.js` still return
  raw `res.status(...)`.
- `userControllers.js:112` leaks a raw caught error string to the client.

## Rules

- Never add `Co-Authored-By`/AI attribution to any commit or PR — no exceptions.
- Branch + PR, explicit confirmation before merge. `main` was force-pushed once
  already to strip AI attribution — don't trust old SHAs from stale docs.
- Never mass-delete against production Atlas — hand the script to the repo owner.
- Cross-repo: FE lives at `../amazin`. Auth contract: 15-min JWT access token +
  httpOnly rotating refresh cookie. `@types/` in FE is source-of-truth for shared
  API shapes until BE migrates to TypeScript (roadmap #8).
- On Redis/external service failures: check the fail-open decisions in
  `amazin-ENGINEERING.md` §2 before adding any "fail-closed" behavior.
