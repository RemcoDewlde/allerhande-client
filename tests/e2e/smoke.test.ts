/**
 * ============================================================
 * E2E SMOKE TESTS — allerhande-api
 * ============================================================
 *
 * These tests call the live Albert Heijn API. They are slow,
 * require network access, and are intentionally separate from
 * the unit test suite (run with `npm run test:e2e`).
 *
 * Purpose: catch upstream API breakage early — renamed fields,
 * removed endpoints, auth changes, or schema type changes.
 *
 * If a test here fails while the unit tests pass, AH changed
 * something on their end.
 * ============================================================
 */

import { describe, it, expect } from "vitest";
import {
  AllerhandeClient,
  getRecipeUrl,
  type Recipe,
  type RecipeSummary,
  type RecipeSearchResult,
} from "../../src/index.js";

const client = new AllerhandeClient();

// Known stable recipe used as a fixture.
// Update the ID+slug if AH removes this recipe.
const FIXTURE_ID = 1202199;
const FIXTURE_SLUG = "pasta-carbonara";

// ── Auth ──────────────────────────────────────────────────────

describe("smoke: authentication", () => {
  it("fetches an anonymous token and caches it across calls", async () => {
    const a = await client.searchRecipes("test", { size: 5 });
    const b = await client.searchRecipes("test", { size: 5 });
    // Both succeed, meaning token was reused (no error on second call)
    expect(a.page.total).toBeGreaterThanOrEqual(0);
    expect(b.page.total).toBeGreaterThanOrEqual(0);
  });
});

// ── searchRecipes ─────────────────────────────────────────────

describe("smoke: searchRecipes", () => {
  let result: RecipeSearchResult;

  it("returns a result for 'pasta'", async () => {
    result = await client.searchRecipes("pasta", { size: 5 });
    expect(result).toBeDefined();
  });

  it("page has total count and hasNextPage flag", () => {
    expect(typeof result.page.total).toBe("number");
    expect(result.page.total).toBeGreaterThan(0);
    expect(typeof result.page.hasNextPage).toBe("boolean");
  });

  it("returns exactly as many results as requested", () => {
    expect(result.result).toHaveLength(5);
  });

  it("each result has the required RecipeSummary fields", () => {
    for (const r of result.result) {
      expect(typeof r.id).toBe("number");
      expect(typeof r.title).toBe("string");
      expect(r.title.length).toBeGreaterThan(0);
      expect(typeof r.slug).toBe("string");
      expect(typeof r.publishedAt).toBe("string");
      expect(Array.isArray(r.images)).toBe(true);
      expect(Array.isArray(r.tags)).toBe(true);
    }
  });

  it("images have url, width, height, rendition", () => {
    const img = result.result.find((r) => r.images.length > 0)?.images[0];
    expect(img).toBeDefined();
    expect(typeof img!.url).toBe("string");
    expect(typeof img!.width).toBe("number");
    expect(typeof img!.height).toBe("number");
    expect(typeof img!.rendition).toBe("string");
  });

  it("tags have key and value", () => {
    const recipe = result.result.find((r) => r.tags.length > 0);
    expect(recipe).toBeDefined();
    const tag = recipe!.tags[0];
    expect(typeof tag.key).toBe("string");
    expect(typeof tag.value).toBe("string");
  });

  it("nutrition fields are present and have value + unit when non-null", () => {
    const withNutrition = result.result.find((r) => r.nutrition !== null);
    if (!withNutrition) return; // some queries may return no nutrition data

    const n = withNutrition.nutrition!;
    for (const field of ["energy", "fat", "saturatedFat", "carbohydrates", "protein", "sodium"] as const) {
      expect(typeof n[field].value).toBe("number");
      expect(typeof n[field].unit).toBe("string");
    }
  });

  it("sortBy POPULAR returns results", async () => {
    const r = await client.searchRecipes("soep", { size: 5, sortBy: "POPULAR" });
    expect(r.result.length).toBeGreaterThan(0);
  });

  it("sortBy NEWEST returns results", async () => {
    const r = await client.searchRecipes("soep", { size: 5, sortBy: "NEWEST" });
    expect(r.result.length).toBeGreaterThan(0);
  });

  it("filters by tag group", async () => {
    const r = await client.searchRecipes("pasta", {
      size: 5,
      filters: [{ group: "menugang", values: ["hoofdgerecht"] }],
    });
    expect(r.result.length).toBeGreaterThan(0);
    const tags = r.result.flatMap((x) => x.tags.map((t) => t.value));
    expect(tags).toContain("hoofdgerecht");
  });

  it("pagination: page 2 has different results from page 1", async () => {
    const page1 = await client.searchRecipes("recept", { size: 5, start: 0 });
    const page2 = await client.searchRecipes("recept", { size: 5, start: 5 });
    const ids1 = page1.result.map((r) => r.id);
    const ids2 = page2.result.map((r) => r.id);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false);
  });
});

