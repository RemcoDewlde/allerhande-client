import { useState, FormEvent } from "react";
import type {
  RecipeSummary,
  PageInfo,
  RecipeSearchSortOption,
} from "allerhande-client";
import { client } from "./client";
import { RecipeCard } from "./RecipeCard";
import { RecipeDetail } from "./RecipeDetail";

const PAGE_SIZE = 12;

const SUGGESTIONS = ["pasta carbonara", "soep", "risotto", "cake", "salade"];

interface Selected {
  id: number;
  slug: string;
}

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<RecipeSearchSortOption | "">("");
  const [results, setResults] = useState<RecipeSummary[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);

  async function doSearch(q: string, start: number, append: boolean) {
    const setLoad = append ? setLoadingMore : setLoading;
    setLoad(true);
    setError(null);
    try {
      const res = await client.searchRecipes(q, {
        size: PAGE_SIZE,
        start,
        ...(sortBy ? { sortBy } : {}),
      });
      setResults((prev) => (append ? [...prev, ...res.result] : res.result));
      setPageInfo(res.page);
      setOffset(start + res.result.length);
      if (!append) setQuery(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoad(false);
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) doSearch(inputValue.trim(), 0, false);
  };

  const handleSuggestion = (s: string) => {
    setInputValue(s);
    doSearch(s, 0, false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="logo">
            <span className="logo-accent">allerhande</span>-client
          </span>
          <span className="header-tag">React · TypeScript demo</span>
        </div>
      </header>

      <main className="main">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            className="search-input"
            type="text"
            placeholder='Search recipes… e.g. "pasta carbonara"'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as RecipeSearchSortOption | "")
            }
          >
            <option value="">Relevance</option>
            <option value="POPULAR">Popular</option>
            <option value="NEWEST">Newest</option>
          </select>
          <button className="search-btn" type="submit" disabled={loading}>
            {loading ? "…" : "Search"}
          </button>
        </form>

        {error && <p className="error-msg">{error}</p>}

        {!query && !loading && results.length === 0 && (
          <div className="empty-state">
            <p>Try one of these:</p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="suggestion"
                  onClick={() => handleSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {pageInfo && (
          <p className="results-count">
            {pageInfo.total.toLocaleString("nl-NL")} recipes for{" "}
            <strong>"{query}"</strong>
          </p>
        )}

        {results.length > 0 && (
          <div className="grid">
            {results.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() =>
                  setSelected({ id: recipe.id, slug: recipe.slug })
                }
              />
            ))}
          </div>
        )}

        {pageInfo?.hasNextPage && (
          <div className="load-more-row">
            <button
              className="load-more-btn"
              onClick={() => doSearch(query, offset, true)}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </main>

      {selected && (
        <RecipeDetail
          id={selected.id}
          slug={selected.slug}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
