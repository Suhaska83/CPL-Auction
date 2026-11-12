# CPL Kids Auction (static site)

Sibling app to `web-static`, built for GitHub Pages at:

**https://suhaska83.github.io/CPL-Auction/Kids/**

## Local dev

```bash
cd web-static-kids
cp .env.example .env.local   # set Firebase + VITE_BASE
npm ci
npm run dev
```

For local dev with the correct subpath, set `VITE_BASE=/CPL-Auction/Kids/` in `.env.local` before `npm run dev`.

## Data / Firebase

By default CI uses the same Firebase secrets as the main site. For an isolated Kids league, create a separate Firebase project and add its config to GitHub Actions secrets (or use a dedicated `.env.local` for manual builds).
