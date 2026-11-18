import { categoryById, type CategoryId } from "@/lib/market";

export type SignalKind = "like" | "unlike" | "skip" | "dwell" | "favorite" | "unfavorite";

export interface TasteSignal {
  listingId: string;
  kind: SignalKind;
  category?: string;
  city?: string;
  price?: number;
  createdAt: number;
}

export interface Rankable {
  id: string;
  category: string;
  city: string;
  price: number;
  createdAt: number;
  views: number;
  mine?: boolean;
}

const KIND_WEIGHT: Record<SignalKind, number> = {
  like: 6,
  favorite: 4,
  dwell: 2,
  skip: -3,
  unlike: -4,
  unfavorite: -2,
};

function hashUnit(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function rankDeals<T extends Rankable>(
  items: T[],
  signals: TasteSignal[],
  liked: ReadonlySet<string>,
  viewerKey: string,
  now = Date.now(),
) {
  const category = new Map<string, number>();
  const city = new Map<string, number>();
  const seen = new Map<string, { weight: number; skip: boolean; like: boolean }>();
  let priceSum = 0;
  let priceWeight = 0;

  for (const signal of signals) {
    const weight = KIND_WEIGHT[signal.kind] ?? 0;
    if (signal.category) category.set(signal.category, (category.get(signal.category) ?? 0) + weight);
    if (signal.city && weight > 0) city.set(signal.city, (city.get(signal.city) ?? 0) + weight);
    if (signal.price !== undefined && weight > 0) {
      priceSum += Math.log10(signal.price + 1) * weight;
      priceWeight += weight;
    }
    const prev = seen.get(signal.listingId) ?? { weight: 0, skip: false, like: false };
    prev.weight += weight;
    if (signal.kind === "skip") prev.skip = true;
    if (signal.kind === "like" || signal.kind === "favorite") prev.like = true;
    seen.set(signal.listingId, prev);
  }

  const taste = [...category.values()].reduce((sum, n) => sum + Math.max(0, n), 0);
  const avgLogPrice = priceWeight > 0 ? priceSum / priceWeight : null;
  const day = new Date(now).toISOString().slice(0, 10);
  let bestCategory = "";
  let bestCategoryScore = 0;
  for (const [id, score] of category) {
    if (score > bestCategoryScore) {
      bestCategory = id;
      bestCategoryScore = score;
    }
  }

  return items
    .map((item) => {
      const ageHours = Math.max(0, (now - item.createdAt) / 3_600_000);
      const fresh = Math.max(0, 5 - ageHours / 18);
      const categoryScore = category.get(item.category) ?? 0;
      const cityScore = (city.get(item.city) ?? 0) * 0.45;
      const priceScore =
        avgLogPrice === null ? 0 : Math.max(-1.5, 2.2 - Math.abs(Math.log10(item.price + 1) - avgLogPrice) * 1.4);
      const history = seen.get(item.id);
      const seenPenalty = history?.skip ? -9 : history?.like || liked.has(item.id) ? -3.5 : history ? -1.2 : 0;
      const personal = categoryScore * 1.15 + cityScore + priceScore;
      const explore = fresh + Math.log10(item.views + 1) * 0.8;
      const jitter = hashUnit(`${viewerKey}:${item.id}:${day}`) - 0.5;
      const score = (taste > 2 ? personal + fresh * 0.35 : explore) + seenPenalty + (item.mine ? -6 : 0) + jitter;

      let reason = "Популярне серед покупців";
      if (categoryScore > 2 && item.category === bestCategory) {
        reason = `Бо вам заходить ${categoryById(item.category as CategoryId).label.toLowerCase()}`;
      } else if ((city.get(item.city) ?? 0) > 3) {
        reason = `Ви часто дивитесь ${item.city}`;
      } else if (ageHours < 30) {
        reason = "Свіже оголошення";
      }

      return { item, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}
