import { presentBid, listBids, nextMinimum, placeBid } from "@/lib/server/bids";
import { json, viewer } from "@/lib/server/owner";
import { getListing } from "@/lib/server/store";

function isBailout(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err;
}

async function payload(request: Request, id: string) {
  const listing = await getListing(id);
  if (!listing) return null;
  const { user, key } = await viewer(request);
  const rows = await listBids(id);
  const isSeller = Boolean((key && listing.ownerHash === key) || user?.admin);
  return {
    asking: listing.price,
    closed: rows.some((bid) => bid.accepted),
    minNext: nextMinimum(listing.price, rows),
    bids: rows.map((bid) => presentBid(bid, { userId: user?.id, isSeller })),
    canBid: Boolean(user) && !isSeller && listing.ownerHash !== "",
  };
}

export async function GET(request: Request, ctx: RouteContext<"/api/listings/[id]/bids">) {
  const { id } = await ctx.params;
  try {
    const body = await payload(request, id);
    if (!body) return json({ error: "Оголошення не знайдено" }, { status: 404 });
    return json(body);
  } catch (err) {
    if (isBailout(err)) throw err;
    console.error("GET /api/listings/[id]/bids failed", err);
    return json({ error: "Не вдалося завантажити ставки" }, { status: 503 });
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/listings/[id]/bids">) {
  const { id } = await ctx.params;
  const { user, key } = await viewer(request);
  if (!user) return json({ error: "Увійдіть, щоб зробити ставку", login: true }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некоректні дані" }, { status: 400 });
  }
  const amount = Number(body && typeof body === "object" && "amount" in body ? body.amount : NaN);
  try {
    const listing = await getListing(id);
    if (!listing) return json({ error: "Оголошення не знайдено" }, { status: 404 });
    if (key && listing.ownerHash === key) return json({ error: "Не можна ставити на своє оголошення" }, { status: 403 });
    const result = await placeBid({
      listingId: id,
      bidderId: user.id,
      bidderName: user.name,
      bidderPhone: user.phone,
      amount,
      asking: listing.price,
    });
    if (!result.ok) return json({ error: result.error }, { status: result.status });
    const next = await payload(request, id);
    return json(next, { status: 201 });
  } catch (err) {
    if (isBailout(err)) throw err;
    console.error("POST /api/listings/[id]/bids failed", err);
    return json({ error: "Не вдалося зберегти ставку" }, { status: 503 });
  }
}
