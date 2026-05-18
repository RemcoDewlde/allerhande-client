/**
 * Search recipes by keyword, with optional filters.
 *
 * Usage:
 *   node search.js <query> [--size=N] [--sort=POPULAR|NEWEST]
 *
 * Examples:
 *   node search.js pasta
 *   node search.js soep --size=5 --sort=POPULAR
 */

import { AllerhandeClient, getRecipeUrl } from "allerhande-client";

const args = process.argv.slice(2);
const query = args.find((a) => !a.startsWith("--")) ?? "pasta carbonara";
const size = Number(args.find((a) => a.startsWith("--size="))?.split("=")[1] ?? 5);
const sortBy = args.find((a) => a.startsWith("--sort="))?.split("=")[1];

const client = new AllerhandeClient();

console.log(`\nSearching for "${query}"…\n`);

const { page, result } = await client.searchRecipes(query, {
  size,
  ...(sortBy ? { sortBy } : {}),
});

console.log(`Found ${page.total} recipes (showing ${result.length}):\n`);

for (const [i, recipe] of result.entries()) {
  const tags = recipe.tags.map((t) => t.value).join(" · ") || "—";
  const kcal = recipe.nutrition?.energy
    ? `${recipe.nutrition.energy.value} ${recipe.nutrition.energy.unit}`
    : "no nutrition data";

  console.log(`${i + 1}. ${recipe.title}`);
  console.log(`   Tags:      ${tags}`);
  console.log(`   Nutrition: ${kcal} per serving`);
  console.log(`   URL:       ${getRecipeUrl(recipe.id, recipe.slug)}`);
  console.log();
}

if (page.hasNextPage) {
  console.log(`… and ${page.total - result.length} more. Use --size=N to fetch more.`);
}
