import type { RecipeSummary } from "../recipe/types.js";

export interface PageInfo {
  total: number;
  hasNextPage: boolean;
}

export interface RecipeSearchResult {
  page: PageInfo;
  result: RecipeSummary[];
}

export type RecipeSearchSortOption = "NEWEST" | "POPULAR";

export interface RecipeSearchFilter {
  /** Tag group key, e.g. "menugang", "keuken", "soort-gerecht" */
  group: string;
  /** Values to filter by, e.g. ["hoofdgerecht"] */
  values: string[];
}

export interface SearchRecipesOptions {
  /** Number of results per page. Allowed: 5, 10, 12, 20, 24, 25, 50, 100 */
  size?: number;
  /** Zero-based offset for pagination */
  start?: number;
  sortBy?: RecipeSearchSortOption;
  filters?: RecipeSearchFilter[];
  /** Require these ingredients to be present */
  ingredients?: string[];
}
