/**
 * Fetch and display a full recipe by its numeric ID.
 *
 * Usage:
 *   node get-recipe.js [id]
 *
 * Examples:
 *   node get-recipe.js
 *   node get-recipe.js 1202199
 */

import { AllerhandeClient } from "allerhande-client";

const id = Number(process.argv[2] ?? 1202199);
const client = new AllerhandeClient();

console.log(`\nFetching recipe ${id}…\n`);

const recipe = await client.getRecipe(id);

const line = "─".repeat(Math.min(recipe.title.length + 10, 60));

console.log(recipe.title + `  (${recipe.cookTime} min)`);
console.log(line);

if (recipe.description) {
  console.log(`\n${recipe.description}\n`);
}

console.log(`Tags: ${recipe.tags.map((t) => t.value).join(", ") || "none"}\n`);

console.log(`Ingredients (${recipe.ingredients.length}):`);
for (const ing of recipe.ingredients) {
  console.log(`  id ${ing.id}  ×  ${ing.quantity}`);
}

console.log(`\nPreparation (${recipe.preparation.steps.length} steps):`);
for (const [i, step] of recipe.preparation.steps.entries()) {
  console.log(`  ${i + 1}. ${step}`);
}

if (recipe.tips.length > 0) {
  console.log(`\nTips:`);
  for (const tip of recipe.tips) {
    console.log(`  [${tip.type}] ${tip.value}`);
  }
}

console.log();
