const RECIPE_IMAGES = `images { url width height rendition }`;
const RECIPE_TAGS = `tags { key value }`;
const RECIPE_NUTRITION = `
  nutrition {
    energy        { value unit }
    fat           { value unit }
    saturatedFat  { value unit }
    carbohydrates { value unit }
    protein       { value unit }
    sodium        { value unit }
  }`;

export const SEARCH_RECIPES_QUERY = `
  query SearchRecipes(
    $searchText: String!
    $size: PageSize
    $start: Int
    $sortBy: RecipeSearchSortOption
    $filters: [RecipeSearchQueryFilter!]
    $ingredients: [String!]
  ) {
    recipeSearchV2(
      searchText: $searchText
      size: $size
      start: $start
      sortBy: $sortBy
      filters: $filters
      ingredients: $ingredients
    ) {
      page { total hasNextPage }
      result {
        id title slug publishedAt
        ${RECIPE_IMAGES}
        ${RECIPE_TAGS}
        ${RECIPE_NUTRITION}
        author { __typename }
      }
    }
  }
`;

export const GET_RECIPE_QUERY = `
  query GetRecipe($id: Int!) {
    recipe(id: $id) {
      id title description cookTime publishedAt
      ${RECIPE_IMAGES}
      ${RECIPE_TAGS}
      ingredients { id quantity name { singular plural } }
      preparation { steps summary }
      tips { type value }
      ${RECIPE_NUTRITION}
      author { __typename }
    }
  }
`;
