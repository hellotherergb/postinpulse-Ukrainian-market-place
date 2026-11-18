import { addSignal } from "@/lib/server/accounts";
import { json, viewer } from "@/lib/server/owner";
import type { SignalKind } from "@/lib/rank";
import { getListing } from "@/lib/server/store";

const KINDS = new Set<SignalKind>(["skip", "dwell", "favorite", "unfavorite"]);

export async function POST(request: Request) {
  const { key } = await viewer(request);
  if (!key) return json({ ok: true });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректні дані" }, { status: 400 });
  }
  const listingId = body && typeof body === "object" && "listingId" in body ? String(body.listingId ?? "") : "";
  const kind = body && typeof body === "object" && "kind" in body ? String(body.kind ?? "") : "";
  if (!KINDS.has(kind as SignalKind)) return json({ error: "Некоректні дані" }, { status: 400 });

  try {
    const listing = await getListing(listingId);
    if (listing) {
      await addSignal(key, {
        listingId,
        kind: kind as SignalKind,
        category: listing.category,
        city: listing.city,
        price: listing.price,
        createdAt: Date.now(),
      });
    }
    return json({ ok: true });
  } catch (err) {
    console.error("POST /api/feed/signal failed", err);
    return json({ ok: true });
  }
}
