# CPLAuction — Static (GitHub Pages + Firebase)

A **pure client-side** version of the CPL Auction site. All auction state lives in
**Firebase Realtime Database**; the UI is a static React + Vite bundle hosted on
**GitHub Pages** under your custom domain. Zero server, $0/month within the free tiers.

## Setup — one time (~5 min)

### 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** → name e.g. `cpl-auction` → disable Analytics (not needed).
2. **Build → Realtime Database → Create Database** → pick a region (choose the one closest to you) → start in **locked mode** (we'll set rules from this repo).
3. **Build → Authentication → Get started → Sign-in method → Google → Enable** (add a support email).
4. **Build → Storage → Get started** → choose the same region → start in production mode. Then **Rules** tab → paste the contents of `storage.rules` → **Publish**. (Required for uploading team logos and player photos through the app.)
5. **Project settings → General → Your apps → Add app → Web (`</>`)** → nickname it → **Register**. Copy the config object shown.

### 2. Wire up your local dev

```bash
cd web-static
cp .env.example .env.local
# paste values from Firebase console into .env.local
npm install
npm run dev            # http://localhost:5173
```

### 3. Push security rules

Two options:

**Option A — copy/paste (fastest):**
Open Firebase console → **Realtime Database → Rules** → paste the contents of `database.rules.json` from this folder → **Publish**.

**Option B — Firebase CLI:**
```bash
npm i -g firebase-tools
firebase login
firebase use --add       # pick your project
firebase deploy --only database
```

### 4. Claim admin (one time)

1. Open the app → **Admin** tab → **Sign in with Google**.
2. You'll be told "Not authorised" — but because `/admins` is empty, a **Claim admin** button appears. Click it.
3. Refresh — you're now admin. All future writes require your Google account.

### 5. Seed the database

Still on the Admin page, click **Seed if empty** — it loads 4 teams and 52 sample players.

You're ready to auction.

## Deploying to GitHub Pages

### One-time repo setup

1. Push this repo to GitHub.
2. On GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. On GitHub → **Settings → Secrets and variables → Actions**, add **Repository secrets**:

   | Secret | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | from Firebase console |
   | `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `cpl-auction.firebaseapp.com` |
   | `VITE_FIREBASE_DATABASE_URL` | e.g. `https://cpl-auction-default-rtdb.asia-southeast1.firebasedatabase.app` |
   | `VITE_FIREBASE_PROJECT_ID` | `cpl-auction` |
   | `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `cpl-auction.appspot.com` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | number |
   | `VITE_FIREBASE_APP_ID` | `1:…:web:…` |

4. **Custom domain**: edit `web-static/public/CNAME` and replace `auction.example.com` with your domain, then commit and push. GitHub also has a **Settings → Pages → Custom domain** field — enter the same value there once.
5. Push to `main`. The `Deploy web-static to GitHub Pages` workflow runs automatically and publishes to your Pages URL.

> **Firebase Auth allow-list**: In Firebase console → **Authentication → Settings → Authorized domains**, add your custom domain and the `*.github.io` domain, otherwise Google sign-in will fail on the live site.

### DNS records at your registrar

For a subdomain like `auction.yourdomain.com`, add a single `CNAME`:

```
Type   Name       Target
CNAME  auction    <your-github-username>.github.io.
```

For an apex domain (`yourdomain.com`), add 4 `A` records pointing at GitHub Pages IPs:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

GitHub provisions a Let's Encrypt cert automatically within a few minutes.

## Data model

Same as the Node version, but stored as JSON in Firebase RTDB:

```
/tournament
  { name, tagline, squadSize, bidIncrement }

/teams/<teamId>
  { name, owner, shortCode, logoUrl, colorHex, totalBudget, reserveBalance, createdAt }

/players/<playerId>
  { number, name, skill, age, photoUrl, matches, runs, wickets, points, basePrice,
    status: AVAILABLE|ON_AUCTION|SOLD|UNSOLD, teamId, soldPrice }

/state
  { currentPlayerId, currentBid, currentTeamId, isRunning }

/bids/<playerId>/<pushId>
  { teamId, amount, at }

/admins/<uid> = true   ← controls write access
```

Every browser watching the site subscribes with `onValue()` to `/state`, `/players`,
`/teams`, so the UI updates within ~150–250 ms of any admin action.

## Security model

`database.rules.json`:
- `.read: true` → anyone can view (spectators).
- `.write:` requires an authenticated user whose UID exists in `/admins`.
- Bootstrap: if `/admins` is empty, any authenticated user can create the first admin (needed on Day 1 only).

## Local dev workflow

```bash
npm run dev            # Vite dev server
npm run build          # type-check + production bundle
npm run preview        # serve dist/ locally to test the prod build
```

## Free-tier limits (Firebase Spark plan)

Way more than you need for a private cricket auction:

- **100** simultaneous connections
- **1 GB** stored data
- **10 GB/month** bandwidth
- Unlimited Auth users on Google sign-in

A 4-team, 52-player, 200-viewer auction uses <1% of any of these.
