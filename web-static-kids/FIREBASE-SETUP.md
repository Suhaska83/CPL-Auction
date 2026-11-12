# Kids Firebase — separate from main CPL

The Kids site uses its **own** Firebase project so teams, players, and auction state never mix with the adult CPL app.

Suggested project id: **`cpl-auction-kids`** (any name is fine; keep ids aligned in `.firebaserc` and GitHub secrets).

## 1. Create the Firebase project (~5 min)

Mirror the main CPL steps in [`web-static/README.md`](../web-static/README.md):

1. [Firebase console](https://console.firebase.google.com) → **Add project** → name e.g. **CPL Auction Kids** → project id **`cpl-auction-kids`**.
2. **Build → Realtime Database → Create Database** → same region as main CPL if possible → **locked mode**.
3. **Authentication → Sign-in method → Google → Enable** (support email required).
4. **Storage → Get started** → same region → publish rules from `storage.rules` in this folder.
5. **Project settings → General → Your apps → Web (`</>`)** → register → copy the `firebaseConfig` object.

## 2. Rules and storage

**Realtime Database rules:** Console → **Realtime Database → Rules** → paste `database.rules.json` from this folder → **Publish**.

Or CLI (from this folder):

```bash
npx firebase-tools@13.35.1 login
npx firebase-tools@13.35.1 use cpl-auction-kids
npx firebase-tools@13.35.1 deploy --only database,storage
```

CI can deploy rules when you add a service account (step 4).

## 3. Authorized domains (required for live site)

**Authentication → Settings → Authorized domains** — add:

- `localhost`
- `suhaska83.github.io` (GitHub Pages)

Add your custom domain too if you use one for the Kids path.

## 4. Local `.env.local`

```bash
cd web-static-kids
cp .env.example .env.local
```

Paste the **Kids** project config (not the main `cpl-auction` values).

## 5. GitHub Actions secrets (Kids build)

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Example |
|--------|---------|
| `VITE_FIREBASE_API_KEY_KIDS` | from Kids web app config |
| `VITE_FIREBASE_AUTH_DOMAIN_KIDS` | `cpl-auction-kids.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL_KIDS` | `https://cpl-auction-kids-default-rtdb.<region>.firebasedatabase.app` |
| `VITE_FIREBASE_PROJECT_ID_KIDS` | `cpl-auction-kids` |
| `VITE_FIREBASE_STORAGE_BUCKET_KIDS` | `cpl-auction-kids.appspot.com` or `cpl-auction-kids.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID_KIDS` | number from config |
| `VITE_FIREBASE_APP_ID_KIDS` | `1:…:web:…` |

### Optional: auto-deploy RTDB rules on push

1. Firebase console → **Project settings → Service accounts → Generate new private key** (Kids project).
2. Add repo secret **`FIREBASE_SERVICE_ACCOUNT_KIDS`** = entire JSON file contents.

Pushes that change `web-static-kids/database.rules.json` trigger the rules workflow for Kids.

## 6. Bootstrap admin + seed

1. Open [Kids site](https://suhaska83.github.io/CPL-Auction/Kids/) → **Admin** → **Sign in with Google**.
2. **Claim admin** (first user when `/admins` is empty).
3. **Seed if empty** for sample teams/players (optional).

Main CPL and Kids now use **separate** databases.
