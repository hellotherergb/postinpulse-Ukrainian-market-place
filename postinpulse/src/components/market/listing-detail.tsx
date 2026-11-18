"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  Eye,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  Trash2,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { categoryById, deliveryLabel, formatAgo, formatPrice } from "@/lib/market";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BidBox } from "./bid-panel";
import { BuyDialog } from "./buy-dialog";
import { ContactMenu } from "./contact-menu";
import { FavoriteButton } from "./favorite-button";
import { ListingCard } from "./listing-card";
import { ListingImage } from "./listing-image";

export function ListingDetail({ id }: { id: string }) {
  const { getListing, fetchListing, recordView, listings, ready, removeListing } = useMarket();
  const router = useRouter();
  const [photo, setPhoto] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [checkedId, setCheckedId] = useState<string | null>(null);
  const listing = getListing(id);

  useEffect(() => {
    let active = true;
    fetchListing(id).finally(() => active && setCheckedId(id));
    recordView(id);
    return () => {
      active = false;
    };
  }, [id, fetchListing, recordView]);

  if (!ready || leaving || (!listing && checkedId !== id)) return <ListingDetailSkeleton />;

  if (!listing) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Оголошення не знайдено</h1>
        <p className="mt-2 text-muted-foreground">
          Можливо, товар уже продали або продавець зняв оголошення з публікації.
        </p>
        <Button render={<Link href="/catalog" />} nativeButton={false} className="mt-6">
          До каталогу
        </Button>
      </div>
    );
  }

  const category = categoryById(listing.category);
  const similar = listings
    .filter((l) => l.category === listing.category && l.id !== listing.id)
    .slice(0, 4);
  const ships = listing.delivery.some((d) => d !== "pickup");
  const photoCount = Math.max(listing.images.length, 1);
  const currentPhoto = Math.min(photo, photoCount - 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground" aria-label="Навігаційний ланцюжок">
        <Link href="/catalog" className="flex items-center gap-0.5 hover:text-foreground">
          <ChevronLeft className="size-4" />
          Каталог
        </Link>
        <span>/</span>
        <Link href={`/catalog?category=${category.id}`} className="hover:text-foreground">
          {category.label}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted">
              <ListingImage listing={listing} index={currentPhoto} iconClassName="size-24" />
              <FavoriteButton id={listing.id} className="absolute top-3 right-3 size-10" />
            </div>
            {photoCount > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {listing.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPhoto(i)}
                    aria-label={`Фото ${i + 1}`}
                    className={cn(
                      "size-16 shrink-0 overflow-hidden rounded-lg border-2 transition sm:size-20",
                      i === currentPhoto ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                    )}
                  >
                    <ListingImage listing={listing} index={i} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <h2 className="mb-3 font-semibold">Опис</h2>
            <p className="text-[15px] leading-relaxed break-words whitespace-pre-line">{listing.description}</p>
            <Separator className="my-5" />
            <dl className="grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Стан</dt>
                <dd className="font-medium">{listing.condition === "new" ? "Нове" : "Вживане"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Категорія</dt>
                <dd className="font-medium">{category.label}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Місто</dt>
                <dd className="font-medium">{listing.city}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {listing.condition === "new" && <Badge variant="secondary">Нове</Badge>}
              {listing.negotiable && <Badge variant="secondary">Можливий торг</Badge>}
              {listing.mine && <Badge>Ваше оголошення</Badge>}
            </div>
            <h1 className="text-xl leading-snug font-bold tracking-tight break-words sm:text-2xl">{listing.title}</h1>
            <p className="mt-3 text-3xl font-extrabold tracking-tight break-words">{formatPrice(listing.price)}</p>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {listing.city}
              </span>
              <span suppressHydrationWarning>{formatAgo(listing.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Eye className="size-4" />
                {listing.views}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {listing.mine ? (
                <Button
                  variant="destructive"
                  disabled={removing}
                  className="h-11 w-full gap-2 text-base"
                  onClick={async () => {
                    setRemoving(true);
                    try {
                      await removeListing(listing.id);
                      setLeaving(true);
                      router.push("/my");
                      toast.success("Оголошення знято з публікації");
                    } catch {
                      setRemoving(false);
                      toast.warning("Не вдалося зняти оголошення", {
                        description: "Перевірте зʼєднання та спробуйте ще раз.",
                      });
                    }
                  }}
                >
                  {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Зняти з публікації
                </Button>
              ) : (
                <>
                  {ships && <BuyDialog listing={listing} />}
                  <ContactMenu listing={listing} label="Написати продавцю" />
                  <ContactMenu listing={listing} label="Показати телефон" variant="outline" />
                </>
              )}
              <BidBox listingId={listing.id} asking={listing.price} mine={listing.mine} />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {listing.seller.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold break-words">{listing.seller.name}</p>
                <p className="flex min-w-0 flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {listing.seller.rating.toFixed(1)} · {listing.seller.reviews} відгуків · з{" "}
                  {listing.seller.since} р.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 text-sm">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Truck className="size-4 text-primary" />
              Доставка та отримання
            </h2>
            <ul className="space-y-1.5">
              {listing.delivery.map((d) => (
                <li key={d} className="flex min-w-0 justify-between gap-3">
                  <span>{deliveryLabel(d)}</span>
                  <span className="text-muted-foreground">
                    {d === "pickup" ? listing.city : d === "nova" ? "1–2 дні" : "2–5 днів"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2.5 rounded-xl bg-emerald-50 p-3 text-emerald-900">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-semibold">Безпечна угода.</span> Оплата зберігається на платформі, доки
                ви не отримаєте товар.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Схожі оголошення</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {similar.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-3">
          <div className="h-7 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-9 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
  );
}
