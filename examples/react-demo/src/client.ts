import { AllerhandeClient } from "allerhande-client";

// Rewrite absolute AH API URLs to the Vite dev-proxy path so the browser
// doesn't hit a CORS wall. Vite strips /api/ah and forwards to api.ah.nl.
const proxyFetch: typeof fetch = (input, init) => {
  const url = (input instanceof Request ? input.url : String(input)).replace(
    "https://api.ah.nl",
    "/api/ah"
  );
  return fetch(url, init);
};

export const client = new AllerhandeClient({ fetch: proxyFetch });
