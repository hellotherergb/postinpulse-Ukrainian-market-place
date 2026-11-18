import { getListing } from "@/lib/server/store";

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

export async function GET(_request: Request, ctx: RouteContext<"/api/listings/[id]/photos/[index]">) {
  const { id, index } = await ctx.params;
  try {
    const listing = await getListing(id);
    const match = listing?.images[Number(index)]?.match(DATA_URL_RE);
    if (!match) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(match[2], "base64"), {
      headers: {
        "Content-Type": match[1],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("GET photo failed", err);
    return new Response("Unavailable", { status: 503 });
  }
}
