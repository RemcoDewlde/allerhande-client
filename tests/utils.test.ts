/**
 * ============================================================
 * TEST SUITE: getRecipeUrl
 * Suite ID:   TS-UTILS
 * File:       tests/utils.test.ts
 * ============================================================
 *
 * Requirements traced by this suite:
 *
 *   REQ-UTILS-001  getRecipeUrl() shall return a URL of the form
 *                  https://www.ah.nl/allerhande/recept/R-R{id}/{slug}.
 *
 * Coverage target: statement coverage for getRecipeUrl() (single expression)
 * ============================================================
 */

import { describe, it, expect } from "vitest";
import { getRecipeUrl } from "../src/utils.js";

describe("TS-UTILS: getRecipeUrl()", () => {

  /**
   * TC-UTILS-001
   * Objective:      Verify the canonical URL structure is produced for a
   *                 typical recipe id and slug.
   * Requirement:    REQ-UTILS-001
   *
   * Precondition:   None.
   * Input:          id=1202199, slug="pasta-carbonara-van-roberta-pagnier"
   * Expected:       "https://www.ah.nl/allerhande/recept/R-R1202199/pasta-carbonara-van-roberta-pagnier"
   * Pass Criteria:  Returned string matches expected URL exactly.
   */
  it("TC-UTILS-001: returns the canonical Allerhande recipe URL", () => {
    expect(getRecipeUrl(1202199, "pasta-carbonara-van-roberta-pagnier")).toBe(
      "https://www.ah.nl/allerhande/recept/R-R1202199/pasta-carbonara-van-roberta-pagnier",
    );
  });

  // -------------------------------------------------------------------------

  /**
   * TC-UTILS-002
   * Objective:      Verify correct URL construction with the minimum valid
   *                 recipe id (boundary — smallest positive integer: 1).
   * Requirement:    REQ-UTILS-001 (boundary — lower bound of id)
   *
   * Input:          id=1, slug="test"
   * Expected:       URL contains "R-R1/" segment.
   * Pass Criteria:  URL === "https://www.ah.nl/allerhande/recept/R-R1/test".
   */
  it("TC-UTILS-002: handles id=1 (lower boundary)", () => {
    expect(getRecipeUrl(1, "test")).toBe(
      "https://www.ah.nl/allerhande/recept/R-R1/test",
    );
  });

  // -------------------------------------------------------------------------

  /**
   * TC-UTILS-003
   * Objective:      Verify that slugs containing multiple hyphens are
   *                 preserved verbatim without encoding or modification.
   * Requirement:    REQ-UTILS-001 (slug passthrough)
   *
   * Input:          id=42, slug="aardappel-gratin-met-kaas-en-spek"
   * Expected:       Slug appears unchanged in the returned URL.
   * Pass Criteria:  Returned URL ends with the exact slug string.
   */
  it("TC-UTILS-003: preserves multi-hyphen slugs verbatim", () => {
    const slug = "aardappel-gratin-met-kaas-en-spek";
    const url = getRecipeUrl(42, slug);
    expect(url).toBe(`https://www.ah.nl/allerhande/recept/R-R42/${slug}`);
    expect(url.endsWith(slug)).toBe(true);
  });

  // -------------------------------------------------------------------------

  /**
   * TC-UTILS-004
   * Objective:      Verify correct URL construction with a large recipe id
   *                 (boundary — large integer, no numeric overflow).
   * Requirement:    REQ-UTILS-001 (boundary — large id)
   *
   * Input:          id=9999999, slug="large-id-recipe"
   * Expected:       URL contains "R-R9999999/" segment.
   * Pass Criteria:  Returned URL === expected string.
   */
  it("TC-UTILS-004: handles a large recipe id (upper boundary)", () => {
    expect(getRecipeUrl(9_999_999, "large-id-recipe")).toBe(
      "https://www.ah.nl/allerhande/recept/R-R9999999/large-id-recipe",
    );
  });
});
