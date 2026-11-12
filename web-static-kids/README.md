# CPL Kids Auction (static site)

Sibling app to `web-static`, built for GitHub Pages at:

**https://suhaska83.github.io/CPL-Auction/Kids/**

Uses a **separate Firebase project** from the main CPL site. Full setup: **[FIREBASE-SETUP.md](./FIREBASE-SETUP.md)**.

## Local dev

```bash
cd web-static-kids
cp .env.example .env.local   # Kids Firebase config + VITE_BASE
npm ci
npm run dev
```

Set `VITE_BASE=/CPL-Auction/Kids/` in `.env.local` so routes match GitHub Pages.

## GitHub Actions

Production Kids builds read **`VITE_FIREBASE_*_KIDS`** repository secrets (not the main CPL secrets). See the secret table in `FIREBASE-SETUP.md`.
