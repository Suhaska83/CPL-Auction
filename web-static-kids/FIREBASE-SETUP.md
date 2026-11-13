# Kids Firebase — separate from main CPL

The Kids site uses its **own** Firebase project so teams, players, and auction state never mix with the adult CPL app.

Suggested project id: **`cpl-auction-kids`** (your console id can differ — use **your** values everywhere below).

---

## Step 1 — Project created ✅

You already did: Firebase console → **Add project** → Kids project.

---

## Step 2 — Realtime Database (where all auction data lives)

1. Open your **Kids** project in [Firebase console](https://console.firebase.google.com).
2. Left sidebar: **Build** → **Realtime Database**.
3. If you see **Create Database**:
   - Click **Create Database**.
   - **Location**: pick the same region as main CPL if you can (e.g. `asia-southeast1`). You cannot change region later.
   - **Security rules**: choose **Start in locked mode** → **Enable**.
4. After the database exists, open the **Rules** tab (next to **Data**).
5. Replace **everything** in the editor with the contents of this file in the repo:  
   `web-static-kids/database.rules.json`
6. Click **Publish**.

**What this does:** Anyone can **read** (spectators watch the auction). Only **signed-in admins** can **write**. The first Google user can **claim admin** when `/admins` is empty.

**Copy your Database URL** (you need it for GitHub secrets):

- **Realtime Database** → **Data** tab → at the top you see a URL like:  
  `https://YOUR-PROJECT-ID-default-rtdb.asia-southeast1.firebasedatabase.app`  
- That full `https://…` string = `VITE_FIREBASE_DATABASE_URL_KIDS`.

---

## Step 3 — Authentication (Google sign-in for Admin)

1. Left sidebar: **Build** → **Authentication**.
2. Click **Get started** (first time only).
3. Open the **Sign-in method** tab.
4. Click **Google** in the list → toggle **Enable** → choose a **Project support email** → **Save**.

### Authorized domains (required for live Kids site)

1. Still in **Authentication**, open the **Settings** tab (gear / “Settings” next to Sign-in method).
2. Scroll to **Authorized domains**.
3. Ensure these exist (use **Add domain** if missing):
   - `localhost` (usually there by default)
   - `suhaska83.github.io`

Without `suhaska83.github.io`, **Sign in with Google** fails on  
https://suhaska83.github.io/CPL-Auction/Kids/

---

## Step 4 — Images (no Firebase Storage)

Logos, branding, and player photos are **compressed in the browser** and saved in **Realtime Database** (free Spark plan). **Do not enable Firebase Storage** unless you want paid cloud file hosting.

You must be signed in as admin (Step 3) before uploads save successfully.

---

## Step 5 — Web app config (values for `.env.local` + GitHub)

1. Click the **gear** next to “Project Overview” → **Project settings**.
2. Scroll to **Your apps**.
3. If there is no web app yet: click the **Web** icon `</>` → App nickname e.g. `cpl-kids-web` → **Register app** (Firebase Hosting optional — skip if asked).
4. You see a `firebaseConfig` block like:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "....firebaseapp.com",
  databaseURL: "https://....firebasedatabase.app",
  projectId: "...",
  storageBucket: "....appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:..."
};
```

5. Map each field to a **GitHub repository secret** (Settings → Secrets and variables → Actions):

| Firebase config field | GitHub secret name |
|----------------------|-------------------|
| `apiKey` | `VITE_FIREBASE_API_KEY_KIDS` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN_KIDS` |
| `databaseURL` | `VITE_FIREBASE_DATABASE_URL_KIDS` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID_KIDS` |
| `storageBucket` | optional — `VITE_FIREBASE_STORAGE_BUCKET_KIDS` (not used for uploads) |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID_KIDS` |
| `appId` | `VITE_FIREBASE_APP_ID_KIDS` |

**Important:** All seven must come from the **Kids** project, not `cpl-auction` (main CPL).

### Local development (optional)

```bash
cd web-static-kids
cp .env.example .env.local
```

Paste the same seven values into `.env.local` with the `VITE_FIREBASE_*` names from `.env.example` (no `_KIDS` suffix in the file — only in GitHub secret names).

---

## Step 6 — Redeploy the Kids website

After all seven `*_KIDS` secrets are saved on GitHub:

1. Repo **Actions** → **Deploy web-static to GitHub Pages** → **Run workflow**  
   **or** push any tiny commit to `main`.
2. Wait until the workflow is green.
3. Open https://suhaska83.github.io/CPL-Auction/Kids/ and hard-refresh (Ctrl+F5).

If the yellow “Firebase not configured” banner is gone, secrets reached the build.

---

## Step 7 — First-time Admin on Kids data

1. Go to **Admin** on the Kids site.
2. **Sign in with Google** (use the Google account you want as auction manager).
3. If you see “not authorised”, click **Claim admin** (only works when the database has no admins yet).
4. Optional: **Seed if empty** to load sample teams/players into the **Kids** database only.

---

## Quick checklist

| Step | Done? |
|------|-------|
| Realtime Database created + rules published (`database.rules.json`) | ☐ |
| Google sign-in enabled | ☐ |
| `suhaska83.github.io` in Authorized domains | ☐ |
| (Skip) Firebase Storage — not used | — |
| Web app registered; 7 GitHub `*_KIDS` secrets added | ☐ |
| Pages workflow succeeded | ☐ |
| Admin claim + seed (optional) | ☐ |

---

## Optional — deploy rules from GitHub

Only if you want pushes to auto-update RTDB rules:

1. Kids project → **Project settings** → **Service accounts** → **Generate new private key**.
2. GitHub secret **`FIREBASE_SERVICE_ACCOUNT_KIDS`** = full JSON file contents.
3. Pushes that change `web-static-kids/database.rules.json` run **Deploy Kids Firebase RTDB rules**.

You can skip this and always paste rules in the console (Step 2).

---

## CLI alternative (deploy RTDB rules)

```bash
cd web-static-kids
npx firebase-tools@13.35.1 login
npx firebase-tools@13.35.1 use YOUR-KIDS-PROJECT-ID
npx firebase-tools@13.35.1 deploy --only database
```
