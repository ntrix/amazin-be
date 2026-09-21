# Welcome to Amazin' Amazim Store — Backend

[![CI](https://github.com/ntrix/amazin-be/actions/workflows/test.yml/badge.svg)](https://github.com/ntrix/amazin-be/actions/workflows/test.yml)
[![codecov](https://codecov.io/github/ntrix/amazin-be/branch/main/badge.svg)](https://codecov.io/github/ntrix/amazin-be)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=ntrix_amazin-be&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=ntrix_amazin-be)
<a href="https://sonarcloud.io/summary/new_code?id=ntrix_amazin-be"><img src="https://sonarcloud.io/images/project_badges/sonarcloud-highlight.svg" alt="SonarQube Cloud" height="20"></a>

## A Node.js / Express / MongoDB REST API for the Amazin Amazon (& Netflix & ...) Clone

## What is Amazin Backend?

This is the REST API powering [Amazin' Amazim Store][fenx] — a long-term personal learning project, not a commercial product. The frontend (React, Nx, Redux Toolkit) lives in a separate repo and talks to this service over HTTP; this repo is the data/auth/business-logic layer: users, products, orders, payments, image uploads, and a handful of third-party config endpoints (PayPal, Google Maps, currency rates).

### Features

- JWT authentication (sign in, register): short-lived (15m) access token in the response body, long-lived (7d) refresh token as an httpOnly cookie with rotation + server-side revocation on logout — bearer-token middleware gate (`checkToken`) and role guards (`isAdmin`, `isSeller`, `isSellerOrAdmin`)
- OAuth login via Google and GitHub ([Passport](http://www.passportjs.org/), stateless — `session: false`): links to an existing password account by email on first login instead of creating a duplicate user; issues the same access/refresh token pair as password login, so every downstream auth check is provider-agnostic — each provider is its own optional feature, 404s cleanly if its client id/secret env vars are unset
- Users: sign in, register, profile update, admin user management (list/edit/delete), top-seller listing
- Products: list/search/filter, categories, CRUD (seller/admin only), product reviews
- Orders: create, pay, deliver, list mine / list all (seller/admin), delete (admin)
- Image uploads via Multer + Cloudinary
- Config endpoints: PayPal client id, Google Maps key, live currency rates, crypto/BTC history
- Contact form submission (SendGrid)
- Input validation via `express-validator` (`middleware/validate.js`)
- Security headers via `helmet`, CORS enabled
- Error tracking via [Sentry][sentry] — only real unhandled 500s, not expected `AppError` rejections
- APM via [New Relic][newrelic] — latency, throughput, slow endpoints
- Structured logging via [pino][pino] (`pino-http`), replacing raw `console.*`
- Typed error hierarchy (`lib/errors.js`) — one consistent HTTP status code per failure
- Versioned DB migrations via [migrate-mongo][migratemongo]
- Orders check stock atomically on creation — no overselling

## Tech stack

![Tech Stack Backend][stackbe]

- [Node.js][node]
- [Express][express]
- [MongoDB][mongo] + [Mongoose][mongoose]
- [MongoDB Atlas][atlas] (hosted cluster)
- [Cloudinary](https://cloudinary.com/) (image hosting)
- [SendGrid](https://sendgrid.com/) (contact form email)
- `jsonwebtoken` + `bcryptjs` (auth)
- [Docker](https://www.docker.com/) (multi-stage build, non-root user) — same image runs locally, on Render, and on AWS
- Deployed on [Render](https://render.com/) (passive failover) and [AWS ECS Fargate](https://aws.amazon.com/fargate/) behind an Application Load Balancer — previously Heroku, then Cyclic.sh (both since discontinued/shut down)

## Source code

Backend (this repo): [github.com/ntrix/amazin-be][bev1]

Frontend: [github.com/ntrix/amazin][fenx]

## Learning by Doing

Same philosophy as the frontend repo — small steps, revisited often, honestly tracked.

| Part | Description                                                                  | Status   |
| ---- | ----------------------------------------------------------------------------- | -------- |
| 01   | Initial API: users, products, orders, auth                                    | Done     |
| 02a  | Deploy on Heroku                                                               | Done     |
| 02b  | Migrate to Cyclic.sh (serverless), later shut down (2024)                     | Done     |
| 02c  | Migrate to [Render][render] (free tier)                                       | Done     |
| 03   | MongoDB Atlas cluster resumed after long inactivity pause                     | Done     |
| 04   | `engines.node` updated `12.x` → `24.x` (Node 12 unsupported on modern hosts)  | Done     |
| 05   | Fix `ERR_HTTP_HEADERS_SENT` crash loop: dead `frontend/build` static mount, missing `next` param on error handler, `writeHead()` clobbering `.status()` | Done |
| 06   | Automated tests: Vitest + Supertest + mongodb-memory-server                   | Done     |
| 07   | CI (GitHub Actions) + [Codecov][codecov] + [SonarQube Cloud][sonar]           | Done     |
| 08   | Repo switched from private to public (09/2026)                                | Done     |
| 09a  | Containerized with Docker (multi-stage build on `node:24-alpine`, non-root user, HTTP healthcheck) | Done |
| 09b  | Render switched to run the same Docker image via Blueprint (`render.yaml`), replacing the native Node build | Done |
| 10a  | AWS Migration — new AWS account set up from scratch: IAM user with MFA (no root for daily use), AWS Budgets configured before any billable resource | Done |
| 10b  | AWS Migration — migrated to AWS ECS Fargate + Application Load Balancer (image in ECR, secrets in SSM Parameter Store, dedicated IAM execution role) — Render kept running as a live failover throughout | Done |
| 10c  | AWS Migration — HTTPS on the AWS endpoint via a free ACM certificate and a custom subdomain (`api.tiennguyen.de`) | Done |
| 10d  | AWS Migration — CloudWatch Alarms (unhealthy target, 5xx errors) → SNS email, so downtime pages instead of waiting to be noticed | Done |
| 10e  | AWS Migration — GitHub Actions CI/CD (build → ECR → ECS deploy) authenticating via OIDC, no AWS keys stored in GitHub | Done |
| 11a  | Pre-commit tooling: Husky + lint-staged + commitlint | Done |
| 11b  | Real ESLint config wired into CI — caught a live crash bug on the first run | Done |
| 12a  | Structured logging with [pino][pino], replacing `console.*` | Done |
| 12b  | Error tracking with [Sentry][sentry] — real 500s only, not expected `AppError`s | Done |
| 12c  | Typed `AppError` hierarchy — normalized 9 misused HTTP status codes | Done |
| 12d  | DB migrations via [migrate-mongo][migratemongo]: query indexes + a stock-level seed | Done |
| 12e  | Orders check stock atomically on creation — no overselling, no lost-update race | Done |
| 13a  | Test suite: 14→22 files, 40→67 tests, ~53%→70% line coverage | Done |
| 13b  | Fixed a seed-data bug that silently truncated the demo dataset | Done |
| 13c  | Fixed a flaky parallel-test race in the shared DB connection | Done |
| 14a  | APM with [New Relic][newrelic] — kept separate from Sentry on purpose (see env var table) | Done |
| 14b  | Fixed a Docker build crash: `npm ci --omit=dev` ran husky's `prepare` script, but husky itself isn't installed under `--omit=dev` | Done |

## Architecture

### ECS Fargate, right after first going live (plan)

```mermaid
flowchart LR
  Internet([Internet]) -->|"HTTP :80"| ALB["ALB<br/>alb-sg"]
  ALB -->|forwards| TG["Target Group<br/>amazin-be-tg"]
  TG -->|"routes by IP"| Task["Fargate Task<br/>task-sg"]
  Task -->|queries| Mongo[("MongoDB Atlas<br/>external")]
  Service["ECS Service"] -->|"launches, restarts"| Task
  Service -->|registers| TG
  Role["IAM Execution Role"] -. "assumed at launch" .-> Task
  Role -. "pulls image" .-> ECR[("ECR")]
  Role -. "writes logs" .-> Logs[("CloudWatch Logs")]
  Role -. "reads secrets" .-> SSM[("SSM + KMS")]
  Render[["Render<br/>passive failover, independent"]]

  subgraph VPC["VPC · eu-central-1"]
    ALB
    TG
    Task
    Service
  end
```

### Full picture, after custom domain, monitoring, and CI/CD (actual result)

```mermaid
flowchart TB
  GitHubBE["GitHub: BE push to main<br/><b>amazin-be</b>"] --> ActionsBE["GitHub BE Actions<br/>OIDC role"]
  ActionsBE -->|"push image"| ECR2[("ECR")]
  ActionsBE -->|"register + deploy"| Service2
  GitHubBE -.->|"native auto-deploy"| Render2

  DNS["Namecheap DNS<br/>api.tiennguyen.de"] -. CNAME .-> ALB2
  ACM["ACM Certificate<br/>*.tiennguyen.de"] -. "TLS cert" .-> ALB2

  GitHubFE["GitHub: FE push to nx<br/><b>amazin</b>"] --> ActionsFE["GitHub FE Actions"]
  ActionsFE -->|"push image"| Netlify2(["Netlify<br/><b>active frontend</b>"]) .->|"?"| Render2
  Netlify2 -->|"HTTPS :443"| ALB2["ALB"]
  ActionsFE -->|"push image"| Vercel2(["Vercel<br/><i>suspense</i>"]) -->|"HTTPS :443"| Render2
  ALB2 -->|forwards| TG2["Target Group"]
  TG2 -->|"routes by IP"| Task2["Fargate Task"]
  Task2 -->|queries| Mongo2[("MongoDB Atlas")]
  Service2["ECS Service"] -->|"launches, restarts"| Task2
  Service2 -->|registers| TG2

  ~~~Role2["IAM Execution Role"] -. "task assumes" .-> Task2
  Role2 -. "pulls image" .-> ECR2
  Role2 -. "writes logs" .-> Logs2[("CloudWatch Logs")]
  Role2 -. "reads secrets" .-> SSM2[("SSM + KMS")]

  TG2 -. watches .-> Alarms["CloudWatch Alarms"]
  Alarms --> SNS["SNS Topic"]
  SNS --> Email([Email])

  Task2 -. "image upload" .-> Cloudinary[("Cloudinary")]
  Task2 -. "contact/alert email" .-> SendGrid[("SendGrid")]

  Task2 -. "unhandled errors" .-> Sentry[("Sentry")]
  Task2 -. "APM traces" .-> NewRelic[("New Relic")]
  Task2 -. "docs (planned)" .-> OpenAPI["OpenAPI<br>/api-docs"]
  Sentry -. "alerts (planned)" .-> Slack[("Slack")]
  Sentry -. alerts .-> Email
  NewRelic -. alerts .-> Slack
  NewRelic -. alerts .-> Email

  Render2[["Render<br/><i>passive failover, unchanged</i>"]]

  subgraph VPC2["VPC · eu-central-1"]
    ALB2
    TG2
    Task2
    Service2
  end
```

## Test Coverage

Unit tests run on every push/PR via GitHub Actions, with coverage reported to Codecov and code smells to SonarQube Cloud (badges at the top of this page).

- 21 test files, 65 tests
- ~70% line coverage
- Real, ephemeral MongoDB per test file (`mongodb-memory-server`) — never touches the production Atlas cluster

Organized around this API's own 4 layers (Interface → Application → Domain → Infrastructure):

| Layer | Covers | Test files |
| ----- | ------ | ---------- |
| 1. Interface — routes, app-level middleware | CORS allowlist, rate-limiting, JSON/file body-size limits, upload temp-file location | `hardening`, `bodySizeLimit`, `uploadFileSizeLimit`, `uploadTempDir` |
| 2. Application — controllers (orchestration) | Seed/backup guards, password-field exposure, product ownership enforcement, order buyer/seller/admin access, config API proxying (XSS-safe JSON), image-upload error handling, contact-form log sanitization, the 3 most business-critical flows (auth, product search/filter/pagination, reviews) | `seedGuard`, `passwordLeak`, `productOwnership`, `orderControllers`, `configXss`, `uploadErrorRejection`, `logInjection`, `authentication`, `getProducts`, `postReviews` |
| 3. Domain — framework-independent business rules | Order/product ownership rules (`domain/authorization.js`) — plain functions, no Express/Mongoose, no DB needed to test | `authorization` |
| 4. Infrastructure — persistence (models) + auth (JWT) | Unique email constraint + role defaults, required-field validation; JWT fail-fast when `JWT_SECRET_A` is missing instead of a public hardcoded fallback | `models`, `jwtSecret` |

## How to run this project

1. `npm ci`
2. Create a `.env` file with the variables below
3. `npm start` (or `npm run devstart` for auto-reload during development)

| Variable | What it's for | Where to get it |
| -------- | -------------- | ---------------- |
| `MONGODB_URL` | Database connection string | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — free M0 cluster, add a database user, then **Connect → Drivers** and copy the URI (fill in the password yourself) |
| `JWT_SECRET_A` | Signs/verifies short-lived (15m) access tokens | Not a service — any random string you generate yourself, e.g. `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Signs/verifies long-lived (7d) refresh tokens, sent only as an httpOnly cookie | Not a service — a **different** random string from `JWT_SECRET_A` (so leaking one secret doesn't compromise the other), e.g. `openssl rand -hex 32` |
| `CD_NAME`, `CD_API_KEY`, `CD_API_SECRET` | Image hosting | [Cloudinary](https://cloudinary.com/) free account — all three values are shown on the Dashboard home page |
| `GOOGLE_API_KEY` | Google Maps (shipping address picker) | [Google Cloud Console](https://console.cloud.google.com/) → enable **Maps JavaScript API** → **APIs & Services → Credentials** → create an API key (needs a billing account on file, but this app's usage stays inside Google's free monthly credit) |
| `PAYPAL_CLIENT_ID` | Checkout payment button | [PayPal Developer](https://developer.paypal.com/) → **My Apps & Credentials** → create a Sandbox app and copy its Client ID; leave unset and it falls back to PayPal's public sandbox id (`sb`) |
| `RATES_API_KEY` | Live currency conversion rates | [exchangeratesapi.io](https://exchangeratesapi.io/) free plan — key is shown right after signup |
| `SENDGRID_API_KEY` | Sends contact-form emails | [SendGrid](https://sendgrid.com/) free account → **Settings → API Keys → Create API Key** |
| `FROMMAIL` | Sender address for those emails | Must be a **verified sender** in SendGrid (**Settings → Sender Authentication**) — an unverified address will fail to send |
| `TOMAIL` | Inbox that receives contact-form submissions | Any email address you own — no verification needed |
| `NODE_ENV` | `development` or `production` | Set by you, not from a service |
| `SENTRY_DSN` | Error tracking (real 500s only) | [Sentry](https://sentry.io/) free plan → create a Node project → DSN shown on setup; optional, skipped if unset |
| `NEW_RELIC_LICENSE_KEY` | APM (latency, throughput, slow endpoints) | [New Relic](https://newrelic.com/) free tier → **Add data** → Node.js → license key shown there; optional, agent fully disabled if unset |
| `ATLAS_SEARCH_ENABLED` | Switches product search from `$regex` to Atlas Search (relevance-ranked, fuzzy) | Set to `true` only after the `product_search` index (created by `migrations/`, see below) reports status **READY** in the Atlas UI — until then, or if unset, falls back to `$regex` automatically |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | "Continue with Google" login | [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials** → **Create OAuth client ID** (type: Web application) → add `GOOGLE_CALLBACK_URL` as an Authorized redirect URI; route 404s if unset |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | "Continue with GitHub" login | [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps → New OAuth App** → set its Authorization callback URL to `GITHUB_CALLBACK_URL`; route 404s if unset |
| `FE_ORIGIN` | Where OAuth login redirects back to after setting the refresh cookie | The frontend's own URL, e.g. `http://localhost:3000` in dev |

Sentry here is error-tracking only, tracing turned off on purpose — its own free-tier tracing would overlap with a dedicated APM tool, and a dedicated APM gives better performance dashboards/alerting than a bolted-on tracing feature. Extra integration surface, but no double-counted signal.

New Relic alerts (error rate, response time, throughput) are wired to Email and Slack; each alert condition's Runbook URL points back to this README section, so a notification links straight to the context needed to act on it.

Product search runs on Atlas Search (Lucene-based, relevance-ranked, typo-tolerant) when `ATLAS_SEARCH_ENABLED=true`, with an automatic `$regex` fallback if the query fails (index still building, or not on Atlas at all — `mongodb-memory-server`/local Mongo can't run `$search`, which is why local dev and tests always exercise the fallback path).

Chose Atlas Search over a dedicated engine (Elasticsearch, Algolia) on purpose: it's bundled with the Atlas cluster already in use, so there's no second service to run and no sync pipeline to keep the index from drifting out of date with the source data — the right trade-off at this catalog size, where a standalone search cluster would be solving a scale problem this app doesn't have.

### Or with Docker

```
docker build -t amazin-be:local .
docker run -d --name amazin-be -p 5050:5000 --env-file .env amazin-be:local
```

[node]: https://nodejs.org/
[pino]: https://getpino.io/
[sentry]: https://sentry.io/
[newrelic]: https://newrelic.com/
[migratemongo]: https://github.com/seppevs/migrate-mongo
[express]: https://expressjs.com/
[mongo]: https://www.mongodb.com/
[mongoose]: https://mongoosejs.com/
[atlas]: https://www.mongodb.com/cloud/atlas
[render]: https://render.com/
[codecov]: https://codecov.io/
[sonar]: https://sonarcloud.io/
[fenx]: https://github.com/ntrix/amazin
[bev1]: https://github.com/ntrix/amazin-be
[stackbe]: https://raw.githubusercontent.com/ntrix/amazin/nx/apps/amazin/src/stories/img/mongo-express-react-node-atlas-mongoose-heroku-1000.png
