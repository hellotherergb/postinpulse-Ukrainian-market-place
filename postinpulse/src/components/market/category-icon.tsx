import {
  BookOpen,
  Car,
  Dumbbell,
  Gem,
  Home,
  Baby,
  Shirt,
  Smartphone,
  type LucideProps,
} from "lucide-react";
import type { CategoryId } from "@/lib/market";

const ICONS: Record<CategoryId, React.ComponentType<LucideProps>> = {
  electronics: Smartphone,
  fashion: Shirt,
  home: Home,
  kids: Baby,
  auto: Car,
  sport: Dumbbell,
  collectibles: Gem,
  books: BookOpen,
};

export function CategoryIcon({ id, ...props }: { id: CategoryId } & LucideProps) {
  const Icon = ICONS[id];
  return <Icon {...props} />;
}
