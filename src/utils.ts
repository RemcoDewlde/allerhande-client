/**
 * Returns the canonical Allerhande URL for a recipe.
 *
 * @example
 * getRecipeUrl(1202199, "pasta-carbonara-van-roberta-pagnier")
 * // → "https://www.ah.nl/allerhande/recept/R-R1202199/pasta-carbonara-van-roberta-pagnier"
 */
export function getRecipeUrl(id: number, slug: string): string {
  return `https://www.ah.nl/allerhande/recept/R-R${id}/${slug}`;
}
