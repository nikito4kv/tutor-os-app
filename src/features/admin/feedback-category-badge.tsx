import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

type Category = "bug" | "idea" | "question" | "other";

const VARIANT: Record<Category, "destructive" | "success" | "secondary" | "outline"> = {
  bug: "destructive",
  idea: "success",
  question: "secondary",
  other: "outline",
};

/** Reuse the support widget's category labels — single source of truth. */
function categoryLabel(category: Category): string {
  return t.support.categories.find((c) => c.value === category)?.label ?? category;
}

export function FeedbackCategoryBadge({ category }: { category: Category }) {
  return <Badge variant={VARIANT[category]}>{categoryLabel(category)}</Badge>;
}
