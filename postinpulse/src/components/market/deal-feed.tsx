"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bookmark, ChevronUp, Heart, Loader2, MapPin, Share2, WifiOff } from "lucide-react";
import { BidDialog } from "./bid-panel";
import { ContactMenu } from "./contact-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatPrice, type Listing } from "@/lib/market";
import { ownerHeaders } from "@/lib/owner-token";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ListingImage } from "./listing-image";
import { Logo } from "./logo";

interface Deal extends Listing {
  reason: string;
  liked: boolean;
  likeCount: number;
}

async function postJson<T>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ownerHeaders() },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export function DealFeed() {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useMarket();
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [personalized, setPersonalized] = useState(false);
  const [failed, setFailed] = useState(false);
  const [learned, setLearned] = useState(false);
  const likesSinceLoad = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch("/api/feed", { cache: "no-store", headers: ownerHeaders() });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { deals: Deal[]; personalized: boolean };
      setDeals(data.deals);
      setPersonalized(data.personalized);
      likesSinceLoad.current = 0;
      setLearned(false);
    } catch {
      setFailed(true);
      setDeals((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      document.body.style.overflow = previous;
      window.clearTimeout(timer);
    };
  }, [load]);

  function signal(listingId: string, kind: "skip" | "dwell" | "favorite" | "unfavorite") {
    void postJson("/api/feed/signal", { listingId, kind });
  }

  async function like(deal: Deal) {
    if (!user) {
      router.push("/login?next=/feed");
      return;
    }
    const nextLiked = !deal.liked;
    setDeals((prev) =>
      prev?.map((d) =>
        d.id === deal.id ? { ...d, liked: nextLiked, likeCount: d.likeCount + (nextLiked ? 1 : -1) } : d,
      ) ?? null,
    );
    const result = await postJson<{ liked: boolean; likeCount: number; login?: boolean }>("/api/feed/like", {
      listingId: deal.id,
    });
    if (!result.ok) {
      setDeals((prev) => prev?.map((d) => (d.id === deal.id ? deal : d)) ?? null);
      if (result.status === 401) router.push("/login?next=/feed");
      else toast.warning("Не вдалося зберегти лайк");
      return;
    }
    setDeals((prev) =>
      prev?.map((d) => (d.id === deal.id ? { ...d, liked: result.data.liked, likeCount: result.data.likeCount } : d)) ??
      null,
    );
    if (result.data.liked) {
      likesSinceLoad.current += 1;
      if (likesSinceLoad.current >= 2) setLearned(true);
    }
  }

  if (!deals) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-black text-white">
        <Logo tone="dark" stacked />
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (failed && deals.length === 0) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white">
        <Logo tone="dark" stacked className="mb-4" />
        <WifiOff className="size-8" />
        <p>Не вдалося відкрити стрічку</p>
        <Button onClick={() => void load()}>Спробувати ще раз</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
        <div className="pointer-events-auto">
          <p className="text-lg font-extrabold tracking-tight">Для тебе</p>
          <p className="text-xs text-white/70">
            {personalized ? "Підібрано за тим, що ви лайкаєте й дивитеся" : "Гортайте — стрічка вивчить ваш смак"}
          </p>
        </div>
        <Logo tone="dark" compact className="pointer-events-auto" />
      </div>

      {learned && (
        <button
          type="button"
          onClick={() => {
            scroller.current?.scrollTo({ top: 0 });
            void load();
          }}
          className="absolute top-16 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black shadow-lg"
        >
          Оновити стрічку під вас
        </button>
      )}

      <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-scroll">
        {deals.length === 0 ? (
          <section className="flex h-dvh snap-start flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
            <p className="text-xl font-bold">Поки немає угод</p>
            <p className="max-w-xs text-sm text-white/70">Демо-оголошення прибрано. Перше живе оголошення зʼявиться тут.</p>
            <Button render={<Link href="/sell" />} nativeButton={false} variant="secondary">
              Подати оголошення
            </Button>
          </section>
        ) : (
          deals.map((deal, index) => (
            <DealSlide
              key={deal.id}
              deal={deal}
              hint={index === 0}
              saved={isFavorite(deal.id)}
              onSeen={(ms) => signal(deal.id, ms < 900 ? "skip" : "dwell")}
              onLike={() => void like(deal)}
              onSave={() => {
                const saved = isFavorite(deal.id);
                toggleFavorite(deal.id);
                signal(deal.id, saved ? "unfavorite" : "favorite");
              }}
            />
          ))
        )}
        {deals.length > 0 && (
        <section className="flex h-dvh snap-start flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
          <p className="text-xl font-bold">Поки що це все</p>
          <p className="max-w-xs text-sm text-white/70">
            Лайки й довгі перегляди змінюють порядок. Зайдіть пізніше — зʼявляться свіжі угоди.
          </p>
          <Button variant="secondary" onClick={() => void load()}>
            Оновити
          </Button>
          <Link href="/catalog" className="text-sm text-white/70 underline">
            Відкрити каталог
          </Link>
        </section>
        )}
      </div>
    </div>
  );
}

