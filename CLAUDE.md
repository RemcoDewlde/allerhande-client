# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # compile to dist/ (CJS + ESM + .d.ts)
npm run dev            # watch mode
npm run typecheck      # tsc --noEmit only, no emit
npm test               # vitest run (unit tests, mocked)
npm run test:watch     # vitest watch
npm run test:coverage  # vitest run --coverage (100% thresholds enforced)
npm run test:e2e       # vitest run --config vitest.e2e.config.ts (real API, slow)
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

### Releases

Releases are fully automated via `semantic-release` (`.releaserc.json`), triggered on every push to `main` by `.github/workflows/release.yml`. The workflow skips any commit whose message contains `[skip ci]` (used by semantic-release's own version-bump commit to prevent loops).

Version bumps are driven by **conventional commit** prefixes:

| Prefix | Release type |
|---|---|
| `fix:` | patch (0.0.x) |
| `feat:` | minor (0.x.0) |
| `feat!:` or `BREAKING CHANGE:` footer | major (x.0.0) |
| `chore:`, `docs:`, `test:`, `refactor:` | no release |

One-time setup required in the GitHub repo:
- **Settings → Secrets → Actions → New repository secret**: `NPM_TOKEN` — create at npmjs.com → Access Tokens → Granular (read+write for this package).
- **Settings → Pages → Source**: GitHub Actions (activates the docs deployment).

### E2E smoke tests

`tests/e2e/smoke.test.ts` hits the real AH API (no mocks). Uses a separate config (`vitest.e2e.config.ts`) with a 30 s timeout and sequential execution to avoid hammering the API. Run with `npm run test:e2e`. CI runs these daily via `.github/workflows/e2e.yml`. If E2E fails while unit tests pass → AH changed something upstream.

Known fixture: recipe ID `1202199` (pasta carbonara). Update the `FIXTURE_ID` / `FIXTURE_SLUG` constants in the test file if AH removes it.

### GitHub Pages

Static docs page lives in `docs/index.html`. Deployed by `.github/workflows/pages.yml` on every push to `main`. Enable GitHub Pages → Source: GitHub Actions in the repo settings to activate.

### Probing the schema

Because introspection is disabled, the only way to verify field names is to send a query and check whether the error says `"Cannot query field"` vs success. Use targeted single-field queries rather than broad selections to avoid cascading validation errors masking which fields are actually valid.
