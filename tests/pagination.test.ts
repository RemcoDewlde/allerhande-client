/**
 * ============================================================
 * TEST SUITE: AllerhandeClient.searchAll()
 * Suite ID:   TS-PAGER
 * File:       tests/pagination.test.ts
 * ============================================================
 *
 * Requirements traced by this suite:
 *
 *   REQ-PAGER-001  searchAll() shall yield every RecipeSummary from every
 *                  page until the last page is exhausted.
 *
 *   REQ-PAGER-002  searchAll() shall stop yielding after a page where
 *                  page.hasNextPage is false.
 *
 *   REQ-PAGER-003  searchAll() shall increment the start offset by the
 *                  number of results received on the previous page.
 *
 *   REQ-PAGER-004  searchAll() shall forward all provided options (size,
 *                  sortBy, filters, ingredients) to each underlying
 *                  searchRecipes call, overriding start internally.
 *
 *   REQ-PAGER-005  searchAll() shall stop immediately and yield nothing
 *                  when the first page returns an empty result array.
 *
 * Coverage target: all decisions in AllerhandeClient.searchAll()
 *
 *   D8  !result.page.hasNextPage  (loop exit condition)
 *         D8=T  → TC-PAGER-001 (last page), TC-PAGER-002 (single page)
 *         D8=F  → TC-PAGER-001 (first pages), TC-PAGER-003 (multiple pages)
 *
 *   D9  result.result.length === 0  (empty guard)
 *         D9=T  → TC-PAGER-005
 *         D9=F  → TC-PAGER-001 through TC-PAGER-004
 * ============================================================
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { AllerhandeClient } from "../src/client.js";
import type { RecipeSummary } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tokenResponse() {
  return { access_token: "tok", refresh_token: "ref", expires_in: 3600 };
}

function makeSummary(id: number): RecipeSummary {
  return {
    id,
    title: `Recipe ${id}`,
    slug: `recipe-${id}`,
    publishedAt: "2026-01-01T00:00Z",
    images: [],
    tags: [],
    nutrition: null,
    author: null,
  };
}

function pageResponse(
  summaries: RecipeSummary[],
  hasNextPage: boolean,
  total: number,
) {
  return {
    data: {
      recipeSearchV2: {
        page: { total, hasNextPage },
        result: summaries,
      },
    },
  };
}

/**
 * Builds a mock fetch that serves:
 *   - call 0: auth token
 *   - calls 1..N: successive GraphQL page responses
 */
function buildMockFetch(...pages: ReturnType<typeof pageResponse>[]) {
  const mockFetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: vi.fn().mockResolvedValue(tokenResponse()),
  });
  for (const page of pages) {
    mockFetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(page) });
  }
  return mockFetch;
}

function getVariables(mockFetch: ReturnType<typeof vi.fn>, callIndex: number) {
  const [, init] = mockFetch.mock.calls[callIndex] as [string, RequestInit];
  return (JSON.parse(init.body as string) as { variables: Record<string, unknown> }).variables;
}

