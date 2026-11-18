import { likeCounts, likedIds, signalsFor } from "@/lib/server/accounts";
import { toPublic } from "@/lib/server/listing-input";
import { json, viewer } from "@/lib/server/owner";
import { rankDeals } from "@/lib/rank";
import { allListings } from "@/lib/server/store";

export async function GET(request: Request) {
  try {
    const { key } = await viewer(request);
    const viewerKey = key ?? "guest";
    const [listings, signals, liked] = await Promise.all([
      allListings(),
      key ? signalsFor(key) : Promise.resolve([]),
      key ? likedIds(key) : Promise.resolve(new Set<string>()),
    ]);
    const ranked = rankDeals(listings, signals, liked, viewerKey).slice(0, 40);
    const counts = await likeCounts(ranked.map((row) => row.item.id));
    return json({
      personalized: signals.some((s) => s.kind === "like" || s.kind === "favorite" || s.kind === "dwell"),
      deals: ranked.map(({ item, reason }) => ({
        ...toPublic(item, key, true),
        reason,
        liked: liked.has(item.id),
        likeCount: counts.get(item.id) ?? 0,
      })),
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) throw err;
    console.error("GET /api/feed failed", err);
    return json({ error: "Не вдалося зібрати стрічку" }, { status: 503 });
  }
}
