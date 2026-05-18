# allerhande-api

Unofficial typed TypeScript/JavaScript client for the [Albert Heijn Allerhande](https://www.ah.nl/allerhande) recipe API.

> **Warning**: This package wraps an undocumented, unofficial API. Albert Heijn may change or remove endpoints without notice.

## Installation

```sh
npm install allerhande-api
```

## Usage

```ts
import { AllerhandeClient } from "allerhande-api";

const client = new AllerhandeClient();
```

Authentication is handled automatically. An anonymous bearer token is fetched on the first request and refreshed transparently.

### Search recipes

```ts
const { page, result } = await client.searchRecipes("pasta carbonara");

console.log(page.total);        // total number of matches
console.log(page.hasNextPage);  // whether more pages exist
console.log(result[0].title);
console.log(result[0].slug);
console.log(result[0].tags);    // [{ key: "keuken", value: "italiaans" }, ...]
console.log(result[0].nutrition?.energy); // { value: 275, unit: "kcal" }
```

### Get a full recipe

```ts
const recipe = await client.getRecipe(1202199);

console.log(recipe.description);
console.log(recipe.cookTime);            // minutes
console.log(recipe.preparation.steps);  // string[]
console.log(recipe.ingredients);        // [{ id, quantity }, ...]
console.log(recipe.tips);               // [{ type, value }, ...]
```

### Pagination

```ts
const page1 = await client.searchRecipes("soep", { size: 20, start: 0 });
const page2 = await client.searchRecipes("soep", { size: 20, start: 20 });
```

Valid `size` values: `5`, `10`, `12`, `20`, `24`, `25`, `50`, `100`.

### Sorting

```ts
const newest = await client.searchRecipes("cake", { sortBy: "NEWEST" });
const popular = await client.searchRecipes("cake", { sortBy: "POPULAR" });
```

### Filtering by tag

```ts
const { result } = await client.searchRecipes("pasta", {
  filters: [
    { group: "menugang",     values: ["hoofdgerecht"] },
    { group: "keuken",       values: ["italiaans"]    },
  ],
});
```

Common filter groups: `menugang`, `keuken`, `soort-gerecht`, `tags`.

### Filter by required ingredients

```ts
const { result } = await client.searchRecipes("pasta", {
  ingredients: ["ei", "pancetta"],
});
```

## API reference

### `new AllerhandeClient()`

Creates a client instance. Each instance manages its own token lifecycle.

### `client.searchRecipes(query, options?)`

| Option | Type | Description |
|---|---|---|
| `size` | `number` | Results per page (5 / 10 / 12 / 20 / 24 / 25 / 50 / 100) |
| `start` | `number` | Zero-based offset |
| `sortBy` | `"NEWEST" \| "POPULAR"` | Sort order |
| `filters` | `RecipeSearchFilter[]` | Tag-based filters |
| `ingredients` | `string[]` | Required ingredient names |

Returns `Promise<RecipeSearchResult>`.

### `client.getRecipe(id)`

Fetches a full recipe by its numeric ID. Returns `Promise<Recipe>`.

## Notes

### Ingredient names

`recipe.ingredients` only contains `{ id, quantity }`. The ingredient names and units are not part of the recipe endpoint — they are stored separately in Albert Heijn's product catalog.

### Nutritional data

`nutrition` is only present on `RecipeSummary` (search results). The full `Recipe` returned by `getRecipe` does not include nutrition fields.

### Recipe URL

Allerhande recipe URLs follow the pattern:
```
https://www.ah.nl/allerhande/recept/R-R{id}/{slug}
```
