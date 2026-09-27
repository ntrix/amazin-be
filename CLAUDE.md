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
