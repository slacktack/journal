# My Little Diary

A cute, password-locked scrapbook diary with Hello Kitty & Cinnamoroll stickers. One Vercel deploy serves the site and its API, so your phone and laptop share the same diary.

## Run locally

```bash
echo "JOURNAL_PASSWORD=pick-a-password" > .env
echo "PORT=4321" >> .env
npm run dev        # http://localhost:4321
npm test
```

Locally, data is saved to `.data/db.json`.

## Deploy to Vercel

1. `vercel` (or import this repo in the Vercel dashboard).
2. Storage → add **Upstash Redis** and connect it to the project.
3. Settings → Environment Variables → `JOURNAL_PASSWORD`, then redeploy.

Open the site on any device with the same password to see the same diary.

## Sticker packs

Built-in packs live in `stickers/<pack>/` and are listed in `stickers/packs.json`. Anything else can be added in the app's sticker maker.