function DealSlide({
  deal,
  hint,
  saved,
  onSeen,
  onLike,
  onSave,
}: {
  deal: Deal;
  hint: boolean;
  saved: boolean;
  onSeen: (ms: number) => void;
  onLike: () => void;
  onSave: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const entered = useRef(0);
  const reported = useRef(false);
  const onSeenRef = useRef(onSeen);
  useEffect(() => {
    onSeenRef.current = onSeen;
  }, [onSeen]);
  const lastTap = useRef(0);
  const [burst, setBurst] = useState(false);
  const [photo, setPhoto] = useState(0);
  const photos = Math.max(deal.images.length, deal.imageCount ?? 1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
          entered.current = Date.now();
          reported.current = false;
        } else if (entered.current && !reported.current) {
          reported.current = true;
          const ms = Date.now() - entered.current;
          entered.current = 0;
          if (ms > 250) onSeenRef.current(ms);
        }
      },
      { threshold: [0.75] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [deal.id]);

  function tap(e: React.MouseEvent<HTMLDivElement>) {
    const width = e.currentTarget.clientWidth;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    if (photos > 1 && (x < width * 0.22 || x > width * 0.78)) {
      setPhoto((p) => (x < width * 0.22 ? (p + photos - 1) % photos : (p + 1) % photos));
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!deal.liked) onLike();
      setBurst(true);
      window.setTimeout(() => setBurst(false), 700);
    }
    lastTap.current = now;
  }

  async function share() {
    const url = `${location.origin}/listing/${deal.id}`;
    try {
      if (navigator.share) await navigator.share({ title: deal.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Посилання скопійовано");
      }
    } catch {
      // The share sheet was closed.
    }
  }

  return (
    <section ref={ref} className="relative h-dvh snap-start">
      <div className="absolute inset-0" onClick={tap}>
        <ListingImage
          listing={deal}
          index={deal.images.length ? Math.min(photo, deal.images.length - 1) : 0}
          iconClassName="size-24 text-white/80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/30" />
        {burst && <Heart className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-lg" />}
      </div>

      {photos > 1 && (
        <div className="absolute inset-x-4 top-[max(4.5rem,env(safe-area-inset-top))] z-10 flex gap-1">
          {Array.from({ length: photos }, (_, i) => (
            <span key={i} className={cn("h-0.5 flex-1 rounded-full", i === photo ? "bg-white" : "bg-white/35")} />
          ))}
        </div>
      )}

      <div className="absolute right-3 bottom-36 z-10 flex flex-col items-center gap-4 md:bottom-16">
        <Round label={deal.liked ? "Прибрати лайк" : "Подобається"} onClick={onLike}>
          <Heart className={cn("size-7", deal.liked && "fill-rose-500 text-rose-500")} />
          <span className="text-[11px] font-semibold">{deal.likeCount}</span>
        </Round>
        {!deal.mine && (
          <>
            <ContactMenu listing={deal} label="Звʼязатися" feed />
            <BidDialog listingId={deal.id} asking={deal.price} mine={deal.mine} />
          </>
        )}
        <Round label={saved ? "Прибрати із збереженого" : "Зберегти"} onClick={onSave}>
          <Bookmark className={cn("size-7", saved && "fill-amber-300 text-amber-300")} />
        </Round>
        <Round label="Поділитися" onClick={() => void share()}>
          <Share2 className="size-6" />
        </Round>
      </div>

      <div className="absolute inset-x-0 bottom-20 z-10 min-w-0 px-4 pr-20 md:bottom-6">
        <p className="mb-2 inline-flex max-w-full rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium break-words backdrop-blur">{deal.reason}</p>
        <p className="text-3xl font-extrabold tracking-tight break-words">{formatPrice(deal.price)}</p>
        <Link href={`/listing/${deal.id}`} className="mt-1 block text-base leading-snug font-semibold break-words hover:underline">
          {deal.title}
        </Link>
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1 text-sm text-white/80">
          <MapPin className="size-3.5" />
          {deal.city}
          <span aria-hidden>·</span>
          {deal.seller.name}
        </p>
        {hint && (
          <p className="mt-3 flex items-center gap-1 text-xs text-white/70">
            <ChevronUp className="size-4 animate-bounce" />
            Гортайте вгору. Подвійний дотик — лайк.
          </p>
        )}
      </div>
    </section>
  );
}

function Round({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex flex-col items-center gap-0.5 text-white drop-shadow">
      {children}
    </button>
  );
}
