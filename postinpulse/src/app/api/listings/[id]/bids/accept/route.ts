import { acceptBid } from "@/lib/server/bids";
import { json, viewer } from "@/lib/server/owner";
import { getListing } from "@/lib/server/store";

export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/bids/accept">) {
  const { id } = await ctx.params;
  const { user, key } = await viewer(request);
  if (!user) return json({ error: "Увійдіть", login: true }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректні дані" }, { status: 400 });
  }
  const bidId = body && typeof body === "object" && "bidId" in body && typeof body.bidId === "string" ? body.bidId : "";
  if (!bidId) return json({ error: "Не вказано ставку" }, { status: 400 });
  try {
    const listing = await getListing(id);
    if (!listing) return json({ error: "Оголошення не знайдено" }, { status: 404 });
    const isSeller = Boolean(key && listing.ownerHash === key);
    if (!isSeller && !user.admin) return json({ error: "Прийняти ставку може лише продавець" }, { status: 403 });
    const ok = await acceptBid(id, bidId);
    return ok ? json({ ok: true }) : json({ error: "Ставку не знайдено" }, { status: 404 });
  } catch (err) {
    console.error("POST accept bid failed", err);
    return json({ error: "Не вдалося прийняти ставку" }, { status: 503 });
  }
}