async function collectAll(gen: AsyncGenerator<RecipeSummary>): Promise<RecipeSummary[]> {
  const items: RecipeSummary[] = [];
  for await (const item of gen) items.push(item);
  return items;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("TS-PAGER: AllerhandeClient.searchAll()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------

  /**
   * TC-PAGER-001
   * Objective:      Verify that searchAll yields all recipes across exactly
   *                 two pages and stops after the second.
   * Requirement:    REQ-PAGER-001, REQ-PAGER-002
   * MC/DC coverage: D8=F (page 1), D8=T (page 2), D9=F both pages
   *
   * Precondition:   Server returns 2 results on page 1 (hasNextPage=true)
   *                 and 1 result on page 2 (hasNextPage=false).
   * Input:          searchAll("pasta").
   * Expected:       3 summaries yielded in order; fetch called 3 times
   *                 (auth + 2 GraphQL).
   * Pass Criteria:  items.length===3; ids=[1,2,3]; fetchCallCount===3.
   */
  it("TC-PAGER-001: yields all recipes across two pages and stops at the last page", async () => {
    const mockFetch = buildMockFetch(
      pageResponse([makeSummary(1), makeSummary(2)], true,  3),
      pageResponse([makeSummary(3)],                false, 3),
    );
    const client = new AllerhandeClient({ fetch: mockFetch });

    const items = await collectAll(client.searchAll("pasta"));

    expect(items.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 auth + 2 GraphQL
  });

  // -------------------------------------------------------------------------

  /**
   * TC-PAGER-002
   * Objective:      Verify that searchAll stops after the first page when
   *                 page.hasNextPage is false (single-page result).
   * Requirement:    REQ-PAGER-002
   * MC/DC coverage: D8=T (first page already last), D9=F
   *
   * Precondition:   Server returns 2 results on a single page (hasNextPage=false).
   * Input:          searchAll("soep").
   * Expected:       2 summaries yielded; only 1 GraphQL request made.
   * Pass Criteria:  items.length===2; fetchCallCount===2 (auth + 1 GraphQL).
   */
  it("TC-PAGER-002: stops after the first page when hasNextPage is false", async () => {
    const mockFetch = buildMockFetch(
      pageResponse([makeSummary(10), makeSummary(11)], false, 2),
    );
    const client = new AllerhandeClient({ fetch: mockFetch });

    const items = await collectAll(client.searchAll("soep"));

    expect(items.map((r) => r.id)).toEqual([10, 11]);
    expect(mockFetch).toHaveBeenCalledTimes(2); // 1 auth + 1 GraphQL
  });

  // -------------------------------------------------------------------------

  /**
   * TC-PAGER-003
   * Objective:      Verify that the start offset is incremented by the count
   *                 of results received on the previous page.
   * Requirement:    REQ-PAGER-003
   *
   * Precondition:   Page 1 returns 3 results; page 2 returns 2 results.
   * Input:          searchAll("pasta").
   * Expected:       GraphQL call 1 has start=0; call 2 has start=3;
   *                 call 3 has start=5.
   * Pass Criteria:  start variables match expected offsets exactly.
   */
  it("TC-PAGER-003: increments start offset by the previous page result count", async () => {
    const mockFetch = buildMockFetch(
      pageResponse([makeSummary(1), makeSummary(2), makeSummary(3)], true,  6),
      pageResponse([makeSummary(4), makeSummary(5)],                 true,  6),
      pageResponse([makeSummary(6)],                                 false, 6),
    );
    const client = new AllerhandeClient({ fetch: mockFetch });

    await collectAll(client.searchAll("pasta"));

    expect(getVariables(mockFetch, 1).start).toBe(0);
    expect(getVariables(mockFetch, 2).start).toBe(3);
    expect(getVariables(mockFetch, 3).start).toBe(5);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-PAGER-004
   * Objective:      Verify that options (size, sortBy, filters) are forwarded
   *                 to every underlying searchRecipes call and that start is
   *                 managed internally.
   * Requirement:    REQ-PAGER-004
   *
   * Precondition:   Two-page result.
   * Input:          searchAll("pasta", { size: 10, sortBy: "NEWEST",
   *                   filters: [{ group: "menugang", values: ["hoofdgerecht"] }] }).
   * Expected:       Both GraphQL calls carry size, sortBy, and filters;
   *                 start is 0 on the first call and 2 on the second.
   * Pass Criteria:  Variable assertions pass for both calls.
   */
  it("TC-PAGER-004: forwards size, sortBy, and filters to every page request", async () => {
    const mockFetch = buildMockFetch(
      pageResponse([makeSummary(1), makeSummary(2)], true,  4),
      pageResponse([makeSummary(3), makeSummary(4)], false, 4),
    );
    const client = new AllerhandeClient({ fetch: mockFetch });

    await collectAll(client.searchAll("pasta", {
      size: 10,
      sortBy: "NEWEST",
      filters: [{ group: "menugang", values: ["hoofdgerecht"] }],
    }));

    for (const callIndex of [1, 2]) {
      const vars = getVariables(mockFetch, callIndex);
      expect(vars.size).toBe(10);
      expect(vars.sortBy).toBe("NEWEST");
      expect(vars.filters).toEqual([{ group: "menugang", values: ["hoofdgerecht"] }]);
    }
    expect(getVariables(mockFetch, 1).start).toBe(0);
    expect(getVariables(mockFetch, 2).start).toBe(2);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-PAGER-005
   * Objective:      Verify that searchAll yields nothing and issues only one
   *                 GraphQL request when the first page returns an empty
   *                 result array regardless of hasNextPage.
   * Requirement:    REQ-PAGER-005
   * MC/DC coverage: D9=T (empty result guard)
   *
   * Precondition:   Server returns result=[] with hasNextPage=true (pathological
   *                 but possible edge case; the empty guard prevents infinite loop).
   * Input:          searchAll("xyzzy").
   * Expected:       No items yielded; fetch called exactly twice (auth + 1 GraphQL).
   * Pass Criteria:  items.length===0; fetchCallCount===2.
   */
  it("TC-PAGER-005: stops and yields nothing when the first page is empty (infinite-loop guard)", async () => {
    const mockFetch = buildMockFetch(
      pageResponse([], true, 0),
    );
    const client = new AllerhandeClient({ fetch: mockFetch });

    const items = await collectAll(client.searchAll("xyzzy"));

    expect(items).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2); // auth + 1 GraphQL only
  });

  // -------------------------------------------------------------------------

  /**
   * TC-PAGER-006
   * Objective:      Verify correct traversal across three pages, confirming
   *                 that both the hasNextPage check and the start increment
   *                 remain correct through multiple iterations.
   * Requirement:    REQ-PAGER-001, REQ-PAGER-003
   *
   * Precondition:   Server returns 2 + 2 + 1 results across three pages.
   * Input:          searchAll("pasta").
   * Expected:       5 summaries in order; start offsets 0, 2, 4.
   * Pass Criteria:  ids=[1,2,3,4,5]; fetchCallCount===4 (auth + 3 GraphQL).
   */
  it("TC-PAGER-006: correctly traverses three pages with accurate start offsets", async () => {
    const mockFetch = buildMockFetch(
      pageResponse([makeSummary(1), makeSummary(2)], true,  5),
      pageResponse([makeSummary(3), makeSummary(4)], true,  5),
      pageResponse([makeSummary(5)],                 false, 5),
    );
    const client = new AllerhandeClient({ fetch: mockFetch });

    const items = await collectAll(client.searchAll("pasta"));

    expect(items.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(getVariables(mockFetch, 1).start).toBe(0);
    expect(getVariables(mockFetch, 2).start).toBe(2);
    expect(getVariables(mockFetch, 3).start).toBe(4);
  });
});
