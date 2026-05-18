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
  /**
   * Raw quantity in the recipe's declared unit (e.g. `200` for "200 g").
   *
   * @remarks The ingredient name and unit of measurement are **not** returned
   * by the recipe endpoint — they live in Albert Heijn's product catalog,
   * keyed by `id`. There is no public bulk-resolve endpoint for them.
   */
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
