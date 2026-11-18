import "server-only";

import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import postgres from "postgres";
import { isValidPhone, makeId } from "@/lib/market";
import type { SignalKind, TasteSignal } from "@/lib/rank";

const scrypt = promisify(scryptCb);

export interface PublicUser {
  id: string;
  name: string;
  phone: string;
  admin: boolean;
}

interface UserRow {
  id: string;
  name: string;
  phone: string;
  role?: "user" | "admin";
  passwordHash: string;
  createdAt: number;
}

interface SessionRow {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

interface LikeRow {
  viewerKey: string;
  listingId: string;
  createdAt: number;
}

interface SignalRow extends TasteSignal {
  viewerKey: string;
}

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE = "pp_session";

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function toPublicUser(user: UserRow): PublicUser {
  return { id: user.id, name: user.name, phone: user.phone, admin: user.role === "admin" };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algo, salt, hex] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hex) return false;
  const hash = (await scrypt(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_MS / 1000}; SameSite=Lax${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function readCookie(request: Request, name: string) {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

interface AccountStore {
  findUserByPhone(phone: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  createUser(user: UserRow): Promise<"ok" | "taken">;
  createSession(session: SessionRow): Promise<void>;
  getSession(tokenHash: string): Promise<SessionRow | null>;
  deleteSession(tokenHash: string): Promise<void>;
  likedIds(viewerKey: string): Promise<Set<string>>;
  likeCounts(ids: string[]): Promise<Map<string, number>>;
  toggleLike(viewerKey: string, listingId: string): Promise<boolean>;
  addSignal(signal: SignalRow): Promise<void>;
  signalsFor(viewerKey: string): Promise<TasteSignal[]>;
  mergeViewer(fromKey: string, toKey: string): Promise<void>;
  upsertAdmin(user: UserRow): Promise<void>;
}

function fileAccountStore(): AccountStore {
  const dir = process.env.VERCEL ? "/tmp/postinpulse" : path.join(process.cwd(), ".data");
  const file = path.join(dir, "accounts.json");
  type Data = { users: UserRow[]; sessions: SessionRow[]; likes: LikeRow[]; signals: SignalRow[] };
  const empty = (): Data => ({ users: [], sessions: [], likes: [], signals: [] });
  let cache: Data | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<Data> {
    if (cache) return cache;
    let data: Data;
    try {
      const parsed = JSON.parse(await fs.readFile(file, "utf8")) as Partial<Data>;
      data = { ...empty(), ...parsed };
    } catch {
      data = empty();
    }
    cache = data;
    return data;
  }

  function write(mutate: (data: Data) => void) {
    const run = queue.then(async () => {
      const data = await read();
      mutate(data);
      cache = data;
      await fs.mkdir(dir, { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data));
      await fs.rename(tmp, file);
    });
    queue = run.catch(() => {});
    return run;
  }

  return {
    async findUserByPhone(phone) {
      return (await read()).users.find((u) => u.phone === phone) ?? null;
    },
    async findUserById(id) {
      return (await read()).users.find((u) => u.id === id) ?? null;
    },
    async createUser(user) {
      let result: "ok" | "taken" = "ok";
      await write((data) => {
        if (data.users.some((u) => u.phone === user.phone)) result = "taken";
        else data.users.push(user);
      });
      return result;
    },
    createSession: (session) => write((data) => data.sessions.push(session)),
    async getSession(tokenHash) {
      const session = (await read()).sessions.find((s) => s.tokenHash === tokenHash);
      if (!session || session.expiresAt < Date.now()) return null;
      return session;
    },
    deleteSession: (tokenHash) => write((data) => {
      data.sessions = data.sessions.filter((s) => s.tokenHash !== tokenHash);
    }),
    async likedIds(viewerKey) {
      return new Set((await read()).likes.filter((l) => l.viewerKey === viewerKey).map((l) => l.listingId));
    },
    async likeCounts(ids) {
      const wanted = new Set(ids);
      const counts = new Map<string, number>();
      for (const like of (await read()).likes) {
        if (wanted.has(like.listingId)) counts.set(like.listingId, (counts.get(like.listingId) ?? 0) + 1);
      }
      return counts;
    },
    async toggleLike(viewerKey, listingId) {
      let liked = false;
      await write((data) => {
        const index = data.likes.findIndex((l) => l.viewerKey === viewerKey && l.listingId === listingId);
        if (index >= 0) data.likes.splice(index, 1);
        else {
          data.likes.push({ viewerKey, listingId, createdAt: Date.now() });
          liked = true;
        }
      });
      return liked;
    },
    addSignal: (signal) =>
      write((data) => {
        data.signals.push(signal);
        const own = data.signals.filter((s) => s.viewerKey === signal.viewerKey);
        if (own.length > 400) {
          const keep = new Set(own.slice(-300));
          data.signals = data.signals.filter((s) => s.viewerKey !== signal.viewerKey || keep.has(s));
        }
      }),
    async signalsFor(viewerKey) {
      return (await read()).signals.filter((s) => s.viewerKey === viewerKey).slice(-300);
    },
    mergeViewer: (fromKey, toKey) =>
      write((data) => {
        if (!fromKey || fromKey === toKey) return;
        for (const like of data.likes) {
          if (like.viewerKey !== fromKey) continue;
          if (data.likes.some((l) => l.viewerKey === toKey && l.listingId === like.listingId)) continue;
          like.viewerKey = toKey;
        }
        data.likes = data.likes.filter((l) => l.viewerKey !== fromKey);
        for (const signal of data.signals) if (signal.viewerKey === fromKey) signal.viewerKey = toKey;
      }),
    async upsertAdmin(user) {
      await write((data) => {
        for (const existing of data.users) {
          if (existing.phone !== user.phone && existing.role === "admin") existing.role = "user";
        }
        const existing = data.users.find((u) => u.phone === user.phone);
        if (existing) {
          existing.role = "admin";
          existing.passwordHash = user.passwordHash;
          existing.name = user.name;
        } else data.users.push({ ...user, role: "admin" });
      });
    },
  };
}

function postgresAccountStore(url: string): AccountStore {
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  let ready: Promise<unknown> | undefined;
  const init = () =>
    (ready ??= (async () => {
      await sql`
        create table if not exists users (
          id text primary key,
          phone text unique not null,
          name text not null,
          password_hash text not null,
          created_at bigint not null
        )
      `;
      await sql`
        create table if not exists sessions (
          token_hash text primary key,
          user_id text not null,
          expires_at bigint not null
        )
      `;
      await sql`
        create table if not exists likes (
          viewer_key text not null,
          listing_id text not null,
          created_at bigint not null,
          primary key (viewer_key, listing_id)
        )
      `;
      await sql`
        create table if not exists signals (
          id bigserial primary key,
          viewer_key text not null,
          listing_id text not null,
          kind text not null,
          category text,
          city text,
          price integer,
          created_at bigint not null
        )
      `;
      await sql`create index if not exists signals_viewer_idx on signals (viewer_key, created_at desc)`;
      await sql`alter table users add column if not exists role text not null default 'user'`;
    })().catch((err) => {
      ready = undefined;
      throw err;
    }));

  type UserSql = { id: string; phone: string; name: string; password_hash: string; created_at: string; role?: string };
  const toUser = (r: UserSql): UserRow => ({
    id: r.id,
    phone: r.phone,
    name: r.name,
    passwordHash: r.password_hash,
    createdAt: Number(r.created_at),
    role: r.role === "admin" ? "admin" : "user",
  });

  return {
    async findUserByPhone(phone) {
      await init();
      const [row] = await sql<UserSql[]>`select * from users where phone = ${phone}`;
      return row ? toUser(row) : null;
    },
    async findUserById(id) {
      await init();
      const [row] = await sql<UserSql[]>`select * from users where id = ${id}`;
      return row ? toUser(row) : null;
    },
    async createUser(user) {
      await init();
      try {
        await sql`
          insert into users (id, phone, name, password_hash, created_at, role)
          values (${user.id}, ${user.phone}, ${user.name}, ${user.passwordHash}, ${user.createdAt}, ${user.role === "admin" ? "admin" : "user"})
        `;
        return "ok";
      } catch (err) {
        if (typeof err === "object" && err && "code" in err && err.code === "23505") return "taken";
        throw err;
      }
    },
    async createSession(session) {
      await init();
      await sql`
        insert into sessions (token_hash, user_id, expires_at)
        values (${session.tokenHash}, ${session.userId}, ${session.expiresAt})
      `;
    },
    async getSession(tokenHash) {
      await init();
      const [row] = await sql<{ token_hash: string; user_id: string; expires_at: string }[]>`
        select * from sessions where token_hash = ${tokenHash}
      `;
      if (!row || Number(row.expires_at) < Date.now()) return null;
      return { tokenHash: row.token_hash, userId: row.user_id, expiresAt: Number(row.expires_at) };
    },
    async deleteSession(tokenHash) {
      await init();
      await sql`delete from sessions where token_hash = ${tokenHash}`;
    },
    async likedIds(viewerKey) {
      await init();
      const rows = await sql<{ listing_id: string }[]>`select listing_id from likes where viewer_key = ${viewerKey}`;
      return new Set(rows.map((r) => r.listing_id));
    },
    async likeCounts(ids) {
      await init();
      const counts = new Map<string, number>();
      if (!ids.length) return counts;
      const rows = await sql<{ listing_id: string; n: number }[]>`
        select listing_id, count(*)::int as n from likes
        where listing_id in ${sql(ids)} group by listing_id
      `;
      for (const row of rows) counts.set(row.listing_id, row.n);
      return counts;
    },
    async toggleLike(viewerKey, listingId) {
      await init();
      const removed = await sql`
        delete from likes where viewer_key = ${viewerKey} and listing_id = ${listingId}
      `;
      if (removed.count > 0) return false;
      await sql`
        insert into likes (viewer_key, listing_id, created_at)
        values (${viewerKey}, ${listingId}, ${Date.now()})
        on conflict do nothing
      `;
      return true;
    },
    async addSignal(signal) {
      await init();
      await sql`
        insert into signals (viewer_key, listing_id, kind, category, city, price, created_at)
        values (${signal.viewerKey}, ${signal.listingId}, ${signal.kind}, ${signal.category ?? null}, ${signal.city ?? null}, ${signal.price ?? null}, ${signal.createdAt})
      `;
      await sql`
        delete from signals where id in (
          select id from (
            select id from signals
            where viewer_key = ${signal.viewerKey}
            order by created_at desc
            offset 300
          ) older
        )
      `;
    },
    async signalsFor(viewerKey) {
      await init();
      const rows = await sql<
        { listing_id: string; kind: SignalKind; category: string | null; city: string | null; price: number | null; created_at: string }[]
      >`
        select listing_id, kind, category, city, price, created_at from signals
        where viewer_key = ${viewerKey} order by created_at asc limit 300
      `;
      return rows.map((r) => ({
        listingId: r.listing_id,
        kind: r.kind,
        category: r.category ?? undefined,
        city: r.city ?? undefined,
        price: r.price ?? undefined,
        createdAt: Number(r.created_at),
      }));
    },
    async mergeViewer(fromKey, toKey) {
      await init();
      if (!fromKey || fromKey === toKey) return;
      await sql`
        insert into likes (viewer_key, listing_id, created_at)
        select ${toKey}, listing_id, created_at from likes where viewer_key = ${fromKey}
        on conflict do nothing
      `;
      await sql`delete from likes where viewer_key = ${fromKey}`;
      await sql`update signals set viewer_key = ${toKey} where viewer_key = ${fromKey}`;
    },
    async upsertAdmin(user) {
      await init();
      await sql`update users set role = 'user' where role = 'admin' and phone <> ${user.phone}`;
      await sql`
        insert into users (id, phone, name, password_hash, created_at, role)
        values (${user.id}, ${user.phone}, ${user.name}, ${user.passwordHash}, ${user.createdAt}, 'admin')
        on conflict (phone) do update set
          role = 'admin',
          password_hash = excluded.password_hash,
          name = excluded.name
      `;
    },
  };
}

const globalAccounts = globalThis as unknown as { __accountStoreV2?: AccountStore };
const accounts = (globalAccounts.__accountStoreV2 ??= process.env.DATABASE_URL
  ? postgresAccountStore(process.env.DATABASE_URL)
  : fileAccountStore());

let ensuring: Promise<void> | null = null;

/** Creates or refreshes the operator account from ADMIN_PHONE and ADMIN_PASSWORD. */
export function ensureAdmin() {
  ensuring ??= (async () => {
    const phone = normalizePhone(process.env.ADMIN_PHONE ?? "");
    const password = process.env.ADMIN_PASSWORD ?? "";
    if (!isValidPhone(phone) || password.length < 6 || password.length > 72) return;
    await accounts.upsertAdmin({
      id: `admin:${phone}`,
      phone,
      name: "Адмін",
      passwordHash: await hashPassword(password),
      createdAt: Date.now(),
      role: "admin",
    });
  })().catch((err) => {
    ensuring = null;
    console.error("ensureAdmin failed", err);
  });
  return ensuring;
}

export function validateNewAccount(input: { name?: unknown; phone?: unknown; password?: unknown }) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 40) : "";
  const phone = normalizePhone(typeof input.phone === "string" ? input.phone : "");
  const password = typeof input.password === "string" ? input.password : "";
  if (name.length < 2) return { ok: false as const, error: "Як до вас звертатися?" };
  if (!isValidPhone(phone)) return { ok: false as const, error: "Вкажіть номер телефону" };
  if (password.length < 6) return { ok: false as const, error: "Пароль — щонайменше 6 символів" };
  if (password.length > 72) return { ok: false as const, error: "Пароль занадто довгий" };
  return { ok: true as const, name, phone, password };
}

export async function registerAccount(input: { name: string; phone: string; password: string }) {
  await ensureAdmin();
  const created = await accounts.createUser({
    id: makeId(),
    name: input.name,
    phone: input.phone,
    role: "user",
    passwordHash: await hashPassword(input.password),
    createdAt: Date.now(),
  });
  if (created === "taken") return { ok: false as const, error: "Цей номер уже зареєстрований. Увійдіть." };
  const user = await accounts.findUserByPhone(input.phone);
  if (!user) throw new Error("user missing after insert");
  const token = await openSession(user.id);
  return { ok: true as const, user: toPublicUser(user), token };
}

export async function loginAccount(phone: string, password: string) {
  await ensureAdmin();
  const user = await accounts.findUserByPhone(normalizePhone(phone));
  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "scrypt$00$00");
  if (!user || !valid) return { ok: false as const, error: "Невірний номер або пароль" };
  const token = await openSession(user.id);
  return { ok: true as const, user: toPublicUser(user), token };
}

async function openSession(userId: string) {
  const token = newSessionToken();
  await accounts.createSession({ tokenHash: hashToken(token), userId, expiresAt: Date.now() + SESSION_MS });
  return token;
}

export async function logoutAccount(token: string | null) {
  if (token) await accounts.deleteSession(hashToken(token));
}

export async function userFromRequest(request: Request): Promise<PublicUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const session = await accounts.getSession(hashToken(token));
  if (!session) return null;
  const user = await accounts.findUserById(session.userId);
  return user ? toPublicUser(user) : null;
}

export const likedIds = (viewerKey: string) => accounts.likedIds(viewerKey);
export const likeCounts = (ids: string[]) => accounts.likeCounts(ids);
export const toggleLike = (viewerKey: string, listingId: string) => accounts.toggleLike(viewerKey, listingId);
export const signalsFor = (viewerKey: string) => accounts.signalsFor(viewerKey);
export const mergeViewer = (fromKey: string, toKey: string) => accounts.mergeViewer(fromKey, toKey);

export async function addSignal(viewerKey: string, signal: TasteSignal) {
  await accounts.addSignal({ ...signal, viewerKey });
}
