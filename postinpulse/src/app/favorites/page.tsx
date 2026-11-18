"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard, ListingGridSkeleton } from "@/components/market/listing-card";
import { useMarket } from "@/lib/store";

export default function FavoritesPage() {
  const { favorites, getListing, ready } = useMarket();
  const items = favorites.map(getListing).filter((l) => l !== undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Обране</h1>
      {!ready ? (
        <ListingGridSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
          <Heart className="mb-3 size-10 text-muted-foreground" />
          <h2 className="font-semibold">Тут поки порожньо</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Натискайте на сердечко на оголошеннях, щоб зберегти їх і повернутися пізніше.
          </p>
          <Button render={<Link href="/catalog" />} nativeButton={false} className="mt-5">
            Переглянути каталог
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
