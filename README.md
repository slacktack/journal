# My Little Diary

A cute scrapbook diary with Hello Kitty & Cinnamoroll stickers. One Vercel deploy serves the site and its API.

**Diary codes:** type a code (6+ characters) to open a diary. The same code on any phone or laptop opens the same diary, kept in sync. A new code starts a new diary. Only a hash of the code is stored.

## Run locally

```bash
echo "PORT=4321" > .env
npm run dev        # http://localhost:4321
npm test
```

Locally, data is saved to `.data/db.json`.

## Deploy to Vercel

1. `vercel` (or import this repo in the Vercel dashboard).
2. Storage → add **Upstash Redis** and connect it to the project, then redeploy.

No other env vars are needed.

## Sticker packs

Built-in packs live in `stickers/<pack>/` and are listed in `stickers/packs.json`. Anything else can be added in the app's sticker maker.
