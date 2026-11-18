import "server-only";

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { SEED_LISTINGS, type Listing } from "@/lib/market";

export interface StoredListing extends Omit<Listing, "mine"> {
  ownerHash: string;
}

/** Feed rows: photo data is omitted and only `imageCount` is set. */
export type ListingSummary = StoredListing;

interface ListingStore {
  all(): Promise<ListingSummary[]>;
  get(id: string): Promise<StoredListing | undefined>;
  create(listing: StoredListing): Promise<void>;
  remove(id: string, ownerHash: string): Promise<boolean>;
  removeAny(id: string): Promise<boolean>;
  removeIds(ids: string[]): Promise<void>;
  addView(id: string): Promise<void>;
}

export const hashOwner = (token: string) => createHash("sha256").update(token).digest("hex");

const showSamples = process.env.SHOW_SAMPLE_LISTINGS === "true";
const samples: StoredListing[] = SEED_LISTINGS.map((l) => ({ ...l, ownerHash: "" }));
const sampleViews = new Map<string, number>();

function postgresStore(url: string): ListingStore {
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  let ready: Promise<unknown> | undefined;
  const init = () =>
    (ready ??= sql`
      create table if not exists listings (
        id text primary key,
        owner_hash text not null,
        created_at bigint not null,
        views integer not null default 0,
        data jsonb not null
      )
    `.catch((err) => {
      ready = undefined;
      throw err;
    }));

  type Row = { owner_hash: string; created_at: string; views: number; data: Listing; image_count?: number };
  const fromRow = (r: Row): StoredListing => ({
    ...r.data,
    ownerHash: r.owner_hash,
    createdAt: Number(r.created_at),
    views: r.views,
    ...(r.image_count !== undefined && { images: [], imageCount: r.image_count }),
  });

  return {
    async all() {
      await init();
      const rows = await sql<Row[]>`
        select owner_hash, created_at, views, data - 'images' as data,
               coalesce(jsonb_array_length(data -> 'images'), 0)::int as image_count
        from listings order by created_at desc limit 500
      `;
      return rows.map(fromRow);
    },
    async get(id) {
      await init();
      const [row] = await sql<Row[]>`select owner_hash, created_at, views, data from listings where id = ${id}`;
      return row && fromRow(row);
    },
    async create({ ownerHash, ...listing }) {
      await init();
      await sql`
        insert into listings (id, owner_hash, created_at, views, data)
        values (${listing.id}, ${ownerHash}, ${listing.createdAt}, 0, ${sql.json(JSON.parse(JSON.stringify(listing)))})
      `;
    },
    async remove(id, ownerHash) {
      await init();
      const res = await sql`delete from listings where id = ${id} and owner_hash = ${ownerHash}`;
      return res.count > 0;
    },
    async removeAny(id) {
      await init();
      const res = await sql`delete from listings where id = ${id}`;
      return res.count > 0;
    },
    async removeIds(ids) {
      await init();
      if (!ids.length) return;
      await sql`delete from listings where id in ${sql(ids)}`;
    },
    async addView(id) {
      await init();
      await sql`update listings set views = views + 1 where id = ${id}`;
    },
  };
}

// Local fallback for development and single-server hosting. On serverless hosts the
// filesystem is ephemeral, so production deployments should set DATABASE_URL.
function fileStore(): ListingStore {
  const dir = process.env.VERCEL ? "/tmp/postinpulse" : path.join(process.cwd(), ".data");
  const file = path.join(dir, "listings.json");
  let cache: StoredListing[] | undefined;
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

  function write(mutate: (items: StoredListing[]) => StoredListing[]) {
    const run = queue.then(async () => {
      const next = mutate(await read());
      cache = next;
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(next));
      await fs.rename(tmp, file);
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    all: async () =>
      [...(await read())]
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((l) => ({ ...l, images: [], imageCount: l.images.length })),
    get: async (id) => (await read()).find((l) => l.id === id),
    create: (listing) => write((items) => [listing, ...items]),
    async remove(id, ownerHash) {
      let removed = false;
      await write((items) =>
        items.filter((l) => {
          const match = l.id === id && l.ownerHash === ownerHash;
          if (match) removed = true;
          return !match;
        }),
      );
      return removed;
    },
    async removeAny(id) {
      let removed = false;
      await write((items) =>
        items.filter((l) => {
          if (l.id === id) removed = true;
          return l.id !== id;
        }),
      );
      return removed;
    },
    removeIds: (ids) => {
      const drop = new Set(ids);
      return write((items) => items.filter((l) => !drop.has(l.id))).then(() => undefined);
    },
    addView: (id) => write((items) => items.map((l) => (l.id === id ? { ...l, views: l.views + 1 } : l))),
  };
}

const globalStore = globalThis as unknown as { __listingStoreV2?: ListingStore };
const store = (globalStore.__listingStoreV2 ??= process.env.DATABASE_URL
  ? postgresStore(process.env.DATABASE_URL)
  : fileStore());

const seedIds = SEED_LISTINGS.map((s) => s.id);
let purged: Promise<void> | undefined;
function purgeSeed() {
  purged ??= store.removeIds(seedIds).catch((err) => {
    purged = undefined;
    console.error("purge seed listings failed", err);
  });
  return purged;
}

export async function allListings() {
  await purgeSeed();
  const real = await store.all();
  if (!showSamples) return real;
  const withViews = samples.map((s) => ({ ...s, views: s.views + (sampleViews.get(s.id) ?? 0) }));
  return [...real, ...withViews].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getListing(id: string) {
  await purgeSeed();
  const real = await store.get(id);
  if (real || !showSamples) return real;
  const sample = samples.find((s) => s.id === id);
  return sample && { ...sample, views: sample.views + (sampleViews.get(id) ?? 0) };
}

export async function createListing(listing: StoredListing) {
  if (await getListing(listing.id)) throw new Error("duplicate id");
  await store.create(listing);
}

export const removeListing = (id: string, ownerHash: string) => store.remove(id, ownerHash);
export const removeListingAny = (id: string) => store.removeAny(id);

export async function addView(id: string) {
  if (samples.some((s) => s.id === id)) {
    sampleViews.set(id, (sampleViews.get(id) ?? 0) + 1);
    return;
  }
  await store.addView(id);
}
