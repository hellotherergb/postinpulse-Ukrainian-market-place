import { cn } from "@/lib/utils";
import { categoryById, type Listing } from "@/lib/market";
import { CategoryIcon } from "./category-icon";

export function ListingImage({
  listing,
  index = 0,
  className,
  iconClassName,
}: {
  listing: Pick<Listing, "images" | "category" | "title">;
  index?: number;
  className?: string;
  iconClassName?: string;
}) {
  const src = listing.images[index];
  const { hue } = categoryById(listing.category);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user uploads are data URLs
      <img src={src} alt={listing.title} className={cn("size-full object-cover", className)} />
    );
  }

  return (
    <div
      role="img"
      aria-label={listing.title}
      className={cn("flex size-full items-center justify-center", className)}
      style={{
        background: `linear-gradient(135deg, oklch(0.95 0.04 ${hue}), oklch(0.85 0.09 ${hue + 30}))`,
      }}
    >
      <CategoryIcon
        id={listing.category}
        strokeWidth={1.25}
        className={cn("size-14 opacity-60", iconClassName)}
        style={{ color: `oklch(0.4 0.12 ${hue})` }}
      />
    </div>
  );
}
