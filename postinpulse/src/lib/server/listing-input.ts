import "server-only";

import {
  CATEGORIES,
  CITIES,
  DELIVERY,
  isValidPhone,
  slugify,
  type CategoryId,
  type DeliveryId,
  type Listing,
} from "@/lib/market";
import { hashOwner, type StoredListing } from "./store";

const MAX_IMAGES = 6;
const MAX_IMAGE_CHARS = 700_000;
const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export type NewListingInput = Pick<
  Listing,
  "title" | "description" | "price" | "negotiable" | "category" | "city" | "condition" | "delivery" | "images"
> & { sellerName: string; phone: string; clientKey: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function parseListingInput(body: unknown): { ok: true; value: NewListingInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Некоректні дані" };
  const b = body as Record<string, unknown>;

  const title = str(b.title, 80);
  const category = b.category as CategoryId;
  const city = str(b.city, 40);
  const price = Number(b.price);
  const delivery = Array.isArray(b.delivery)
    ? [...new Set(b.delivery.filter((d): d is DeliveryId => DELIVERY.some((x) => x.id === d)))]
    : [];
  const images = Array.isArray(b.images)
    ? b.images.filter((i): i is string => typeof i === "string" && i.length <= MAX_IMAGE_CHARS && IMAGE_RE.test(i))
    : [];
  const phone = str(b.phone, 25);

  if (title.length < 3) return { ok: false, error: "Назва занадто коротка" };
  if (!CATEGORIES.some((c) => c.id === category)) return { ok: false, error: "Невідома категорія" };
  if (!CITIES.includes(city)) return { ok: false, error: "Невідоме місто" };
  if (!Number.isInteger(price) || price < 0 || price > 999_999_999) return { ok: false, error: "Некоректна ціна" };
  if (!delivery.length) return { ok: false, error: "Оберіть спосіб доставки" };
  if (!isValidPhone(phone)) return { ok: false, error: "Некоректний номер телефону" };

  return {
    ok: true,
    value: {
      title,
      description: str(b.description, 3000),
      price,
      negotiable: b.negotiable === true,
      category,
      city,
      condition: b.condition === "new" ? "new" : "used",
      delivery,
      images: images.slice(0, MAX_IMAGES),
      sellerName: str(b.sellerName, 40),
      phone,
      clientKey: str(b.clientKey, 120),
    },
  };
}

export function buildListing(input: NewListingInput, ownerHash: string): StoredListing {
  const now = Date.now();
  return {
    // A client-supplied key makes retries of the same submission resolve to the same id.
    id: input.clientKey
      ? slugify(input.title, hashOwner(`${ownerHash}:${input.clientKey}`).slice(0, 8))
      : slugify(input.title),
    title: input.title,
    description: input.description || "Продавець не додав опису. Напишіть йому, щоб дізнатися деталі.",
    price: input.price,
    negotiable: input.negotiable,
    category: input.category,
    city: input.city,
    condition: input.condition,
    delivery: input.delivery,
    images: input.images,
    seller: {
      name: input.sellerName || "Продавець",
      rating: 5,
      reviews: 0,
      since: new Date(now).getFullYear(),
      phone: input.phone,
    },
    createdAt: now,
    views: 0,
    ownerHash,
  };
}

export const photoUrl = (l: Pick<Listing, "id" | "createdAt">, index: number) =>
  `/api/listings/${encodeURIComponent(l.id)}/photos/${index}?v=${l.createdAt}`;

// Photos are served from their own cacheable URLs so the polled feed stays small.
export function toPublic(listing: StoredListing, viewerHash: string | null, full = false): Listing {
  const { ownerHash, ...rest } = listing;
  const count = rest.imageCount ?? rest.images.length;
  const urls = Array.from({ length: full ? count : Math.min(count, 1) }, (_, i) => photoUrl(rest, i));
  return {
    ...rest,
    images: urls,
    imageCount: count,
    mine: Boolean(viewerHash && ownerHash && ownerHash === viewerHash),
  };
}
