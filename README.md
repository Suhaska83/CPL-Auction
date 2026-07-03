# CPLAuction — Celebria Premier League

A live cricket player-auction platform for the **Celebria Premier League**. This repo ships **two ready-to-run flavours** of the same app — pick whichever fits your hosting budget:

| Flavour | Stack | Hosting | Cost | Real-time |
|---|---|---|---|---|
| **`/` (root)** | Next.js 15 · Prisma · SQLite · Socket.IO | Fly.io / Render / Railway / VPS | $0–5/mo | Socket.IO |
| **`/web-static`** | Vite · React · Firebase RTDB | **GitHub Pages** + Firebase (free) | **$0** | Firebase live listeners |

Both share the same visual design (deep-navy stadium theme, gold accents), the same page layout (Welcome / Auction / Teams / Players / Admin), and the same auction rules (start → bid → sold/unsold, per-team max-bid enforcement).

- **Full-stack Node version** → see below.
- **Static + Firebase version** → see [`web-static/README.md`](./web-static/README.md).

## Features

- **Welcome page** — Tournament landing with CPLAuction branding.
- **Auction page** — Live player-on-bid card with team, current price, max bid and Sold / Unsold / Available counters. Updates instantly through Socket.IO (falls back to 5s polling if websockets are blocked).
- **Teams page** — Grid of franchises with squad size, balance, max bid, reserve balance and the list of players purchased.
- **Players page** — All 52 players with `All / Available / Sold / Unsold` filter tabs, live search and status badges. Live counts update every few seconds.
- **Admin console** (`/admin`) — Auctioneer tools: pick the next player, one-tap bid per team, mark Sold / Unsold, reset.
- **SQLite database** via Prisma stores tournament settings, teams, players, bids and the live auction state.

## Tech stack

| Layer          | Choice                                                  |
|----------------|---------------------------------------------------------|
| Framework      | Next.js 15 (App Router) + React 18 + TypeScript         |
| Styling        | Tailwind CSS with custom stadium theme                  |
| Realtime       | Socket.IO (custom Node server) + polling fallback       |
| ORM / DB       | Prisma 5 + SQLite (swap to Postgres/MySQL by env var)   |
| Runtime script | `tsx` (TypeScript on Node without a build step)         |

## Getting started

Requires Node.js 18.18+ (Node 22 works great — same version we developed on).

```bash
npm install
npx prisma db push       # create SQLite db + tables
npm run db:seed          # 4 teams + 52 sample players
npm run dev              # http://localhost:3000
```

Env vars (see `.env`):

- `DATABASE_URL` — Prisma connection string (`file:./dev.db` by default).
- `ADMIN_PASSWORD` — password required by `/admin` and admin API (default `admin123`).
- `PORT` — HTTP port (default `3000`).

## Running the auction

1. Open **`http://localhost:3000/`** — landing.
2. Open **`http://localhost:3000/admin`** in a second tab (auctioneer only). Enter the admin key (`admin123` by default).
3. In the **Player Queue**, click **Start** on the next player.
4. In the **Teams** panel, tap a team to place a bid. Each tap raises by the tournament `bidIncrement` (25 L default). Team caps are enforced automatically.
5. Click **Mark SOLD** to award the player to the highest bidder, or **Mark UNSOLD** to skip.

Every other browser watching `/auction`, `/teams` or `/players` sees the update instantly.

## Making it accessible over the internet

**Quick share (a few hours):**

```bash
npx ngrok http 3000       # gives you a https://xxxx.ngrok-free.app URL
```

**Permanent, on your own domain — pick one:**

