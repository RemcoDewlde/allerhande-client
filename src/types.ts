export interface RecipeImage {
  url: string;
  width: number;
  height: number;
  rendition: string;
}

export interface RecipeTag {
  /** Tag category, e.g. "menugang", "keuken", "soort-gerecht" */
  key: string;
  /** Tag value, e.g. "hoofdgerecht", "italiaans", "pasta" */
  value: string;
}

/** A single nutrient value, e.g. { value: 275, unit: "kcal" } */
export interface RecipeNutrient {
  value: number;
  unit: string;
}

/** Per-serving nutritional information (only available on search summaries) */
export interface RecipeNutritionInfo {
  energy: RecipeNutrient;
  fat: RecipeNutrient;
  saturatedFat: RecipeNutrient;
  carbohydrates: RecipeNutrient;
  protein: RecipeNutrient;
  sodium: RecipeNutrient;
}

export interface RecipeAuthor {
  __typename: "RecipeAuthor";
}

/** Lightweight recipe returned from search results */
export interface RecipeSummary {
  id: number;
  title: string;
  slug: string;
  publishedAt: string;
  images: RecipeImage[];
  tags: RecipeTag[];
  /** Null when the recipe has no nutritional data */
  nutrition: RecipeNutritionInfo | null;
  author: RecipeAuthor | null;
}

export interface RecipeIngredient {
  id: number;
  quantity: number;
}

export interface RecipePreparation {
  /** Individual numbered steps */
  steps: string[];
  /** Steps grouped into longer paragraphs */
  summary: string[];
}

export interface RecipeTip {
  /** Category of tip, e.g. "algemeen" */
  type: string;
  value: string;
}

/** Full recipe detail, fetched by ID */
export interface Recipe {
  id: number;
  title: string;
  description: string;
  /** Cook time in minutes */
  cookTime: number;
  publishedAt: string;
  images: RecipeImage[];
  tags: RecipeTag[];
  ingredients: RecipeIngredient[];
  preparation: RecipePreparation;
  tips: RecipeTip[];
  author: RecipeAuthor | null;
}

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
