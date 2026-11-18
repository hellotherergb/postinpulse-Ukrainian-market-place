# Deploying POST IN PULSE to a new server

## 1. Settings

Create a file named `.env` in this folder (or set these in your host's dashboard):

```
DATABASE_URL=postgres://...      # your Postgres database (Neon, Supabase, your own server)
ADMIN_PHONE=380670000001         # admin login phone, digits only
ADMIN_PASSWORD=...               # admin password, at least 6 characters
SHOW_SAMPLE_LISTINGS=false
```

To keep all current listings, users, and bids, use the same `DATABASE_URL` the site uses today. Find it in Vercel under **ukr-trade → Settings → Environment Variables**. Tables are created automatically on a new, empty database.

Without `DATABASE_URL` the app saves data to `.data/` on the server's disk. That only works on a normal server (VPS), not on serverless hosts.

## 2a. Run on a server with Node.js 20+ (VPS)

```bash
npm install
npm run build
npm start          # listens on port 4317
```

Keep it running after you log out with a process manager, for example:

```bash
npm install -g pm2
pm2 start npm --name postinpulse -- start
pm2 save
```

## 2b. Run with Docker

```bash
docker build -t postinpulse .
docker run -d --restart unless-stopped -p 4317:4317 --env-file .env postinpulse
```

## 2c. Hosting platforms (Render, Railway, Netlify, Vercel, ...)

Upload this folder or connect the repository, then set:

- Build command: `npm run build`
- Start command: `npm start`
- Environment variables: the ones from step 1

## 3. Connect the domain

Put a web server or proxy (Nginx, Caddy, or the host's own) in front of port 4317 with HTTPS. Then, in Hostinger DNS for postinpulse.com, change the `@` A record and the `www` record to point at the new server.
