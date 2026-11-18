import { json } from "@/lib/server/owner";
import { addView } from "@/lib/server/store";

export async function POST(_request: Request, ctx: RouteContext<"/api/listings/[id]/view">) {
  const { id } = await ctx.params;
  try {
    await addView(id);
  } catch (err) {
    console.error("POST /api/listings/[id]/view failed", err);
  }
  return json({ ok: true });
}