Because the app uses Socket.IO with a long‑lived Node server, use a platform that keeps the Node
process alive. **Vercel serverless will NOT work for the live bidding** (polling fallback would still
work, but you'd lose the real-time experience). All the options below keep the process running.

### Option A — Fly.io (recommended, ~$0–5/mo, includes persistent SQLite)

Zero database migration; SQLite lives on a persistent 1 GB volume that survives deploys.

```bash
# One-time setup
iwr https://fly.io/install.ps1 -useb | iex          # install flyctl on Windows PowerShell
flyctl auth signup                                   # or `flyctl auth login`
flyctl launch --no-deploy --copy-config --name cpl-auction    # uses fly.toml already in the repo
flyctl volumes create cpl_data --size 1 --region sin # change region to your closest
flyctl secrets set ADMIN_PASSWORD="pick-a-strong-password"
flyctl deploy
```

Fly gives you a `https://cpl-auction.fly.dev` URL. To use your own domain:

```bash
flyctl certs create auction.yourdomain.com
flyctl certs show auction.yourdomain.com   # shows the DNS records to add at your registrar
```

Add the CNAME/A records shown, wait 1–2 minutes — HTTPS is auto‑issued by Let's Encrypt.

### Option B — Render.com (free tier available, sleeps after 15 min idle)

Push this repo to GitHub, then in the Render dashboard:

1. **New → Blueprint** → point at your repo. `render.yaml` in this repo pre‑configures the service, disk and env vars.
2. Or manually: **New → Web Service → Docker** → connect the repo, add a **1 GB disk** at `/data`, set env vars (`NODE_ENV=production`, `DATABASE_URL=file:/data/prod.db`, `ADMIN_PASSWORD=…`).
3. **Custom domain**: Settings → Custom Domain → enter yours → add the CNAME Render shows at your registrar.

Free tier note: after 15 minutes with no traffic, the service sleeps and takes ~30 seconds to wake on the next visit. Fine for demos; upgrade to Starter (~$7/mo) for auction night.

### Option C — Railway (~$5/mo, git‑based deploys, one‑click Postgres)

If you'd rather move to hosted Postgres:

1. Push to GitHub → sign in at [railway.com](https://railway.com) → **New Project → Deploy from GitHub**.
2. Add a Postgres plugin: **+ New → Database → PostgreSQL** — Railway injects `DATABASE_URL`.
3. In `prisma/schema.prisma`, change `provider = "sqlite"` → `provider = "postgresql"`.
4. Set env vars: `ADMIN_PASSWORD` (strong!), `NODE_ENV=production`. `PORT` is auto‑set.
5. Set Build: `npm run build`, Start: `npm start`.
6. Open the Railway shell (or add as a one‑off): `npx prisma db push && npx tsx prisma/seed.ts` to create tables and seed players.
7. **Custom domain**: Settings → Domains → Custom Domain → point the CNAME at Railway.

### Option D — VPS (DigitalOcean, Hetzner, Linode — ~$4–6/mo, full control)

On a fresh Ubuntu 22.04 droplet:

```bash
# 1. Install Node 22, git, nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx

# 2. Clone + build
git clone https://github.com/<you>/<repo>.git /opt/cpl-auction
cd /opt/cpl-auction
npm install
npx prisma db push && npx tsx prisma/seed.ts
npm run build

# 3. Run under PM2 as a service
sudo npm i -g pm2
ADMIN_PASSWORD="strong" pm2 start "npm start" --name cpl-auction
pm2 startup && pm2 save   # survives reboots

# 4. Reverse proxy + free HTTPS
sudo tee /etc/nginx/sites-available/cpl-auction <<'NGINX'
server {
  listen 80;
  server_name auction.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX
sudo ln -s /etc/nginx/sites-available/cpl-auction /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. HTTPS via Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d auction.yourdomain.com
```

Point an `A` record `auction.yourdomain.com` → droplet's public IP at your registrar first.

### Domain registrars

Any of these are fine. Buy the domain once, point it at whichever host you pick above.

- **Cloudflare Registrar** — cheapest, no markup on renewal, free WHOIS privacy.
- **Porkbun** — very cheap, clean UI.
- **Namecheap** — free WHOIS privacy, common choice.
- **GoDaddy** — most well‑known, usually the most expensive.

Typical cost: `.com` ≈ $10/yr, `.in` ≈ ₹700/yr, `.xyz` ≈ $2/yr for the first year.

### Firewall / production checklist

- [ ] Change `ADMIN_PASSWORD` to something strong. Never expose the default `admin123` publicly.
- [ ] Set `NODE_ENV=production` so React ships the minified bundle.
- [ ] Point `DATABASE_URL` at either a persistent volume (SQLite) or a managed DB (Postgres).
- [ ] Make sure your host allows **WebSocket** traffic (all four options above do).
- [ ] If using a CDN like Cloudflare in front, enable **WebSocket support** for the domain.

## Data model

```
Tournament (single row)  — name, tagline, squad size, bid increment
Team                     — name, owner, logo, budget, reserve balance
Player                   — number, name, skill, stats, base price, status, teamId, soldPrice
Bid                      — history of every bid placed
AuctionState (single row)— currentPlayerId, currentBid, currentTeamId, isRunning
```

`Team.maxBid` and `Team.balance` are derived at query time from purchased players.

## Project layout

```
prisma/
  schema.prisma           # DB schema
  seed.ts                 # 4 teams + 52 players
server.ts                 # Next.js + Socket.IO server
src/
  app/
    layout.tsx            # Root layout (top nav, tournament header)
    page.tsx              # Welcome
    auction/page.tsx      # Live auction
    teams/page.tsx
    players/page.tsx
    admin/page.tsx
    api/
      auction/state/route.ts
      players/route.ts
      teams/route.ts
      admin/start/route.ts
      admin/bid/route.ts
      admin/sold/route.ts
      admin/unsold/route.ts
      admin/reset/route.ts
  components/             # UI (nav, brand logo, auction view, admin panel, etc.)
  lib/
    db.ts                 # Prisma client
    bus.ts                # Socket.IO broadcast helper
    auction-service.ts    # Derived team stats + live snapshot
    format.ts             # INR / Cr / Lakh formatting
    admin-guard.ts        # Password check for admin routes
```

## Customising your tournament

- Change the tournament name, tagline, squad size or bid increment: edit `prisma/seed.ts` and re-run `npm run db:seed`, or update the `Tournament` row via `npm run db:studio`.
- Replace the sample players/teams: edit `prisma/seed.ts` (or add your own admin CRUD screens later).
- Swap logos / photos: point `logoUrl` / `photoUrl` to any public URL. To host local images, put them in `public/` and reference `/your-file.png`.

## Scripts

| Script            | Purpose                                        |
|-------------------|------------------------------------------------|
| `npm run dev`     | Dev server with hot reload + Socket.IO         |
| `npm run build`   | Prisma generate + Next production build        |
| `npm start`       | Run the production server                      |
| `npm run db:push` | Sync schema to the database                    |
| `npm run db:seed` | Seed teams + players                           |
| `npm run db:studio` | Open Prisma Studio to browse / edit the DB   |

Enjoy the auction!
