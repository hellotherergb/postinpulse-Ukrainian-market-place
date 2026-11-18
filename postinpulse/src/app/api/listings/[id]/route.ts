import { toPublic } from "@/lib/server/listing-input";
import { json, viewer } from "@/lib/server/owner";
import { getListing, removeListing, removeListingAny } from "@/lib/server/store";

export async function GET(request: Request, ctx: RouteContext<"/api/listings/[id]">) {
  const { id } = await ctx.params;
  try {
    const listing = await getListing(id);
    if (!listing) return json({ error: "Оголошення не знайдено" }, { status: 404 });
    const { key } = await viewer(request);
    return json({ listing: toPublic(listing, key, true) });
  } catch (err) {
    console.error("GET /api/listings/[id] failed", err);
    return json({ error: "Сервіс тимчасово недоступний" }, { status: 503 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/listings/[id]">) {
  const { id } = await ctx.params;
  const { user, key: owner } = await viewer(request);
  if (!user?.admin && !owner) return json({ error: "Не вдалося визначити автора" }, { status: 401 });
  try {
    const removed = user?.admin ? await removeListingAny(id) : await removeListing(id, owner!);
    return removed ? json({ ok: true }) : json({ error: "Оголошення не знайдено" }, { status: 404 });
  } catch (err) {
    console.error("DELETE /api/listings/[id] failed", err);
    return json({ error: "Сервіс тимчасово недоступний" }, { status: 503 });
  }
}
