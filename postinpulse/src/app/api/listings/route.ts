import { createHash } from "node:crypto";
import { buildListing, parseListingInput, toPublic } from "@/lib/server/listing-input";
import { json, viewer } from "@/lib/server/owner";
import { allListings, createListing, getListing } from "@/lib/server/store";

export async function GET(request: Request) {
  const { key } = await viewer(request);
  try {
    const listings = await allListings();
    const body = JSON.stringify({ listings: listings.map((l) => toPublic(l, key)) });
    const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
    const headers = { "Cache-Control": "no-cache", ETag: etag };
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return new Response(body, { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("GET /api/listings failed", err);
    return json({ error: "Сервіс тимчасово недоступний" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, key: owner } = await viewer(request);
  if (!user || !owner) return json({ error: "Увійдіть, щоб опублікувати оголошення" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Завеликий або пошкоджений запит" }, { status: 400 });
  }

  const parsed = parseListingInput(body);
  if (!parsed.ok) return json({ error: parsed.error }, { status: 400 });

  const listing = buildListing(parsed.value, owner);
  try {
    const existing = await getListing(listing.id);
    if (existing) {
      if (existing.ownerHash !== owner) return json({ error: "Спробуйте ще раз" }, { status: 409 });
      return json({ listing: toPublic(existing, owner, true) });
    }
    await createListing(listing);
    return json({ listing: toPublic(listing, owner, true) }, { status: 201 });
  } catch (err) {
    const existing = await getListing(listing.id).catch(() => undefined);
    if (existing?.ownerHash === owner) return json({ listing: toPublic(existing, owner, true) });
    console.error("POST /api/listings failed", err);
    return json({ error: "Не вдалося зберегти оголошення. Спробуйте ще раз без частини фото." }, { status: 500 });
  }
}
