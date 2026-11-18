"use client";

import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";

function plural(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "оголошення";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "оголошення";
  return "оголошень";
}

export function LiveBadge({ className }: { className?: string }) {
  const { ready, status, listings } = useMarket();
  const offline = ready && status === "offline";

  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur",
        className,
      )}
      aria-live="polite"
    >
      <span className="relative flex size-2">
        {!offline && ready && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", offline ? "bg-amber-500" : "bg-emerald-500")} />
      </span>
      {!ready
        ? "Завантажуємо оголошення…"
        : offline
          ? "Немає зʼєднання — оновимо, щойно повернеться мережа"
          : `${listings.length} ${plural(listings.length)} з усієї України · оновлюється наживо`}
    </p>
  );
}
