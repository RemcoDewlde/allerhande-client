import { useEffect, useState } from "react";
import type { Recipe } from "allerhande-client";
import { getRecipeUrl } from "allerhande-client";
import { client } from "./client";

interface Props {
  id: number;
  slug: string;
  onClose: () => void;
}

export function RecipeDetail({ id, slug, onClose }: Props) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setRecipe(null);
    setError(null);
    client
      .getRecipe(id)
      .then(setRecipe)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load recipe")
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {loading && <p className="modal-loading">Loading…</p>}
        {error && <p className="error-msg">{error}</p>}

        {recipe && (
          <>
            <h2 className="modal-title">{recipe.title}</h2>

            <div className="modal-meta">
              <span className="modal-meta-item">⏱ {recipe.cookTime} min</span>
              {recipe.tags.slice(0, 4).map((t) => (
                <span key={t.key + t.value} className="modal-tag">
                  {t.value}
                </span>
              ))}
            </div>

            {recipe.description && (
              <p className="modal-description">{recipe.description}</p>
            )}

            <section className="modal-section">
              <h4>Ingredients ({recipe.ingredients.length})</h4>
              <ul className="ingredient-list">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id}>
                    <code className="ing-id">#{ing.id}</code>
                    <span className="ing-qty">× {ing.quantity}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="modal-section">
              <h4>Preparation</h4>
              <ol className="step-list">
                {recipe.preparation.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>

            {recipe.tips.length > 0 && (
              <section className="modal-section">
                <h4>Tips</h4>
                <ul className="tip-list">
                  {recipe.tips.map((tip, i) => (
                    <li key={i}>
                      <strong>{tip.type}:</strong> {tip.value}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <a
              className="ah-link"
              href={getRecipeUrl(recipe.id, slug)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Allerhande ↗
            </a>
          </>
        )}
      </div>
    </div>
  );
}
