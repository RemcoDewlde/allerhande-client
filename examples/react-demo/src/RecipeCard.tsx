import type { RecipeSummary } from "allerhande-client";

interface Props {
  recipe: RecipeSummary;
  onClick: () => void;
}

export function RecipeCard({ recipe, onClick }: Props) {
  const image = recipe.images[0];
  const courseTag = recipe.tags.find(
    (t) => t.key === "soort-gerecht" || t.key === "menugang"
  );
  const kcal = recipe.nutrition?.energy;

  return (
    <div
      className="card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="card-img-wrap">
        {image ? (
          <img
            className="card-img"
            src={image.url}
            alt={recipe.title}
            loading="lazy"
          />
        ) : (
          <div className="card-img-placeholder" />
        )}
      </div>
      <div className="card-body">
        {courseTag && <span className="card-badge">{courseTag.value}</span>}
        <h3 className="card-title">{recipe.title}</h3>
        {kcal && (
          <p className="card-kcal">
            {kcal.value} {kcal.unit}
          </p>
        )}
      </div>
    </div>
  );
}
