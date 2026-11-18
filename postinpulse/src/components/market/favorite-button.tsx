"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMarket } from "@/lib/store";

export function FavoriteButton({ id, className }: { id: string; className?: string }) {
  const { isFavorite, toggleFavorite, ready } = useMarket();
  const active = ready && isFavorite(id);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Прибрати з обраного" : "Додати в обране"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
      }}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <Heart className={cn("size-4.5", active ? "fill-rose-500 text-rose-500" : "text-foreground/70")} />
    </button>
  );
}
