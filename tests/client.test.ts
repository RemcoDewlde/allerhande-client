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
 *   REQ-CLIENT-006  The system shall throw an Error containing the HTTP status
 *                   text when the response status is not in the 2xx range.
 *
 *   REQ-CLIENT-007  The system shall throw an Error containing all GraphQL
 *                   error messages joined by "; " when the response body
 *                   contains an errors array.
 *
 *   REQ-CLIENT-008  The system shall throw an Error when the response body
 *                   contains no data field.
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
 * ============================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AllerhandeClient } from "../src/client.js";
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

/**
 * Returns a mock fetch that:
 *   call 1 → anonymous token (for auth)
 *   call 2 → GraphQL response with the provided data
 */
function mockFetchSequence(gqlData: unknown) {
  return vi.fn()
    .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
    .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(gqlData) });
}

function getGraphqlCall(mockFetch: ReturnType<typeof vi.fn>) {
  // index 1 is the GraphQL call (index 0 is the auth call)
  return mockFetch.mock.calls[1] as [string, RequestInit];
}

function parseGraphqlBody(mockFetch: ReturnType<typeof vi.fn>) {
  const [, init] = getGraphqlCall(mockFetch);
  return JSON.parse(init.body as string) as { query: string; variables: Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("TS-CLIENT: AllerhandeClient", () => {
  let client: AllerhandeClient;

  beforeEach(() => {
    client = new AllerhandeClient();
  });

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
   * MC/DC coverage: D4=T, D5=F, D6=F
   *
   * Precondition:   Fresh client instance.
   * Input:          searchRecipes("pasta") with no options.
   * Expected:       POST to GRAPHQL_URL; Authorization: Bearer <token>;
   *                 variables.searchText === "pasta".
   * Pass Criteria:  URL, header, and variable assertions pass.
   */
  it("TC-CLIENT-001: POSTs to the GraphQL endpoint with Bearer token and searchText variable", async () => {
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

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
    vi.stubGlobal("fetch", mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT })));

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
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

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
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

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
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

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
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

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
    vi.stubGlobal("fetch", mockFetchSequence(graphqlResponse({ recipeSearchV2: empty })));

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
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

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
    const mockFetch = mockFetchSequence(graphqlResponse({ recipe: MOCK_RECIPE }));
    vi.stubGlobal("fetch", mockFetch);

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
    vi.stubGlobal("fetch", mockFetchSequence(graphqlResponse({ recipe: recipeNoTips })));

    const recipe = await client.getRecipe(1);

    expect(recipe.tips).toHaveLength(0);
  });

  // =========================================================================
  // Error handling — REQ-CLIENT-006, REQ-CLIENT-007, REQ-CLIENT-008
  // =========================================================================

  /**
   * TC-CLIENT-011
   * Objective:      Verify an Error is thrown when the GraphQL HTTP response
   *                 status is not OK (robustness — server error).
   * Requirement:    REQ-CLIENT-006
   * MC/DC coverage: D4=F
   *
   * Precondition:   Auth succeeds; GraphQL endpoint returns HTTP 500.
   * Input:          searchRecipes("pasta") when GraphQL returns 500.
   * Expected:       Promise rejects with an Error whose message contains "500".
   * Pass Criteria:  Error thrown; message includes the status code.
   */
  it("TC-CLIENT-011: throws when the GraphQL endpoint returns HTTP 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: "Internal Server Error" }),
    );

    await expect(client.searchRecipes("pasta")).rejects.toThrow("500");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-012
   * Objective:      Verify an Error is thrown when the GraphQL endpoint
   *                 returns HTTP 401 (robustness — authorization failure).
   * Requirement:    REQ-CLIENT-006
   * MC/DC coverage: D4=F (distinct status code from TC-CLIENT-011)
   *
   * Precondition:   Auth succeeds; GraphQL endpoint returns HTTP 401.
   * Input:          getRecipe(1) when GraphQL returns 401.
   * Expected:       Promise rejects with Error; message contains "401".
   * Pass Criteria:  Error thrown; message includes the status code.
   */
  it("TC-CLIENT-012: throws when the GraphQL endpoint returns HTTP 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
        .mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" }),
    );

    await expect(client.getRecipe(1)).rejects.toThrow("401");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-013
   * Objective:      Verify an Error containing all GraphQL error messages is
   *                 thrown when the response body includes an errors array with
   *                 a single error.
   * Requirement:    REQ-CLIENT-007
   * MC/DC coverage: D4=T, D5=T
   *
   * Precondition:   HTTP 200 response with errors array (one entry).
   * Input:          searchRecipes("pasta").
   * Expected:       Error thrown; message equals the single error message.
   * Pass Criteria:  Error.message === "Field not found".
   */
  it("TC-CLIENT-013: throws with the GraphQL error message when errors array has one entry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ errors: [{ message: "Field not found" }] }),
        }),
    );

    await expect(client.searchRecipes("pasta")).rejects.toThrow("Field not found");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-014
   * Objective:      Verify that multiple GraphQL errors are joined by "; " in
   *                 the thrown Error message.
   * Requirement:    REQ-CLIENT-007
   * MC/DC coverage: D4=T, D5=T (multiple errors)
   *
   * Precondition:   HTTP 200 response with errors array containing two entries.
   * Input:          searchRecipes("pasta").
   * Expected:       Error message is "Error A; Error B".
   * Pass Criteria:  Error.message === "Error A; Error B".
   */
  it("TC-CLIENT-014: joins multiple GraphQL errors with \"; \" in the thrown message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            errors: [{ message: "Error A" }, { message: "Error B" }],
          }),
        }),
    );

    await expect(client.searchRecipes("pasta")).rejects.toThrow("Error A; Error B");
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-015
   * Objective:      Verify an Error is thrown when the response body contains
   *                 no data field and no errors field (unexpected shape).
   * Requirement:    REQ-CLIENT-008
   * MC/DC coverage: D4=T, D5=F, D6=T
   *
   * Precondition:   HTTP 200 response body is {} (empty object).
   * Input:          getRecipe(1).
   * Expected:       Promise rejects with an Error.
   * Pass Criteria:  Error thrown (message not prescribed beyond being an Error).
   */
  it("TC-CLIENT-015: throws when the response body contains neither data nor errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
        .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({}) }),
    );

    await expect(client.getRecipe(1)).rejects.toThrow();
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
   * Precondition:   Auth token is "test-bearer-token".
   * Input:          searchRecipes("pasta").
   * Expected:       Authorization header is "Bearer test-bearer-token".
   * Pass Criteria:  Header value matches expected string exactly.
   */
  it("TC-CLIENT-016: sends Authorization header in the format \"Bearer <token>\"", async () => {
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

    await client.searchRecipes("pasta");

    const [, init] = getGraphqlCall(mockFetch);
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${MOCK_TOKEN}`);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-CLIENT-017
   * Objective:      Verify Content-Type header is set to application/json on
   *                 GraphQL requests.
   * Requirement:    REQ-CLIENT-001
   *
   * Pass Criteria:  Content-Type header === "application/json".
   */
  it("TC-CLIENT-017: sends Content-Type: application/json on GraphQL requests", async () => {
    const mockFetch = mockFetchSequence(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT }));
    vi.stubGlobal("fetch", mockFetch);

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
   * Pass Criteria:  fetch.callCount === 3.
   */
  it("TC-CLIENT-018: reuses the cached auth token across multiple API calls", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(tokenResponse()) })
      .mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(graphqlResponse({ recipeSearchV2: MOCK_SEARCH_RESULT })) });
    vi.stubGlobal("fetch", mockFetch);

    await client.searchRecipes("pasta");
    await client.searchRecipes("soep");

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const [firstUrl] = mockFetch.mock.calls[0];
    expect(firstUrl).toBe(ANON_TOKEN_URL);
  });
});
