import { AuthManager } from "./auth.js";
import { AllerhandeApiError, AllerhandeGraphQLError } from "./errors.js";
import { GET_RECIPE_QUERY, SEARCH_RECIPES_QUERY } from "./queries.js";
import type {
  Recipe,
  RecipeSearchResult,
  RecipeSummary,
  SearchRecipesOptions,
} from "./types.js";

const GRAPHQL_URL = "https://api.ah.nl/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface AllerhandeClientOptions {
  /**
   * Custom fetch implementation. Defaults to `globalThis.fetch`.
   * Useful for Node < 18, testing, or adding request middleware.
   */
  fetch?: typeof globalThis.fetch;
}

export class AllerhandeClient {
  private auth: AuthManager;
  private readonly fetchFn?: typeof fetch;

  constructor(options: AllerhandeClientOptions = {}) {
    this.fetchFn = options.fetch;
    this.auth = new AuthManager(options.fetch);
  }

  private resolveFetch(): typeof fetch {
    return this.fetchFn ?? globalThis.fetch;
  }

  private async graphql<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const token = await this.auth.getAccessToken();

    const res = await this.resolveFetch()(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new AllerhandeApiError(res.status, res.statusText);
    }

    const json = (await res.json()) as GraphQLResponse<T>;

    if (json.errors?.length) {
      throw new AllerhandeGraphQLError(json.errors.map((e) => e.message));
    }

    if (!json.data) {
      throw new AllerhandeGraphQLError(["No data in GraphQL response"]);
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

  /**
   * Async generator that pages through all search results automatically,
   * yielding one `RecipeSummary` at a time until all pages are exhausted.
   *
   * @example
   * for await (const recipe of client.searchAll("pasta")) {
   *   console.log(recipe.title);
   * }
   */
  async *searchAll(
    query: string,
    options: Omit<SearchRecipesOptions, "start"> = {}
  ): AsyncGenerator<RecipeSummary> {
    let start = 0;
    while (true) {
      const result = await this.searchRecipes(query, { ...options, start });
      yield* result.result;
      if (!result.page.hasNextPage || result.result.length === 0) break;
      start += result.result.length;
    }
  }
}
