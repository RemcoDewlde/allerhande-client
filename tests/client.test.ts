/**
 * ============================================================
 * TEST SUITE: AllerhandeClient
 * Suite ID:   TS-CLIENT
 * File:       tests/client.test.ts
 * ============================================================
 *
 * Requirements traced by this suite:
 *
 *   REQ-CLIENT-001  The system shall POST all GraphQL requests to
 *                   https://api.ah.nl/graphql with a Bearer authorization
 *                   header containing a valid access token.
 *
 *   REQ-CLIENT-002  searchRecipes() shall include searchText and all provided
 *                   options as GraphQL variables in the request body.
 *
 *   REQ-CLIENT-003  searchRecipes() shall return the recipeSearchV2 field of
 *                   the GraphQL response as a typed RecipeSearchResult.
 *
 *   REQ-CLIENT-004  getRecipe() shall include the numeric id as a GraphQL
 *                   variable in the request body.
 *
 *   REQ-CLIENT-005  getRecipe() shall return the recipe field of the GraphQL
 *                   response as a typed Recipe.
 *
 *   REQ-CLIENT-006  The system shall throw an AllerhandeApiError containing
 *                   the HTTP statusCode when the response status is not 2xx.
 *
 *   REQ-CLIENT-007  The system shall throw an AllerhandeGraphQLError with a
 *                   messages array when the response body contains errors.
 *
 *   REQ-CLIENT-008  The system shall throw an AllerhandeGraphQLError when the
 *                   response body contains no data field.
 *
 *   REQ-CLIENT-009  The system shall use an injected fetch function in place
 *                   of globalThis.fetch when one is provided at construction.
 *
 * Coverage target: statement + decision coverage for AllerhandeClient.graphql()
 *
 *   D4  response.ok
 *         D4=T  → TC-CLIENT-001 through TC-CLIENT-010
 *         D4=F  → TC-CLIENT-011, TC-CLIENT-012
 *
 *   D5  json.errors?.length  (truthy)
 *         D5=T  → TC-CLIENT-013, TC-CLIENT-014
 *         D5=F  → TC-CLIENT-001 through TC-CLIENT-010
 *
 *   D6  !json.data
 *         D6=T  → TC-CLIENT-015
 *         D6=F  → TC-CLIENT-001 through TC-CLIENT-010
 *
 *   D7  options.fetch provided  (in AllerhandeClient constructor)
 *         D7=T  → TC-CLIENT-019 through TC-CLIENT-021
 *         D7=F  → TC-CLIENT-001 through TC-CLIENT-018 (use globalThis.fetch)
 * ============================================================
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { AllerhandeClient } from "../src/client.js";
import {
  AllerhandeApiError,
  AllerhandeGraphQLError,
} from "../src/errors.js";
import type { Recipe, RecipeSearchResult } from "../src/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GRAPHQL_URL = "https://api.ah.nl/graphql";
const ANON_TOKEN_URL = "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous";
const MOCK_TOKEN = "test-bearer-token";

const MOCK_SUMMARY = {
  id: 1,
  title: "Test Recipe",
  slug: "test-recipe",
  publishedAt: "2026-01-01T00:00Z",
  images: [{ url: "https://example.com/img.jpg", width: 220, height: 162, rendition: "D220X162" }],
  tags: [{ key: "menugang", value: "hoofdgerecht" }],
  nutrition: {
    energy:        { value: 400, unit: "kcal" },
    fat:           { value: 20,  unit: "g"    },
    saturatedFat:  { value: 8,   unit: "g"    },
    carbohydrates: { value: 40,  unit: "g"    },
    protein:       { value: 15,  unit: "g"    },
    sodium:        { value: 600, unit: "mg"   },
  },
  author: null,
};

const MOCK_SEARCH_RESULT: RecipeSearchResult = {
  page: { total: 42, hasNextPage: true },
  result: [MOCK_SUMMARY],
};

const MOCK_RECIPE: Recipe = {
  id: 1,
  title: "Test Recipe",
  description: "A test description.",
  cookTime: 30,
  publishedAt: "2026-01-01T00:00Z",
  images: [{ url: "https://example.com/img.jpg", width: 220, height: 162, rendition: "D220X162" }],
  tags: [{ key: "menugang", value: "hoofdgerecht" }],
  ingredients: [{ id: 100, quantity: 200 }],
  preparation: {
    steps: ["Step 1.", "Step 2."],
    summary: ["Do step 1 then step 2."],
  },
  tips: [{ type: "algemeen", value: "Use fresh ingredients." }],
  author: null,
};

function tokenResponse() {
  return { access_token: MOCK_TOKEN, refresh_token: "r", expires_in: 3600 };
}

function graphqlResponse<T>(data: T) {
  return { data };
}

/** Builds a mock fetch: call 1 → auth token, call 2 → GraphQL payload. */
function makeMockFetch(gqlData: unknown): ReturnType<typeof vi.fn> {
  return vi.fn()
    .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
    .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(gqlData) });
}

