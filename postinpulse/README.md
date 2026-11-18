# POST IN PULSE — маркетплейс України

A Ukrainian-language marketplace for buying and selling new and used goods, positioned as a local alternative to eBay. It runs on the postinpulse.com domain, replacing the earlier apps that lived on the owner's domains.

## What's in this version

- **Home page**: search, the 8 categories, the newest listings, and the marketplace's selling points (safe deal, Nova Poshta delivery, no buyer fees).
- **Catalog** (`/catalog`): full-text search plus filters for category, city, condition, price range in hryvnia, and "delivery only", with four sort orders. Filters live in the URL so results can be shared; on mobile they open in a slide-over panel.
- **Listing page** (`/listing/[id]`): photos, description, seller rating, delivery options, a contact menu (call, WhatsApp, Viber, Telegram, SMS), ascending bids, and checkout with Nova Poshta / Ukrposhta / Meest (cash on delivery).
- **Post a listing** (`/sell`): photo upload (downscaled in the browser), validation, and a live preview card. New listings are visible to everyone straight away.
- **Deal feed** (`/feed`): a full-screen, swipeable feed. Likes, saves, and how long you look at a deal train a per-account ranking, and each card says why it was chosen.
- **Accounts** (`/login`): sign up with a phone number and password. Sessions last 30 days. Posting a listing requires an account, so your listings follow you between devices. Taste learned before you sign in is merged into the account.
- **Favorites** (`/favorites`) and **My account** (`/my`): your saved items, your listings (with unpublish), your orders, and log out.

Everything is in Ukrainian, prices are in UAH (₴), and cities and delivery services are Ukrainian.

## Data and live updates

Listings are shared: they're stored on the server and every visitor sees them. Open pages refresh the feed every 8 seconds and whenever the tab regains focus. Unchanged feeds come back as `304 Not Modified`, and photos are served from their own long-cached URLs, so the refreshes stay cheap on mobile data.

- **Storage**: when `DATABASE_URL` is set, listings go into Postgres (the `listings` table is created automatically). Without it, they're written to `.data/listings.json`, which is fine for local development but **not** for serverless hosting such as Vercel, where that file is wiped.
- **Ownership without accounts**: each browser gets a random owner key (in `localStorage`). The server stores only its SHA-256 hash, and only that browser can unpublish its listings.
- **Sample listings**: the 22 demo listings in `src/lib/market.ts` are off. Set `SHOW_SAMPLE_LISTINGS=true` only if you want them back. Any copies of those ids already stored in the database are deleted on startup.
- **Admin**: set `ADMIN_PHONE` and `ADMIN_PASSWORD`. That account can open `/admin` and remove any listing. Bids live in the `bids` table.
- **Stays in the browser**: favorites and orders. Checkout is still simulated. Contact buttons open the seller's phone, WhatsApp, Viber, Telegram, or SMS.

API: `GET/POST /api/listings`, `GET/DELETE /api/listings/[id]`, `GET/POST /api/listings/[id]/bids`, `POST /api/listings/[id]/bids/accept`, `GET /api/bids/mine`, `POST /api/listings/[id]/view`, `GET /api/listings/[id]/photos/[index]`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/feed`, `POST /api/feed/like`, `POST /api/feed/signal`.

## Deploy to postinpulse.com (Vercel)

1. Deploy the repo to Vercel (Cursor's **Publish** button, or import it at vercel.com/new).
2. In the Vercel project, open **Storage → Create Database → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL` automatically. Redeploy.
3. Under **Settings → Domains**, add `postinpulse.com` and `www.postinpulse.com`. If the domain is attached to another Vercel project (the old Pulse app), remove it there first.

See `.env.example` for the environment variables.

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:4317
```

Other scripts: `npm run build`, `npm start` (production server on port 4317), `npm run lint`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), lucide-react icons, and sonner for toasts.

## Project layout

```
src/app/                  routes: /, /catalog, /listing/[id], /sell, /favorites, /my
src/components/market/    marketplace UI (header, cards, catalog, dialogs, sell form)
src/components/ui/        shadcn/ui primitives
src/app/api/listings/     listings API (feed, create, delete, views, photos)
src/lib/market.ts         types, categories, cities, delivery services, sample listings
src/lib/store.tsx         client store: live feed polling, favorites and orders in localStorage
src/lib/server/           storage (Postgres or JSON file), validation, owner keys
```

## Next steps for production

- Real accounts, plus in-app messaging between buyers and sellers.
- Moderation and rate limiting for new listings.
- Phone/Diia sign-in, plus a Nova Poshta API integration for branch lookup and tracking.
- Real payment escrow (e.g. LiqPay, Monobank acquiring) for the safe deal.
