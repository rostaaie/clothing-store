# Frontend — React (Vite) + Tailwind

Customer storefront and admin panel for the clothing store. See the [root README](../README.md) ([فارسی](../README.fa.md)) for the full project overview and setup guide.

## Quick start

```bash
npm install
cp .env.example .env   # set VITE_API_URL if your backend isn't on http://localhost:3000
npm run dev
```

Open `http://localhost:5173`. The backend must be running (CORS is enabled in `main.ts`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |

## Project structure

```
src/
  api/              API client and request functions (axios)
  components/       Shared components (product card, spinner, ...)
  context/          AuthContext and BasketContext
  layouts/          Customer and admin layouts
  pages/customer/   Customer pages
  pages/admin/      Admin pages (served under /admin)
  utils/            Helpers (price/date formatting, ...)
```

## Routes

- Public: `/`, `/products`, `/products/:id`, `/categories`, `/login`, `/register`, `/restore-account`
- Logged-in: `/profile`, `/basket`, `/checkout`, `/orders`, `/addresses`, `/wallet`, `/bookmarks`, `/tickets`
- Admin: `/admin` (dashboard, products, categories, users, orders, discount codes, tickets, restore requests)

## Notes

- The payment gateway in the backend is simulated and always succeeds.
- Demo accounts (including the admin) are created by `npm run seed` in the backend; see the root README.