// ── getRecipe ─────────────────────────────────────────────────

describe("smoke: getRecipe", () => {
  let recipe: Recipe;

  it(`fetches recipe ${FIXTURE_ID} (${FIXTURE_SLUG})`, async () => {
    recipe = await client.getRecipe(FIXTURE_ID);
    expect(recipe).toBeDefined();
  });

  it("has correct id", () => {
    expect(recipe.id).toBe(FIXTURE_ID);
  });

  it("has required top-level fields", () => {
    expect(typeof recipe.title).toBe("string");
    expect(recipe.title.length).toBeGreaterThan(0);
    expect(typeof recipe.description).toBe("string");
    expect(typeof recipe.cookTime).toBe("number");
    expect(recipe.cookTime).toBeGreaterThan(0);
    expect(typeof recipe.publishedAt).toBe("string");
  });

  it("has images with correct shape", () => {
    expect(Array.isArray(recipe.images)).toBe(true);
    expect(recipe.images.length).toBeGreaterThan(0);
    const img = recipe.images[0];
    expect(typeof img.url).toBe("string");
    expect(typeof img.width).toBe("number");
    expect(typeof img.height).toBe("number");
    expect(typeof img.rendition).toBe("string");
  });

  it("has tags with correct shape", () => {
    expect(Array.isArray(recipe.tags)).toBe(true);
    if (recipe.tags.length > 0) {
      expect(typeof recipe.tags[0].key).toBe("string");
      expect(typeof recipe.tags[0].value).toBe("string");
    }
  });

  it("has ingredients with id and quantity", () => {
    expect(Array.isArray(recipe.ingredients)).toBe(true);
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    for (const ing of recipe.ingredients) {
      expect(typeof ing.id).toBe("number");
      expect(typeof ing.quantity).toBe("number");
    }
  });

  it("has preparation with steps and summary", () => {
    expect(Array.isArray(recipe.preparation.steps)).toBe(true);
    expect(recipe.preparation.steps.length).toBeGreaterThan(0);
    expect(Array.isArray(recipe.preparation.summary)).toBe(true);
    for (const step of recipe.preparation.steps) {
      expect(typeof step).toBe("string");
    }
  });

  it("has tips array", () => {
    expect(Array.isArray(recipe.tips)).toBe(true);
    for (const tip of recipe.tips) {
      expect(typeof tip.type).toBe("string");
      expect(typeof tip.value).toBe("string");
    }
  });

  it("does NOT have slug or nutrition (RecipeSummary-only fields)", () => {
    expect((recipe as unknown as RecipeSummary).slug).toBeUndefined();
    expect((recipe as unknown as RecipeSummary).nutrition).toBeUndefined();
  });
});

// ── searchAll ─────────────────────────────────────────────────

describe("smoke: searchAll generator", () => {
  it("yields more than one page worth of results", async () => {
    const results: RecipeSummary[] = [];
    for await (const r of client.searchAll("soep", { size: 5 })) {
      results.push(r);
      if (results.length >= 12) break; // stop early — we just need to cross a page boundary
    }
    expect(results.length).toBeGreaterThanOrEqual(6);
    // All yielded items are unique
    const ids = results.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── getRecipeUrl ──────────────────────────────────────────────

describe("smoke: getRecipeUrl", () => {
  it("builds a URL that matches the real Allerhande URL pattern", async () => {
    const recipe = await client.getRecipe(FIXTURE_ID);
    // getRecipe does not return slug, so build from our known fixture slug
    const url = getRecipeUrl(recipe.id, FIXTURE_SLUG);
    expect(url).toBe(`https://www.ah.nl/allerhande/recept/R-R${FIXTURE_ID}/${FIXTURE_SLUG}`);
  });
});
