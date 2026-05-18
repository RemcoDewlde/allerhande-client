# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # compile to dist/ (CJS + ESM + .d.ts)
npm run dev            # watch mode
npm run typecheck      # tsc --noEmit only, no emit
npm test               # vitest run
npm run test:watch     # vitest watch
npm run test:coverage  # vitest run --coverage (100% thresholds enforced)
```

## Architecture

This is an unofficial, typed API client for [Albert Heijn Allerhande](https://www.ah.nl/allerhande) recipes. The upstream API is undocumented and introspection-disabled.

### Request flow

```
AllerhandeClient  →  AuthManager  →  POST /mobile-auth/v1/auth/token/anonymous
        │                             (clientId: "appie-android")
        └─────────────────────────→  POST /graphql  (Bearer token)
```

`AuthManager` holds the token in memory, auto-refreshes on expiry (60 s buffer before `expires_in`), and falls back to a fresh anonymous token if refresh fails.

### Schema constraints

The GraphQL schema at `api.ah.nl/graphql` has **two distinct recipe types** that do NOT share fields:

| Field | `RecipeSummary` (search) | `Recipe` (by ID) |
|---|---|---|
| `slug` | ✓ | ✗ |
| `nutrition` | ✓ | ✗ |
| `description` | ✗ | ✓ |
| `cookTime` | ✗ | ✓ |
| `ingredients` | ✗ | ✓ |
| `preparation` | ✗ | ✓ |
| `tips` | ✗ | ✓ |

Both share: `id`, `title`, `publishedAt`, `images`, `tags`, `author`.

### PageSize

The `size` parameter in `recipeSearchV2` accepts plain integers (5, 10, 12, 20, 24, 25, 50, 100) — not a GraphQL enum despite being typed `PageSize`.

### Error types

Three typed error classes are exported:

| Class | Thrown when |
|---|---|
| `AllerhandeAuthError` | Token endpoint returns non-2xx; carries `statusCode` |
| `AllerhandeApiError` | GraphQL endpoint returns non-2xx; carries `statusCode` |
| `AllerhandeGraphQLError` | Response body has `errors[]` or no `data`; carries `messages[]` |

### Injectable fetch

`new AllerhandeClient({ fetch: customFetch })` injects the same fetch into both the auth layer and the GraphQL layer. Omitting the option falls back to `globalThis.fetch` at call time (not at construction time), so `vi.stubGlobal` still works in tests.

### Pagination

`client.searchAll(query, options)` is an async generator that manages `start` internally, incrementing by `result.result.length` after each page. It stops when `hasNextPage` is false or a page returns an empty array.

### Probing the schema

Because introspection is disabled, the only way to verify field names is to send a query and check whether the error says `"Cannot query field"` vs success. Use targeted single-field queries rather than broad selections to avoid cascading validation errors masking which fields are actually valid.
