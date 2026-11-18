"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useMarket } from "@/lib/store";
import { ListingCard, ListingGridSkeleton } from "./listing-card";
import { OfflineState } from "./offline-state";

export function LatestListings({ limit = 8 }: { limit?: number }) {
  const { listings, ready, status } = useMarket();
  if (!ready) return <ListingGridSkeleton count={limit} />;
  if (status === "offline" && listings.length === 0) return <OfflineState />;
  if (listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-14 text-center">
        <h3 className="font-semibold">Поки немає оголошень</h3>
        <p className="mt-1 text-sm text-muted-foreground">Демо-товари прибрано. Опублікуйте перше — його побачать усі.</p>
        <Button render={<Link href="/sell" />} nativeButton={false} className="mt-5">
          Подати оголошення
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {listings.slice(0, limit).map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
