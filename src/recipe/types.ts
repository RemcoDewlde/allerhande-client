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
  energy: RecipeNutrient | null;
  fat: RecipeNutrient | null;
  saturatedFat: RecipeNutrient | null;
  carbohydrates: RecipeNutrient | null;
  protein: RecipeNutrient | null;
  sodium: RecipeNutrient | null;
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

/** Localised ingredient name. Use `plural` when quantity > 1 and it is non-null. */
export interface RecipeIngredientName {
  singular: string;
  plural: string | null;
}

export interface RecipeIngredient {
  id: number;
  /** Raw quantity in the recipe's declared unit (e.g. `200` for "200 g"). */
  quantity: number;
  /**
   * Human-readable ingredient name.
   * Unit is not exposed by the API — only the numeric quantity is returned.
   */
  name: RecipeIngredientName;
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
