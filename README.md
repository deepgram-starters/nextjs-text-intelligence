# Next.js Text Intelligence

A Next.js implementation of `node-text-intelligence`. It preserves the session, metadata, and text-intelligence API contracts, with the UI implemented in Next.js instead of the Vite HTML submodule.

```sh
git submodule update --init --recursive
corepack pnpm install
cp sample.env .env
# Set DEEPGRAM_API_KEY in .env
corepack pnpm dev
```
