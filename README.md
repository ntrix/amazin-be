# Welcome to Amazin' Amazim Store — Backend

## A Node.js / Express / MongoDB REST API for the Amazin Amazon (& Netflix & ...) Clone

## What is Amazin Backend?

This is the REST API powering [Amazin' Amazim Store][fenx] — a long-term personal learning project, not a commercial product. The frontend (React, Nx, Redux Toolkit) lives in a separate repo and talks to this service over HTTP; this repo is the data/auth/business-logic layer: users, products, orders, payments, image uploads, and a handful of third-party config endpoints (PayPal, Google Maps, currency rates).

### Features

- JWT authentication (sign in, register), with a bearer-token middleware gate (`checkToken`) and role guards (`isAdmin`, `isSeller`, `isSellerOrAdmin`)
- Users: sign in, register, profile update, admin user management (list/edit/delete), top-seller listing
- Products: list/search/filter, categories, CRUD (seller/admin only), product reviews
- Orders: create, pay, deliver, list mine / list all (seller/admin), delete (admin)
- Image uploads via Multer + Cloudinary
- Config endpoints: PayPal client id, Google Maps key, live currency rates, crypto/BTC history
- Contact form submission (SendGrid)
- Input validation via `express-validator` (`middleware/validate.js`)
- Security headers via `helmet`, CORS enabled

## Tech stack

![Tech Stack Backend][stackbe]

- [Node.js][node]
- [Express][express]
- [MongoDB][mongo] + [Mongoose][mongoose]
- [MongoDB Atlas][atlas] (hosted cluster)
- [Cloudinary](https://cloudinary.com/) (image hosting)
- [SendGrid](https://sendgrid.com/) (contact form email)
- `jsonwebtoken` + `bcryptjs` (auth)
- Deployed on [Render](https://render.com/) — previously Heroku, then Cyclic.sh (both since discontinued/shut down)

## Source code

Backend (this repo): [github.com/ntrix/amazin-be][bev1]

Frontend: [github.com/ntrix/amazin][fenx]

## Learning by Doing

Same philosophy as the frontend repo — small steps, revisited often, honestly tracked.

| Part | Description                                                                  | Status   |
| ---- | ----------------------------------------------------------------------------- | -------- |
| 01   | Initial API: users, products, orders, auth                                    | Done     |
| 02a  | Deploy on Heroku                                                               | Done     |
| 02b  | Migrate to Cyclic.sh (serverless)                                              | Done, then **service shut down (2024)** |
| 02c  | Migrate to [Render][render] (free tier)                                       | Doing    |
| 03   | MongoDB Atlas cluster resumed after long inactivity pause                     | Done     |
| 04   | `engines.node` updated `12.x` → `24.x` (Node 12 unsupported on modern hosts)  | Done     |
| 05   | Fix error-handling middleware missing its 4th `next` param (never invoked)     | **Todo** |
| 06   | Fix response status codes clobbered by `writeHead()` before `.status()`       | **Todo** |
| 07   | Automated tests                                                                | **Todo** |
| 08   | CI (GitHub Actions)                                                            | **Todo** |

## How to run this project

1. `npm ci`
2. Create a `.env` file with: `MONGODB_URL`, `JWT_SECRET_A`, `CD_API_KEY`, `CD_API_SECRET`, `CD_NAME`, `GOOGLE_API_KEY`, `PAYPAL_CLIENT_ID`, `RATES_API_KEY`, `SENDGRID_API_KEY`, `FROMMAIL`, `TOMAIL`, `NODE_ENV`
3. `npm start` (or `npm run devstart` for auto-reload during development)

[node]: https://nodejs.org/
[express]: https://expressjs.com/
[mongo]: https://www.mongodb.com/
[mongoose]: https://mongoosejs.com/
[atlas]: https://www.mongodb.com/cloud/atlas
[render]: https://render.com/
[fenx]: https://github.com/ntrix/amazin
[bev1]: https://github.com/ntrix/amazin-be
[stackbe]: https://raw.githubusercontent.com/ntrix/amazin/nx/apps/amazin/src/stories/img/mongo-express-react-node-atlas-mongoose-heroku-1000.png
