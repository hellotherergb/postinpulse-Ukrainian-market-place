import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { makeId } from "@/lib/market";

export interface Bid {
  id: string;
  listingId: string;
  bidderId: string;
  bidderName: string;
  bidderPhone: string;
  amount: number;
  createdAt: number;
  accepted: boolean;
}

export interface PlaceBidInput {
  listingId: string;
  bidderId: string;
  bidderName: string;
  bidderPhone: string;
  amount: number;
  asking: number;
}

export type PlaceBidResult = { ok: true; bid: Bid } | { ok: false; error: string; status: number };

interface BidStore {
  list(listingId: string): Promise<Bid[]>;
  forBidder(bidderId: string): Promise<Bid[]>;
  forListings(ids: string[]): Promise<Bid[]>;
  place(input: PlaceBidInput): Promise<PlaceBidResult>;
  accept(listingId: string, bidId: string): Promise<boolean>;
}

function sortBids(bids: Bid[]) {
  return [...bids].sort((a, b) => b.amount - a.amount || b.createdAt - a.createdAt);
}

function decide(rows: { amount: number; accepted: boolean }[], amount: number, asking: number) {
  if (rows.some((row) => row.accepted)) return { ok: false as const, error: "Продавець уже прийняв ставку", status: 409 };
  const high = rows.reduce((max, row) => Math.max(max, row.amount), 0);
  const min = high > 0 ? high + 1 : Math.max(asking, 1);
  if (!Number.isInteger(amount) || amount < min || amount > 999_999_999) {
    return { ok: false as const, error: `Мінімальна ставка — ${min.toLocaleString("uk-UA")} ₴`, status: 400 };
  }
  return { ok: true as const, min };
}

function fileBidStore(): BidStore {
  const dir = process.env.VERCEL ? "/tmp/postinpulse" : path.join(process.cwd(), ".data");
  const file = path.join(dir, "bids.json");
  let cache: Bid[] | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function read() {
    if (cache) return cache;
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8"));
      cache = Array.isArray(parsed) ? parsed : [];
    } catch {
      cache = [];
    }
    return cache;
  }

  function write(mutate: (items: Bid[]) => void) {
    const run = queue.then(async () => {
      const items = await read();
      mutate(items);
      cache = items;
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(items));
      await fs.rename(tmp, file);
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    async list(listingId) {
      return sortBids((await read()).filter((bid) => bid.listingId === listingId));
    },
    async forBidder(bidderId) {
      return sortBids((await read()).filter((bid) => bid.bidderId === bidderId));
    },
    async forListings(ids) {
      const wanted = new Set(ids);
      return sortBids((await read()).filter((bid) => wanted.has(bid.listingId)));
    },
    async place(input) {
      let result: PlaceBidResult = { ok: false, error: "Не вдалося зберегти ставку", status: 500 };
      await write((items) => {
        const rows = items.filter((bid) => bid.listingId === input.listingId);
        const decision = decide(rows, input.amount, input.asking);
        if (!decision.ok) {
          result = decision;
          return;
        }
        const bid: Bid = {
          id: makeId(),
          listingId: input.listingId,
          bidderId: input.bidderId,
          bidderName: input.bidderName,
          bidderPhone: input.bidderPhone,
          amount: input.amount,
          createdAt: Date.now(),
          accepted: false,
        };
        items.push(bid);
        result = { ok: true, bid };
      });
      return result;
    },
    async accept(listingId, bidId) {
      let found = false;
      await write((items) => {
        if (!items.some((bid) => bid.id === bidId && bid.listingId === listingId)) return;
        found = true;
        for (const bid of items) {
          if (bid.listingId === listingId) bid.accepted = bid.id === bidId;
        }
      });
      return found;
    },
  };
}

