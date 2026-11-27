# Backend — NestJS API

REST API for the clothing store. See the [root README](../README.md) ([فارسی](../README.fa.md)) for the full project overview and setup guide.

## Quick start

```bash
# from the repo root: docker compose up -d --wait   (starts MySQL)
npm install
cp .env.example .env   # DB defaults match docker-compose; set JWT secrets
npm run seed           # optional demo data (wipes catalog/order/wallet tables!)
npm run start:dev
```

- API: `http://localhost:3000` (override with `PORT`)
- Swagger docs: `http://localhost:3000/api`
- Uploaded images: `http://localhost:3000/uploads/...`

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Description |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | MySQL connection. The `.env.example` defaults match the repo's `docker-compose.yml` (host `localhost`, port `3307`, user/password `root`, database `store_db`) |
| `JWT_SECRET_KEY`, `JWT_EXPIRATION` | Access token secret and lifetime (e.g. `1h`) |
| `JWT_REFRESH_SECRET_KEY`, `JWT_REFRESH_EXPIRATION` | Refresh token secret (must differ from the access secret) and lifetime (e.g. `7d`) |
| `PORT` | Optional, defaults to `3000` |

## Modules

`auth` · `users` · `products` · `categories` · `basket_items` · `bookmark_products` · `orders` · `payment` (simulated) · `wallet` · `address` · `ticket` · `discount_code` · `recommender` · `restore-request` · `ip-tracker`

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Watch mode |
| `npm run build` / `npm run start:prod` | Production build / run |
| `npm run seed` | Reset and seed demo data |
| `npm run test`, `test:cov`, `test:e2e` | Unit, coverage, e2e tests |
| `npm run evaluate` | Offline evaluation of the recommender |
| `npm run check:recommender` | Recommender sanity check |
| `npm run verify:recommender` | Tests + check + evaluation |
| `npm run lint`, `npm run format` | ESLint / Prettier |

## Notes

- Tables are created automatically with TypeORM `synchronize: true`. Use migrations before any production deployment.
- Built with [NestJS](https://nestjs.com/).
