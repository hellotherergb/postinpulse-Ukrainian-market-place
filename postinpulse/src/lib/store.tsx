"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { type DeliveryId, type Listing } from "@/lib/market";
import { ownerToken } from "@/lib/owner-token";

const STORAGE_KEY = "postinpulse:v1";
const LEGACY_STORAGE_KEY = "postingtools:v1";
const POLL_MS = 8000;

export interface Order {
  id: string;
  listingId: string;
  title: string;
  price: number;
  delivery: DeliveryId;
  city: string;
  branch: string;
  buyerName: string;
  createdAt: number;
}

export interface NewListing {
  title: string;
  description: string;
  price: number;
  negotiable: boolean;
  category: Listing["category"];
  city: string;
  condition: Listing["condition"];
  delivery: DeliveryId[];
  images: string[];
  sellerName: string;
  phone: string;
  /** Stable per submission so retries never create duplicates. */
  clientKey: string;
}

interface Persisted {
  favorites: string[];
  orders: Order[];
  /** Listings created before the shared feed existed, still waiting to upload. */
  pendingUploads: Listing[];
}

export type FeedStatus = "loading" | "live" | "offline";

interface MarketContextValue extends Persisted {
  ready: boolean;
  status: FeedStatus;
  listings: Listing[];
  myListings: Listing[];
  getListing: (id: string) => Listing | undefined;
  fetchListing: (id: string) => Promise<Listing | null>;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  addListing: (listing: NewListing) => Promise<Listing>;
  removeListing: (id: string) => Promise<void>;
  recordView: (id: string) => void;
  placeOrder: (order: Order) => void;
  refresh: () => Promise<void>;
}

const MarketContext = createContext<MarketContextValue | null>(null);

const empty: Persisted = { favorites: [], orders: [], pendingUploads: [] };

const validListings = (v: unknown) =>
  Array.isArray(v) ? (v as Listing[]).filter((l) => l && typeof l.id === "string" && typeof l.title === "string") : [];

function readLocal(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return empty;
    const data = JSON.parse(raw) as Partial<Persisted> & { myListings?: Listing[] };
    return {
      favorites: Array.isArray(data.favorites) ? data.favorites.filter((f) => typeof f === "string") : [],
      orders: Array.isArray(data.orders) ? data.orders.filter((o) => o && typeof o.id === "string") : [],
      pendingUploads: [...validListings(data.pendingUploads), ...validListings(data.myListings)],
    };
  } catch {
    return empty;
  }
}

function writeLocal(state: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode or full); keep in-memory state.
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", "x-owner-token": ownerToken(), ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Сервіс тимчасово недоступний");
  return body as T;
}

