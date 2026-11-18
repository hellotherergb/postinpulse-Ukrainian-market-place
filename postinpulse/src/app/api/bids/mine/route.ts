import { bidsForBidder, bidsForListings, presentBid, type Bid } from "@/lib/server/bids";
import { json, viewer } from "@/lib/server/owner";
import { allListings } from "@/lib/server/store";

function isBailout(err: unknown) {
  return typeof err === "object" && err !== null && "digest" in err;
}

export async function GET(request: Request) {
  const { user, key } = await viewer(request);
  if (!user || !key) return json({ error: "Увійдіть, щоб бачити ставки", login: true }, { status: 401 });
  try {
    const listings = await allListings();
    const titles = new Map(listings.map((listing) => [listing.id, listing.title]));
    const withTitle = (bid: Bid, isSeller: boolean) => ({
      ...presentBid(bid, { userId: user.id, isSeller }),
      listingId: bid.listingId,
      listingTitle: titles.get(bid.listingId) ?? "Оголошення знято",
    });
    const placed = (await bidsForBidder(user.id)).map((bid) => withTitle(bid, false));
    const mineIds = listings.filter((listing) => listing.ownerHash === key).map((listing) => listing.id);
    const received = (await bidsForListings(mineIds)).map((bid) => withTitle(bid, true));
    return json({ placed, received });
  } catch (err) {
    if (isBailout(err)) throw err;
    console.error("GET /api/bids/mine failed", err);
    return json({ error: "Не вдалося завантажити ставки" }, { status: 503 });
  }
}