function makeClient(mockFetch: ReturnType<typeof vi.fn>): AllerhandeClient {
  return new AllerhandeClient({ fetch: mockFetch });
}

function getGraphqlCall(mockFetch: ReturnType<typeof vi.fn>) {
  return mockFetch.mock.calls[1] as [string, RequestInit];
}

function parseGraphqlBody(mockFetch: ReturnType<typeof vi.fn>) {
  const [, init] = getGraphqlCall(mockFetch);
  return JSON.parse(init.body as string) as {
    query: string;
    variables: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("TS-CLIENT: AllerhandeClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // searchRecipes — normal range
  // =========================================================================

  /**
   * TC-CLIENT-001
   * Objective:      Verify GraphQL endpoint, Authorization header, and query
   *                 variable for a minimal search call.
   * Requirement:    REQ-CLIENT-001, REQ-CLIENT-002
   * MC/DC coverage: D4=T, D5=F, D6=F, D7=T
   *
   * Precondition:   Fresh client with injected mock fetch.
   * Input:          searchRecipes("pasta") with no options.
   * Expected:       POST to GRAPHQL_URL; Authorization: Bearer <token>;
   *                 variables.searchText === "pasta".
   * Pass Criteria:  URL, header, and variable assertions pass.
   */
  it("TC-CLIENT-001: POSTs to the GraphQL endpoint with Bearer token and searchText variable", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("pasta");

    const [url, init] = getGraphqlCall(mockFetch);
    expect(url).toBe(GRAPHQL_URL);
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${MOCK_TOKEN}`,
    );
    const body = parseGraphqlBody(mockFetch);
    expect(body.variables.searchText).toBe("pasta");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-002
   * Objective:      Verify that the RecipeSearchResult is returned correctly,
   *                 including page info and result array.
   * Requirement:    REQ-CLIENT-003
   *
   * Precondition:   Server returns a well-formed recipeSearchV2 payload.
   * Input:          searchRecipes("pasta").
   * Expected:       Returned object has correct page.total, page.hasNextPage,
   *                 and a result array with the expected recipe summary.
   * Pass Criteria:  All field assertions match MOCK_SEARCH_RESULT.
   */
  it("TC-CLIENT-002: returns the typed RecipeSearchResult from the GraphQL response", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    const result = await client.searchRecipes("pasta");

    expect(result.page.total).toBe(42);
    expect(result.page.hasNextPage).toBe(true);
    expect(result.result).toHaveLength(1);
    expect(result.result[0].id).toBe(1);
    expect(result.result[0].title).toBe("Test Recipe");
    expect(result.result[0].slug).toBe("test-recipe");
    expect(result.result[0].tags[0]).toEqual({ key: "menugang", value: "hoofdgerecht" });
    expect(result.result[0].nutrition?.energy).toEqual({ value: 400, unit: "kcal" });
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-003
   * Objective:      Verify that all optional search parameters are forwarded
   *                 as GraphQL variables.
   * Requirement:    REQ-CLIENT-002
   *
   * Precondition:   Fresh client.
   * Input:          searchRecipes with size, start, sortBy, filters, and
   *                 ingredients all supplied.
   * Expected:       Request body variables contain every provided option.
   * Pass Criteria:  Each variable key and value matches the supplied option.
   */
  it("TC-CLIENT-003: passes all optional parameters as GraphQL variables", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("soep", {
      size: 20,
      start: 40,
      sortBy: "NEWEST",
      filters: [{ group: "menugang", values: ["voorgerecht"] }],
      ingredients: ["tomaat"],
    });

    const { variables } = parseGraphqlBody(mockFetch);
    expect(variables.size).toBe(20);
    expect(variables.start).toBe(40);
    expect(variables.sortBy).toBe("NEWEST");
    expect(variables.filters).toEqual([{ group: "menugang", values: ["voorgerecht"] }]);
    expect(variables.ingredients).toEqual(["tomaat"]);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-004
   * Objective:      Verify boundary — minimum allowed page size (5) is
   *                 forwarded without modification.
   * Requirement:    REQ-CLIENT-002 (boundary — lower bound of PageSize)
   *
   * Input:          size: 5
   * Pass Criteria:  variables.size === 5.
   */
  it("TC-CLIENT-004: forwards size=5 (lower boundary) as a GraphQL variable", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("cake", { size: 5 });

    const { variables } = parseGraphqlBody(mockFetch);
    expect(variables.size).toBe(5);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-005
   * Objective:      Verify boundary — maximum allowed page size (100) is
   *                 forwarded without modification.
   * Requirement:    REQ-CLIENT-002 (boundary — upper bound of PageSize)
   *
   * Input:          size: 100
   * Pass Criteria:  variables.size === 100.
   */
  it("TC-CLIENT-005: forwards size=100 (upper boundary) as a GraphQL variable", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("cake", { size: 100 });

    const { variables } = parseGraphqlBody(mockFetch);
    expect(variables.size).toBe(100);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-006
   * Objective:      Verify start=0 (first page) is forwarded correctly.
   * Requirement:    REQ-CLIENT-002 (boundary — lower bound of start offset)
   *
   * Input:          start: 0
   * Pass Criteria:  variables.start === 0.
   */
  it("TC-CLIENT-006: forwards start=0 (zero offset) as a GraphQL variable", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("cake", { start: 0 });

    const { variables } = parseGraphqlBody(mockFetch);
    expect(variables.start).toBe(0);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-007
   * Objective:      Verify correct handling of an empty result set
   *                 (zero recipes found).
   * Requirement:    REQ-CLIENT-003 (boundary — empty result array)
   *
   * Precondition:   Server returns total=0, hasNextPage=false, result=[].
   * Input:          searchRecipes("xyzzy_no_match").
   * Expected:       RecipeSearchResult with page.total=0 and empty result array.
   * Pass Criteria:  page.total === 0; result.length === 0.
   */
  it("TC-CLIENT-007: returns an empty result set when no recipes match the query", async () => {
    const empty: RecipeSearchResult = { page: { total: 0, hasNextPage: false }, result: [] };
    const client = makeClient(makeMockFetch(graphqlResponse({ recipeSearchV2: empty })));

    const result = await client.searchRecipes("xyzzy_no_match");

    expect(result.page.total).toBe(0);
    expect(result.page.hasNextPage).toBe(false);
    expect(result.result).toHaveLength(0);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-008
   * Objective:      Verify sortBy POPULAR is forwarded as a GraphQL variable.
   * Requirement:    REQ-CLIENT-002
   *
   * Input:          sortBy: "POPULAR"
   * Pass Criteria:  variables.sortBy === "POPULAR".
   */
  it("TC-CLIENT-008: forwards sortBy=POPULAR as a GraphQL variable", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("taart", { sortBy: "POPULAR" });

    const { variables } = parseGraphqlBody(mockFetch);
    expect(variables.sortBy).toBe("POPULAR");
  });

  // =========================================================================
  // getRecipe — normal range
  // =========================================================================

  /**
   * TC-CLIENT-009
   * Objective:      Verify that getRecipe sends the numeric id as a GraphQL
   *                 variable and returns the typed Recipe.
   * Requirement:    REQ-CLIENT-004, REQ-CLIENT-005
   * MC/DC coverage: D4=T, D5=F, D6=F
   *
   * Precondition:   Fresh client.
   * Input:          getRecipe(1).
   * Expected:       variables.id === 1; returned object matches MOCK_RECIPE.
   * Pass Criteria:  Variable and all recipe field assertions pass.
   */
  it("TC-CLIENT-009: sends the recipe id as a variable and returns the typed Recipe", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipe: MOCK_RECIPE }));
    const client = makeClient(mockFetch);

    const recipe = await client.getRecipe(1);

    const { variables } = parseGraphqlBody(mockFetch);
    expect(variables.id).toBe(1);
    expect(recipe.id).toBe(1);
    expect(recipe.title).toBe("Test Recipe");
    expect(recipe.description).toBe("A test description.");
    expect(recipe.cookTime).toBe(30);
    expect(recipe.ingredients).toEqual([{ id: 100, quantity: 200 }]);
    expect(recipe.preparation.steps).toEqual(["Step 1.", "Step 2."]);
    expect(recipe.preparation.summary).toEqual(["Do step 1 then step 2."]);
    expect(recipe.tips).toEqual([{ type: "algemeen", value: "Use fresh ingredients." }]);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-010
   * Objective:      Verify that a recipe with an empty tips array is returned
   *                 without error (boundary — zero tips).
   * Requirement:    REQ-CLIENT-005 (boundary — empty tips array)
   *
   * Input:          getRecipe() where server returns tips: [].
   * Expected:       recipe.tips is an empty array; no error thrown.
   * Pass Criteria:  tips.length === 0.
   */
  it("TC-CLIENT-010: returns a recipe with an empty tips array without error", async () => {
    const recipeNoTips: Recipe = { ...MOCK_RECIPE, tips: [] };
    const client = makeClient(makeMockFetch(graphqlResponse({ recipe: recipeNoTips })));

    const recipe = await client.getRecipe(1);

    expect(recipe.tips).toHaveLength(0);
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  /**
   * TC-CLIENT-011
   * Objective:      Verify an AllerhandeApiError with statusCode 500 is thrown
   *                 when the GraphQL endpoint returns HTTP 500.
   * Requirement:    REQ-CLIENT-006
   * MC/DC coverage: D4=F
   *
   * Precondition:   Auth succeeds; GraphQL endpoint returns HTTP 500.
   * Input:          searchRecipes("pasta").
   * Expected:       AllerhandeApiError with statusCode=500 thrown.
   * Pass Criteria:  instanceof AllerhandeApiError; statusCode===500.
   */
  it("TC-CLIENT-011: throws AllerhandeApiError with statusCode 500 on HTTP 500", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Internal Server Error" });

    const err = await makeClient(mockFetch).searchRecipes("pasta").catch((e) => e);
    expect(err).toBeInstanceOf(AllerhandeApiError);
    expect((err as AllerhandeApiError).statusCode).toBe(500);
    expect((err as AllerhandeApiError).name).toBe("AllerhandeApiError");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-012
   * Objective:      Verify an AllerhandeApiError with statusCode 401 is thrown
   *                 when the GraphQL endpoint returns HTTP 401.
   * Requirement:    REQ-CLIENT-006
   * MC/DC coverage: D4=F (distinct status code from TC-CLIENT-011)
   *
   * Precondition:   Auth succeeds; GraphQL endpoint returns HTTP 401.
   * Input:          getRecipe(1).
   * Expected:       AllerhandeApiError with statusCode=401 thrown.
   * Pass Criteria:  instanceof AllerhandeApiError; statusCode===401.
   */
  it("TC-CLIENT-012: throws AllerhandeApiError with statusCode 401 on HTTP 401", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" });

    await expect(makeClient(mockFetch).getRecipe(1)).rejects.toMatchObject({
      name: "AllerhandeApiError",
      statusCode: 401,
    });
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-013
   * Objective:      Verify an AllerhandeGraphQLError is thrown with a single
   *                 error message when the response errors array has one entry.
   * Requirement:    REQ-CLIENT-007
   * MC/DC coverage: D4=T, D5=T
   *
   * Precondition:   HTTP 200 response with errors: [{message: "Field not found"}].
   * Input:          searchRecipes("pasta").
   * Expected:       AllerhandeGraphQLError thrown; messages=["Field not found"].
   * Pass Criteria:  instanceof AllerhandeGraphQLError; messages array matches.
   */
  it("TC-CLIENT-013: throws AllerhandeGraphQLError with single message from errors array", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ errors: [{ message: "Field not found" }] }),
      });

    const err = await makeClient(mockFetch).searchRecipes("pasta").catch((e) => e);
    expect(err).toBeInstanceOf(AllerhandeGraphQLError);
    expect((err as AllerhandeGraphQLError).messages).toEqual(["Field not found"]);
    expect((err as AllerhandeGraphQLError).name).toBe("AllerhandeGraphQLError");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-014
   * Objective:      Verify that multiple GraphQL error messages are collected
   *                 into the messages array and joined with "; " in the message.
   * Requirement:    REQ-CLIENT-007
   * MC/DC coverage: D4=T, D5=T (multiple errors)
   *
   * Precondition:   HTTP 200 response with two entries in errors array.
   * Input:          searchRecipes("pasta").
   * Expected:       AllerhandeGraphQLError; messages=["Error A","Error B"];
   *                 error.message === "Error A; Error B".
   * Pass Criteria:  messages array has both entries; message string matches.
   */
  it("TC-CLIENT-014: collects multiple GraphQL errors into the messages array", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          errors: [{ message: "Error A" }, { message: "Error B" }],
        }),
      });

    await expect(makeClient(mockFetch).searchRecipes("pasta")).rejects.toMatchObject({
      name: "AllerhandeGraphQLError",
      messages: ["Error A", "Error B"],
      message: "Error A; Error B",
    });
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-015
   * Objective:      Verify an AllerhandeGraphQLError is thrown when the
   *                 response body contains no data field and no errors field.
   * Requirement:    REQ-CLIENT-008
   * MC/DC coverage: D4=T, D5=F, D6=T
   *
   * Precondition:   HTTP 200 response body is {} (empty object).
   * Input:          getRecipe(1).
   * Expected:       AllerhandeGraphQLError thrown.
   * Pass Criteria:  instanceof AllerhandeGraphQLError.
   */
  it("TC-CLIENT-015: throws AllerhandeGraphQLError when the response has neither data nor errors", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) });

    await expect(makeClient(mockFetch).getRecipe(1)).rejects.toBeInstanceOf(
      AllerhandeGraphQLError,
    );
  });

  // =========================================================================
  // Authorization header
  // =========================================================================

  /**
   * TC-CLIENT-016
   * Objective:      Verify the exact format of the Authorization header sent
   *                 with GraphQL requests.
   * Requirement:    REQ-CLIENT-001
   *
   * Pass Criteria:  Authorization header === "Bearer test-bearer-token".
   */
  it("TC-CLIENT-016: sends Authorization header in the format \"Bearer <token>\"", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("pasta");

    const [, init] = getGraphqlCall(mockFetch);
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${MOCK_TOKEN}`);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-017
   * Objective:      Verify Content-Type header is set to application/json.
   * Requirement:    REQ-CLIENT-001
   *
   * Pass Criteria:  Content-Type header === "application/json".
   */
  it("TC-CLIENT-017: sends Content-Type: application/json on GraphQL requests", async () => {
    const mockFetch = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const client = makeClient(mockFetch);

    await client.searchRecipes("pasta");

    const [, init] = getGraphqlCall(mockFetch);
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-018
   * Objective:      Verify that a second searchRecipes call reuses the cached
   *                 auth token (two GraphQL calls, one auth call total).
   * Requirement:    REQ-CLIENT-001 (integration with REQ-AUTH-002)
   *
   * Precondition:   Fresh client; token valid for > 60 s.
   * Input:          Two sequential searchRecipes calls.
   * Expected:       fetch called exactly 3 times: 1 auth + 2 GraphQL.
   * Pass Criteria:  mockFetch.callCount === 3.
   */
  it("TC-CLIENT-018: reuses the cached auth token across multiple API calls", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT })),
      });
    const client = new AllerhandeClient({ fetch: mockFetch });

    await client.searchRecipes("pasta");
    await client.searchRecipes("soep");

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const [firstUrl] = mockFetch.mock.calls[0];
    expect(firstUrl).toBe(ANON_TOKEN_URL);
  });

  // =========================================================================
  // Injectable fetch — REQ-CLIENT-009
  // =========================================================================

  /**
   * TC-CLIENT-019
   * Objective:      Verify that the injected fetch function is used for all
   *                 network requests (auth and GraphQL) instead of
   *                 globalThis.fetch.
   * Requirement:    REQ-CLIENT-009
   * MC/DC coverage: D7=T
   *
   * Precondition:   globalThis.fetch is NOT stubbed; a custom fetch is
   *                 injected via the constructor.
   * Input:          AllerhandeClient({ fetch: customFetch }); searchRecipes().
   * Expected:       customFetch is called; globalThis.fetch is never called.
   * Pass Criteria:  customFetch.callCount === 2 (auth + GraphQL).
   */
  it("TC-CLIENT-019: uses the injected fetch for all requests, not globalThis.fetch", async () => {
    const customFetch = makeMockFetch(
      graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }),
    );
    const globalSpy = vi.spyOn(globalThis, "fetch");

    const client = new AllerhandeClient({ fetch: customFetch });
    await client.searchRecipes("pasta");

    expect(customFetch).toHaveBeenCalledTimes(2);
    expect(globalSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-020
   * Objective:      Verify that the injected fetch is passed through to the
   *                 auth layer so the same function handles token acquisition.
   * Requirement:    REQ-CLIENT-009
   *
   * Precondition:   Custom fetch injected.
   * Input:          getRecipe(); first call triggers auth.
   * Expected:       First call to customFetch targets the anonymous token URL.
   * Pass Criteria:  customFetch.mock.calls[0][0] === ANON_TOKEN_URL.
   */
  it("TC-CLIENT-020: injected fetch is also used for authentication requests", async () => {
    const customFetch = makeMockFetch(graphqlResponse({ recipe: MOCK_RECIPE }));
    const client = new AllerhandeClient({ fetch: customFetch });

    await client.getRecipe(1);

    const [firstUrl] = customFetch.mock.calls[0];
    expect(firstUrl).toBe(ANON_TOKEN_URL);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-021
   * Objective:      Verify that a client created without the fetch option falls
   *                 back to globalThis.fetch at call time.
   * Requirement:    REQ-CLIENT-009
   * MC/DC coverage: D7=F (no injected fetch → globalThis.fetch used)
   *
   * Precondition:   globalThis.fetch is stubbed; no fetch option provided.
   * Input:          new AllerhandeClient() (no options); searchRecipes().
   * Expected:       globalThis.fetch stub is called for auth and GraphQL.
   * Pass Criteria:  globalFetch called twice; result is returned correctly.
   */
  it("TC-CLIENT-021: falls back to globalThis.fetch when no fetch option is provided", async () => {
    const globalFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(
          graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }),
        ),
      });
    vi.stubGlobal("fetch", globalFetch);

    const client = new AllerhandeClient(); // no fetch option
    const result = await client.searchRecipes("pasta");

    expect(globalFetch).toHaveBeenCalledTimes(2);
    expect(result.page.total).toBe(42);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-022
   * Objective:      Verify that two different client instances with different
   *                 injected fetch functions remain fully isolated.
   * Requirement:    REQ-CLIENT-009 (robustness — multiple instances)
   *
   * Precondition:   Two clients with independent mock fetch functions.
   * Input:          Each client calls searchRecipes once.
   * Expected:       Each fetch mock is called exactly twice (auth + GraphQL);
   *                 the other mock is never called.
   * Pass Criteria:  fetchA.callCount === 2; fetchB.callCount === 2; no cross-calls.
   */
  it("TC-CLIENT-022: two client instances with different fetch functions are isolated", async () => {
    const fetchA = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const fetchB = makeMockFetch(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    const clientA = new AllerhandeClient({ fetch: fetchA });
    const clientB = new AllerhandeClient({ fetch: fetchB });

    await clientA.searchRecipes("pasta");
    await clientB.searchRecipes("soep");

    expect(fetchA).toHaveBeenCalledTimes(2);
    expect(fetchB).toHaveBeenCalledTimes(2);
  });
});
