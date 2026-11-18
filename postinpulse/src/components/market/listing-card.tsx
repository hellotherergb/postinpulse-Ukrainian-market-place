import Link from "next/link";
import { Camera, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatAgo, formatPrice, type Listing } from "@/lib/market";
import { FavoriteButton } from "./favorite-button";
import { ListingImage } from "./listing-image";

export function ListingCard({ listing }: { listing: Listing }) {
  const ships = listing.delivery.some((d) => d !== "pickup");
  const photos = listing.imageCount ?? listing.images.length;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <ListingImage listing={listing} className="transition duration-300 group-hover:scale-105" />
        <FavoriteButton id={listing.id} className="absolute top-2.5 right-2.5" />
        <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
          {listing.condition === "new" && <Badge className="bg-white text-foreground">Нове</Badge>}
          {listing.mine && <Badge>Моє</Badge>}
        </div>
        {photos > 1 && (
          <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            <Camera className="size-3" />
            {photos}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-sm leading-snug font-medium break-words">{listing.title}</h3>
        <p className="text-base leading-tight font-bold tracking-tight break-words sm:text-lg">
          {formatPrice(listing.price)}
          {listing.negotiable && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">Торг</span>
          )}
        </p>
        <div className="mt-auto flex min-w-0 flex-col gap-0.5 pt-1 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{listing.city}</span>
          </span>
          <span className="truncate" suppressHydrationWarning>
            {formatAgo(listing.createdAt)}
          </span>
          {ships && (
            <span className="flex min-w-0 items-center gap-1 text-primary">
              <Truck className="size-3.5 shrink-0" />
              <span className="truncate">Доставка</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ListingGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <div className="aspect-[4/3] animate-pulse bg-muted" />
          <div className="space-y-2 p-3.5">
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
