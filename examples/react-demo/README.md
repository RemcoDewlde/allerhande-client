# React demo

A Vite + React + TypeScript demo for `allerhande-client`.

## Setup

From the **repository root**, build the package first:

```sh
npm run build
```

Then install and start the demo:

```sh
cd examples/react-demo
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## How it works

The browser can't call `api.ah.nl` directly (no CORS headers), so the demo uses Vite's dev proxy: all requests to `/api/ah/*` are forwarded to `https://api.ah.nl/*`. The `AllerhandeClient` is created with a custom `fetch` that rewrites URLs to go through this proxy:

```ts
const proxyFetch: typeof fetch = (input, init) => {
  const url = String(input instanceof Request ? input.url : input)
    .replace("https://api.ah.nl", "/api/ah");
  return fetch(url, init);
};

const client = new AllerhandeClient({ fetch: proxyFetch });
```

This is exactly what the injectable `fetch` option is designed for.
