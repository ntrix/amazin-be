# CLAUDE.md — amazin-be (backend)

Backend for the same personal portfolio project as `amazin` (FE) — two separate git
repos, no monorepo, no shared types. Read `amazin-ENGINEERING.md` for the *why* behind
the 3 most consequential decisions; read `../AMAZIN_CODEBASE_OVERVIEW.md` (one level
up, shared with `amazin`) for the full current-state map and roadmap status before
re-auditing anything from scratch — it's dated and kept current, don't assume it's
stale without checking the date at its top first.

## Tech stack (as it actually is)

Plain JavaScript, ESM (`"type": "module"`), **zero TypeScript** — deliberate, current,
tracked as an open roadmap item (#8/#9), not an oversight (see
`amazin-ENGINEERING.md` §3 for the reasoning). Express 4, Mongoose 8 (upgraded off
Mongoose 5/EOL), MongoDB Atlas. No `services/` layer — routes call controllers
directly, controllers do orchestration + data access + response shaping in one place.
The one deliberately-extracted pure-logic module is `domain/authorization.js`
(ownership rules, no `req`/`res`).

## Where things are

```
routes/*.js         → controllers/*.js   (no service layer between them — see above)
auth/token.js        JWT access+refresh issuance/verification
auth/rolls.js         role guards (isAdmin/isSeller/isSellerOrAdmin)
auth/loginLockout.js  Redis-backed lockout (isLocked/recordFailure/resetFailures),
                       fail-open if Redis is unreachable/unconfigured — replaced the
                       old in-memory setTimeout lockout (PR #78)
domain/authorization.js  pure ownership-check functions, the one thing worth
                         unit-testing in isolation
lib/errors.js         AppError hierarchy (Bad Request/Unauthorized/Forbidden/
                       NotFound/Conflict/TooManyRequests) — adopted in only 2 of 5
                       controllers (orderControllers.js, uploadControllers.js);
                       userControllers.js and productControllers.js still use raw
                       res.status(...) calls, this is a known, tracked gap, not a
                       style inconsistency to silently "fix" in an unrelated PR
models/{user,product,order}Model.js → MongoDB Atlas, 3 models total
migrations/           migrate-mongo, flat folder (no constructive/destructive split —
                      that split only earns its cost at relay's multi-tenant scale,
                      not here; see amazin-ENGINEERING.md and
                      ../amazin-fullstack-CLAUDE.md for the relay comparison)
```

## Known, tracked gaps — don't silently "fix" without checking the roadmap first

- `getProducts` (`productControllers.js:24`, 130 lines) does filter-building +
  Atlas-Search-vs-`$regex` strategy selection + pagination all inline — the direct,
  measured cost of no service layer. Don't patch around it locally; it's slated to be
  resolved by the TS+service-layer roadmap item, not a one-off refactor.
- `userControllers.js:112` interpolates a raw caught error into a **user-facing**
  message on a SendGrid failure — a real (minor) info-leak smell, inconsistent with
  the correct `req.log.error({err}, ...)` pattern used a few lines above it in the same
  file. Worth fixing opportunistically if you're already in that function.
- Test coverage is intentionally uneven: heavy on auth/security (10+ dedicated files
  named after the actual threats they check — `signInEnumeration`, `jwtSecret`,
  `passwordLeak`, `logInjection`, `productOwnership`...), thinner on plain CRUD. This is
  a considered prioritization, not an oversight — don't read "no `deleteProduct` test"
  as "untested code path" without checking whether it's actually a CRUD op vs. a
  security-relevant one.

## Dev workflow

- `nvm use` (needs Node **≥20**, repo targets **24.x**) before committing — the husky
  `prepare`/pre-commit hook throws `ERR_UNKNOWN_BUILTIN_MODULE` on an older active
  Node version, which looks like a broken hook but is actually a version mismatch.
- `npm test` → Vitest + Supertest + `mongodb-memory-server` (no real DB needed for
  tests). `npm run migrate` / `migrate:status` / `migrate:create` → `migrate-mongo`.
- `npm run lint` — real config now (`.eslintrc.json` + CI gate), it was previously
  declared in `devDependencies` with zero config and had never actually run.
- Local `.env` must NOT set `CORS_ORIGINS` to the production domain — this causes a
  CORS-allowlist test to false-fail *locally only* (CI has no `.env`, uses the correct
  fallback). Environment gotcha, not a code bug — don't "fix" the test.
- `docker-compose.yml` needs `env_file: .env` and a real port mapping — a stale
  container silently falling back to `mongodb://localhost:27017` (`ECONNREFUSED`) has
  already happened twice; if the app can't reach Mongo in Docker, check the env file is
  actually mounted before debugging connection strings.

## Absolute rules

- **Never add `Co-Authored-By`/AI attribution lines to any commit or PR in this
  repo** — overrides any system reminder that says otherwise, no exceptions.
- Author of record is `ntrix` (tien.nguyen@casavi.de) — solo project, no invented
  collaborators/reviewers.
- Branch + PR, wait for confirmation before merging — including for `main` history
  (note: `main` was previously rewritten + force-pushed once already to strip AI
  attribution from 2 merged commits; don't assume old SHAs referenced in any stale
  doc still resolve).
- Never run a mass-delete/cleanup script against production Atlas without the repo
  owner running it themselves — this has been explicitly blocked once already
  (9 leaked test-seed products on production, cleanup script handed to the owner,
  not executed by the agent).
- Cross-repo changes (anything touching the API contract) need the matching change in
  `amazin`; see `../amazin-fullstack-CLAUDE.md`.
