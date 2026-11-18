import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingGridSkeleton } from "@/components/market/listing-card";
import { CatalogView } from "@/components/market/catalog-view";

export const metadata: Metadata = { title: "Каталог оголошень" };

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <ListingGridSkeleton />
        </div>
      }
    >
      <CatalogView />
    </Suspense>
  );
}