function postgresBidStore(url: string): BidStore {
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  let ready: Promise<unknown> | undefined;
  const init = () =>
    (ready ??= (async () => {
      await sql`
        create table if not exists bids (
          id text primary key,
          listing_id text not null,
          bidder_id text not null,
          bidder_name text not null,
          bidder_phone text not null,
          amount integer not null,
          created_at bigint not null,
          accepted boolean not null default false
        )
      `;
      await sql`create index if not exists bids_listing_idx on bids (listing_id, amount desc)`;
    })().catch((err) => {
      ready = undefined;
      throw err;
    }));

  type Row = {
    id: string;
    listing_id: string;
    bidder_id: string;
    bidder_name: string;
    bidder_phone: string;
    amount: number;
    created_at: string;
    accepted: boolean;
  };
  const toBid = (row: Row): Bid => ({
    id: row.id,
    listingId: row.listing_id,
    bidderId: row.bidder_id,
    bidderName: row.bidder_name,
    bidderPhone: row.bidder_phone,
    amount: row.amount,
    createdAt: Number(row.created_at),
    accepted: row.accepted,
  });

  return {
    async list(listingId) {
      await init();
      const rows = await sql<Row[]>`
        select * from bids where listing_id = ${listingId} order by amount desc, created_at desc
      `;
      return rows.map(toBid);
    },
    async forBidder(bidderId) {
      await init();
      const rows = await sql<Row[]>`
        select * from bids where bidder_id = ${bidderId} order by created_at desc
      `;
      return rows.map(toBid);
    },
    async forListings(ids) {
      await init();
      if (!ids.length) return [];
      const rows = await sql<Row[]>`
        select * from bids where listing_id in ${sql(ids)} order by amount desc, created_at desc
      `;
      return rows.map(toBid);
    },
    async place(input) {
      await init();
      return sql.begin(async (tx) => {
        const rows = await tx<{ amount: number; accepted: boolean }[]>`
          select amount, accepted from bids where listing_id = ${input.listingId}
        `;
        const decision = decide(rows, input.amount, input.asking);
        if (!decision.ok) return decision;
        const bid: Bid = {
          id: makeId(),
          listingId: input.listingId,
          bidderId: input.bidderId,
          bidderName: input.bidderName,
          bidderPhone: input.bidderPhone,
          amount: input.amount,
          createdAt: Date.now(),
          accepted: false,
        };
        await tx`
          insert into bids (id, listing_id, bidder_id, bidder_name, bidder_phone, amount, created_at, accepted)
          values (${bid.id}, ${bid.listingId}, ${bid.bidderId}, ${bid.bidderName}, ${bid.bidderPhone}, ${bid.amount}, ${bid.createdAt}, false)
        `;
        return { ok: true as const, bid };
      });
    },
    async accept(listingId, bidId) {
      await init();
      return sql.begin(async (tx) => {
        const [row] = await tx<{ id: string }[]>`
          select id from bids where id = ${bidId} and listing_id = ${listingId}
        `;
        if (!row) return false;
        await tx`update bids set accepted = false where listing_id = ${listingId}`;
        await tx`update bids set accepted = true where id = ${bidId}`;
        return true;
      });
    },
  };
}

const globalBids = globalThis as unknown as { __bidStore?: BidStore };
const bids = (globalBids.__bidStore ??= process.env.DATABASE_URL ? postgresBidStore(process.env.DATABASE_URL) : fileBidStore());

export const listBids = (listingId: string) => bids.list(listingId);
export const bidsForBidder = (bidderId: string) => bids.forBidder(bidderId);
export const bidsForListings = (ids: string[]) => bids.forListings(ids);
export const placeBid = (input: PlaceBidInput) => bids.place(input);
export const acceptBid = (listingId: string, bidId: string) => bids.accept(listingId, bidId);

export function presentBid(bid: Bid, viewer: { userId?: string | null; isSeller: boolean }) {
  const mine = Boolean(viewer.userId && viewer.userId === bid.bidderId);
  return {
    id: bid.id,
    amount: bid.amount,
    createdAt: bid.createdAt,
    bidderName: bid.bidderName,
    accepted: bid.accepted,
    mine,
    phone: viewer.isSeller || mine ? bid.bidderPhone : undefined,
  };
}

export function nextMinimum(asking: number, current: Bid[]) {
  const open = current.filter((bid) => !bid.accepted);
  if (current.some((bid) => bid.accepted)) return null;
  const high = open.reduce((max, bid) => Math.max(max, bid.amount), 0);
  return high > 0 ? high + 1 : Math.max(asking, 1);
}
