# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deploy

There are **two separate deploy targets** — they do not ship together:

- **Frontend (this Vite app)** → deploys automatically on **Vercel** when a change
  lands on `main`. Nothing to run by hand.
- **Backend (PartyKit, `src/party/server.js`)** → **manual** deploy. It is *not*
  covered by Vercel, so any change under `src/party/**` (auth, `/update-profile`,
  garden sync, etc.) only goes live after you deploy it yourself.

Deploy the backend from an **up-to-date `main`** — `partykit deploy` bundles
whatever is on your disk, so deploying a stale checkout silently ships old code:

```bash
cd verserain-web
git checkout main && git pull origin main   # deploy the merged code, not a stale copy
npm run deploy:party                         # = partykit deploy (run `npx partykit login` once first)
```

Sanity checks: `grep isOAuthAccount src/party/server.js` should print a few lines
(confirms your checkout has the latest server), and `npm run test:party` should be
green before you deploy.
