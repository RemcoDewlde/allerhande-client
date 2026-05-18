/**
 * Page through ALL results for a query using the async generator.
 * Stops after --limit recipes (default 25) to avoid fetching the entire catalogue.
 *
 * Usage:
 *   node search-all.js <query> [--limit=N]
 *
 * Examples:
 *   node search-all.js soep
 *   node search-all.js cake --limit=50
 */

import { AllerhandeClient } from "allerhande-client";

const args = process.argv.slice(2);
const query = args.find((a) => !a.startsWith("--")) ?? "soep";
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 25);

const client = new AllerhandeClient();

console.log(`\nStreaming all results for "${query}" (max ${limit})…\n`);

let count = 0;
for await (const recipe of client.searchAll(query, { size: 10 })) {
  count++;
  const tags = recipe.tags.map((t) => t.value).slice(0, 3).join(", ");
  console.log(`${String(count).padStart(3)}. [${recipe.id}] ${recipe.title}${tags ? `  (${tags})` : ""}`);
  if (count >= limit) {
    console.log(`\nStopped at ${limit} — remove the limit to fetch everything.`);
    break;
  }
}

console.log(`\nTotal fetched: ${count}`);