const toNewListing = (l: Listing): NewListing => ({
  title: l.title,
  description: l.description,
  price: l.price,
  negotiable: l.negotiable,
  category: l.category,
  city: l.city,
  condition: l.condition,
  delivery: l.delivery,
  images: l.images,
  sellerName: l.seller.name,
  phone: l.seller.phone,
  clientKey: `legacy:${l.id}`,
});

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<Persisted>(empty);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [feed, setFeed] = useState<Listing[]>([]);
  const [details, setDetails] = useState<Record<string, Listing>>({});
  const [status, setStatus] = useState<FeedStatus>("loading");
  const inflight = useRef<Promise<void> | null>(null);
  const feedEtag = useRef<string | null>(null);
  const viewed = useRef(new Set<string>());

  const refresh = useCallback(() => {
    inflight.current ??= fetch("/api/listings", {
      cache: "no-store",
      headers: {
        "x-owner-token": ownerToken(),
        ...(feedEtag.current && { "If-None-Match": feedEtag.current }),
      },
    })
      .then(async (res) => {
        if (res.status === 304) return setStatus("live");
        if (!res.ok) throw new Error(String(res.status));
        const { listings } = (await res.json()) as { listings: Listing[] };
        feedEtag.current = res.headers.get("ETag");
        setFeed(listings);
        setStatus("live");
      })
      .catch(() => setStatus("offline"))
      .finally(() => {
        inflight.current = null;
      });
    return inflight.current;
  }, []);

  useEffect(() => {
    const persisted = readLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage after mount
    setLocal(persisted);
    setLocalLoaded(true);

    (async () => {
      const stillPending: Listing[] = [];
      for (const l of persisted.pendingUploads) {
        try {
          await api("/api/listings", { method: "POST", body: JSON.stringify(toNewListing(l)) });
        } catch (err) {
          // Network failures retry on the next visit; listings the server rejects are dropped.
          if (err instanceof TypeError) stillPending.push(l);
        }
      }
      if (persisted.pendingUploads.length) setLocal((s) => ({ ...s, pendingUploads: stillPending }));
      void refresh();
    })();
  }, [refresh]);

  useEffect(() => {
    if (localLoaded) writeLocal(local);
  }, [local, localLoaded]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", tick);
      window.removeEventListener("focus", tick);
    };
  }, [refresh]);

  const listings = useMemo(
    () => feed.map((l) => (details[l.id] ? { ...details[l.id], views: l.views } : l)),
    [feed, details],
  );
  const myListings = useMemo(() => listings.filter((l) => l.mine), [listings]);

  const getListing = useCallback(
    (id: string) => listings.find((l) => l.id === id) ?? details[id],
    [listings, details],
  );

  const fetchListing = useCallback(async (id: string) => {
    try {
      const { listing } = await api<{ listing: Listing }>(`/api/listings/${encodeURIComponent(id)}`);
      setDetails((d) => ({ ...d, [id]: listing }));
      return listing;
    } catch {
      return null;
    }
  }, []);

  const isFavorite = useCallback((id: string) => local.favorites.includes(id), [local.favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setLocal((s) => ({
      ...s,
      favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [id, ...s.favorites],
    }));
  }, []);

  const addListing = useCallback(
    async (input: NewListing) => {
      const { listing } = await api<{ listing: Listing }>("/api/listings", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setDetails((d) => ({ ...d, [listing.id]: listing }));
      setFeed((f) => [listing, ...f.filter((l) => l.id !== listing.id)]);
      feedEtag.current = null;
      void refresh();
      return listing;
    },
    [refresh],
  );

  const removeListing = useCallback(
    async (id: string) => {
      await api(`/api/listings/${encodeURIComponent(id)}`, { method: "DELETE" });
      setFeed((f) => f.filter((l) => l.id !== id));
      feedEtag.current = null;
      setLocal((s) => ({ ...s, favorites: s.favorites.filter((f) => f !== id) }));
      void refresh();
    },
    [refresh],
  );

  const recordView = useCallback((id: string) => {
    if (viewed.current.has(id)) return;
    viewed.current.add(id);
    void api(`/api/listings/${encodeURIComponent(id)}/view`, { method: "POST" }).catch(() => {});
  }, []);

  const placeOrder = useCallback((order: Order) => {
    setLocal((s) => ({ ...s, orders: [order, ...s.orders] }));
  }, []);

  const ready = localLoaded && status !== "loading";

  const value = useMemo(
    () => ({
      ...local,
      ready,
      status,
      listings,
      myListings,
      getListing,
      fetchListing,
      isFavorite,
      toggleFavorite,
      addListing,
      removeListing,
      recordView,
      placeOrder,
      refresh,
    }),
    [
      local,
      ready,
      status,
      listings,
      myListings,
      getListing,
      fetchListing,
      isFavorite,
      toggleFavorite,
      addListing,
      removeListing,
      recordView,
      placeOrder,
      refresh,
    ],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

const noopSubscribe = () => () => {};

// Suspense boundaries can hydrate after the provider has loaded data, so each consumer
// must keep rendering the server (empty) state until it has hydrated itself.
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used inside <MarketProvider>");
  const hydrated = useHydrated();
  return useMemo(() => ({ ...ctx, ready: ctx.ready && hydrated }), [ctx, hydrated]);
}
