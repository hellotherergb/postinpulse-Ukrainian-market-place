import { addSignal, likeCounts, toggleLike } from "@/lib/server/accounts";
import { json, viewer } from "@/lib/server/owner";
import { getListing } from "@/lib/server/store";

export async function POST(request: Request) {
  const { user, key } = await viewer(request);
  if (!user || !key) return json({ error: "Увійдіть, щоб лайкати", login: true }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректні дані" }, { status: 400 });
  }
  const listingId = body && typeof body === "object" && "listingId" in body ? String(body.listingId ?? "") : "";

  try {
    const listing = await getListing(listingId);
    if (!listing) return json({ error: "Оголошення не знайдено" }, { status: 404 });
    const liked = await toggleLike(key, listingId);
    await addSignal(key, {
      listingId,
      kind: liked ? "like" : "unlike",
      category: listing.category,
      city: listing.city,
      price: listing.price,
      createdAt: Date.now(),
    });
    const counts = await likeCounts([listingId]);
    return json({ liked, likeCount: counts.get(listingId) ?? 0 });
  } catch (err) {
    console.error("POST /api/feed/like failed", err);
    return json({ error: "Не вдалося зберегти лайк" }, { status: 500 });
  }
}
