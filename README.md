# Clothing Store — Full-Stack E-Commerce

**English** | [فارسی](./README.fa.md)

A full-stack online clothing store with a customer storefront and an admin panel, built with **NestJS + MySQL** on the backend and **React + Vite + Tailwind** on the frontend. The UI is in Persian (RTL).

## Features

**Customer storefront**
- Sign up / log in with a mobile number (JWT access + refresh tokens)
- Browse products by category tree (men's / women's clothing → clothes, bags, shoes, accessories, sports), search and filter
- Product page with similar products and frequently-bought-together items
- Basket, checkout with discount codes, order history and order details
- Multiple saved addresses, bookmarks, wallet (top-up, withdraw, transactions)
- Support tickets with threaded conversations
- Personalized recommendations ("for me") and top-selling products
- Account restore request for deactivated accounts

**Admin panel (`/admin`)**
- Dashboard
- CRUD for products (with image upload), categories (with image upload) and users
- Discount code management
- Order review: approve, cancel, refund
- Per-user wallet and transaction view
- Support ticket management
- Account restore request management

**Backend extras**
- Swagger API docs at `/api`
- Recommendation engine (time-decayed signals from purchases, bookmarks and views) with evaluation scripts
- IP tracking with temporary blocking
- Database seeder with realistic fake data (users, categories, products, orders, wallets)
- Unit tests (Jest) and an e2e test setup

> The payment gateway is **simulated** (`payment-provider.service.ts`) and always reports success. It is not meant for real payments.

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | NestJS 11, TypeScript, TypeORM, MySQL, Passport JWT, Swagger, Multer, Jest |
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios, react-hot-toast, lucide-react |

## Project structure

```
.
├── ecommerce/        # NestJS backend (REST API, seeds, tests)
│   ├── src/
│   ├── test/
│   └── uploads/      # product & category images (served at /uploads)
└── shop-frontend/    # React frontend (customer + admin panels)
    └── src/
```

## Getting started

### Prerequisites
- Node.js 20 or newer
- **Docker** (recommended, creates the database for you) **or** a local MySQL 8 server

### 1. Start the database

**Option A — Docker (recommended).** From the repository root:
```bash
docker compose up -d --wait
```
This starts MySQL 8 on port `3307` and creates the `store_db` database automatically (user `root`, password `root`). Stop it with `docker compose down` (add `-v` to also delete its data).

**Option B — your own MySQL.** Create an empty database and put its credentials in `ecommerce/.env`:
```sql
CREATE DATABASE store_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Tables are created automatically on first run (TypeORM `synchronize`).

### 2. Backend
```bash
cd ecommerce
npm install
cp .env.example .env     # DB defaults already match docker-compose; set your own JWT secrets
npm run seed             # optional: fill the database with demo data
npm run start:dev
```
The API runs at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api`.

> ⚠️ `npm run seed` **wipes** the catalog, order, basket, bookmark and wallet tables before inserting demo data. Don't run it against a database you care about.

### 3. Frontend
```bash
cd shop-frontend
npm install
cp .env.example .env     # VITE_API_URL defaults to http://localhost:3000
npm run dev
```
Open `http://localhost:5173`.

## Demo accounts (created by `npm run seed`)

| Role | Mobile | Password |
|---|---|---|
| Admin | `09123456789` | `1234` |
| Admin | `09111111111` | `Test123!` |
| User | `09987654321` | `User123!` |
| User | `09222222222` | `Test123!` |

Log in as an admin to see the admin panel link in the user menu, or go to `/admin`.

## Useful scripts (backend)

| Command | Description |
|---|---|
| `npm run start:dev` | Start in watch mode |
| `npm run build` / `npm run start:prod` | Build and run production build |
| `npm run seed` | Reset and seed demo data |
| `npm run test` / `npm run test:cov` | Unit tests / coverage |
| `npm run test:e2e` | End-to-end tests |
| `npm run verify:recommender` | Recommender tests + sanity check + offline evaluation |
| `npm run lint` | ESLint (with auto-fix) |

## Product images

Images uploaded from the admin panel are stored in `ecommerce/uploads/products` and `ecommerce/uploads/categories` and served by the backend at `/uploads/...`. The repository includes a set of sample images in these folders.

## Notes

- This project is a learning / portfolio project. Before any real deployment, replace the JWT secrets, disable `synchronize` in favor of migrations, and integrate a real payment provider.
- Never commit your `.env` file; only `.env.example` is tracked.
