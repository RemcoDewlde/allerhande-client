import { AuthManager } from "./auth.js";
import { GET_RECIPE_QUERY, SEARCH_RECIPES_QUERY } from "./queries.js";
import type {
  Recipe,
  RecipeSearchResult,
  SearchRecipesOptions,
} from "./types.js";

const GRAPHQL_URL = "https://api.ah.nl/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export class AllerhandeClient {
  private auth = new AuthManager();

  private async graphql<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const token = await this.auth.getAccessToken();

    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
    }

    const json = (await res.json()) as GraphQLResponse<T>;

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join("; "));
    }

    if (!json.data) {
      throw new Error("No data in GraphQL response");
    }

    return json.data;
  }

  /**
   * Search for recipes by text query.
   *
   * @example
   * const { page, result } = await client.searchRecipes("pasta carbonara");
   */
  async searchRecipes(
    query: string,
    options: SearchRecipesOptions = {}
  ): Promise<RecipeSearchResult> {
    const data = await this.graphql<{ recipeSearchV2: RecipeSearchResult }>(
      SEARCH_RECIPES_QUERY,
      { searchText: query, ...options }
    );
    return data.recipeSearchV2;
  }

  /**
   * Fetch a single recipe by its numeric ID.
   *
   * @example
   * const recipe = await client.getRecipe(1202199);
   * console.log(recipe.preparation.steps);
   */
  async getRecipe(id: number): Promise<Recipe> {
    const data = await this.graphql<{ recipe: Recipe }>(GET_RECIPE_QUERY, {
      id,
    });
    return data.recipe;
  }
}
