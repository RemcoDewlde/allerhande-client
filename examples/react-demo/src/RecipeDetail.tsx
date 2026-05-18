import { useEffect, useState } from "react";
import type { Recipe, RecipeNutritionInfo } from "allerhande-client";
import { getRecipeUrl } from "allerhande-client";
import { client } from "./client";

interface Props {
  id: number;
  slug: string;
  nutrition: RecipeNutritionInfo | null;
  onClose: () => void;
}

const NUTRITION_ROWS: {
  key: keyof RecipeNutritionInfo;
  label: string;
  indent?: boolean;
}[] = [
  { key: "energy",        label: "Energie" },
  { key: "fat",           label: "Vet" },
  { key: "saturatedFat",  label: "waarvan verzadigd", indent: true },
  { key: "carbohydrates", label: "Koolhydraten" },
  { key: "protein",       label: "Eiwitten" },
  { key: "sodium",        label: "Natrium" },
];

/** Render API-supplied HTML safely, adding target=_blank to all links. */
function RichText({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const processed = html
    .trim()
    .replace(/<a(\s)/gi, '<a target="_blank" rel="noopener noreferrer"$1')
    // Quote bare unquoted href values: href=https://... → href="https://..."
    .replace(/href=(?!["'])([\S]+)/g, 'href="$1"');
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}

function ingredientLabel(
  quantity: number,
  name: { singular: string; plural: string | null }
): string {
  const label =
    quantity !== 1 && name.plural != null ? name.plural : name.singular;
  return `${quantity} ${label}`;
}

export function RecipeDetail({ id, slug, nutrition, onClose }: Props) {
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
              <p className="modal-description">
                <RichText html={recipe.description} />
              </p>
            )}

            {nutrition && (
              <section className="modal-section">
                <h4>Voedingswaarden <span className="nutrition-per">per portie</span></h4>
                <table className="nutrition-table">
                  <tbody>
                    {NUTRITION_ROWS.map(({ key, label, indent }) => (
                      <tr key={key} className={indent ? "nutrition-indent" : ""}>
                        <td className="nutrition-label">{label}</td>
                        <td className="nutrition-value">
                          {nutrition[key].value} {nutrition[key].unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <section className="modal-section">
              <h4>Ingredients ({recipe.ingredients.length})</h4>
              <ul className="ingredient-list">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id}>
                    {ingredientLabel(ing.quantity, ing.name)}
                  </li>
                ))}
              </ul>
            </section>

            <section className="modal-section">
              <h4>Preparation</h4>
              <ol className="step-list">
                {recipe.preparation.steps.map((step, i) => (
                  <li key={i}>
                    <RichText html={step} />
                  </li>
                ))}
              </ol>
            </section>

            {recipe.tips.length > 0 && (
              <section className="modal-section">
                <h4>Tips</h4>
                <ul className="tip-list">
                  {recipe.tips.map((tip, i) => (
                    <li key={i}>
                      <strong>{tip.type}:</strong>{" "}
                      <RichText html={tip.value} />
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
