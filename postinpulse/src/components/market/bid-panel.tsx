"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatAgo, formatPrice } from "@/lib/market";
import { ownerHeaders } from "@/lib/owner-token";
import { useAuth } from "@/lib/auth";

interface PublicBid {
  id: string;
  amount: number;
  createdAt: number;
  bidderName: string;
  accepted: boolean;
  mine: boolean;
  phone?: string;
}

interface BidState {
  asking: number;
  closed: boolean;
  minNext: number | null;
  canBid: boolean;
  bids: PublicBid[];
}

async function readBids(listingId: string) {
  const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}/bids`, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as BidState & { error?: string };
  if (!res.ok) throw new Error(data.error || "Не вдалося завантажити ставки");
  return data;
}

export function BidBox({ listingId, asking, mine }: { listingId: string; asking: number; mine?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const [state, setState] = useState<BidState | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    readBids(listingId).then(setState).catch(() => setState(null));
  }, [listingId]);

  useEffect(() => {
    load();
  }, [load]);

  const high = state?.bids[0];
  const floor = state?.minNext ?? Math.max(asking, 1);
  const loginHref = `/login?next=${encodeURIComponent(`/listing/${listingId}`)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ownerHeaders() },
        body: JSON.stringify({ amount: Number(amount.replace(/\s/g, "")) }),
      });
      const data = (await res.json().catch(() => ({}))) as BidState & { error?: string; login?: boolean };
      if (res.status === 401 && data.login) {
        router.push(loginHref);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Не вдалося зберегти ставку");
        return;
      }
      setState(data);
      setAmount("");
      toast.success("Ставку прийнято до торгів");
    } finally {
      setPending(false);
    }
  }

  async function accept(bidId: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(listingId)}/bids/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ownerHeaders() },
        body: JSON.stringify({ bidId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.warning(data.error || "Не вдалося прийняти ставку");
        return;
      }
      toast.success("Ставку прийнято");
      load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border bg-secondary/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Gavel className="size-4 text-primary" />
          Торги
        </p>
        <p className="text-sm text-muted-foreground">{state ? `${state.bids.length} ставок` : "…"}</p>
      </div>
      <p className="text-sm">
        {high ? (
          <>
            Найвища ставка <span className="font-bold">{formatPrice(high.amount)}</span>
            {high.accepted ? " · прийнято" : ""}
          </>
        ) : (
          <>Стартова ціна {formatPrice(asking)}. Перша ставка — від цієї суми.</>
        )}
      </p>

      {mine || user?.admin ? (
        <BidList bids={state?.bids ?? []} pending={pending} onAccept={(id) => void accept(id)} seller />
      ) : state?.closed ? (
        <p className="mt-2 text-sm text-muted-foreground">Продавець уже прийняв ставку. Нові ставки закриті.</p>
      ) : !user ? (
        <Button render={<Link href={loginHref} />} nativeButton={false} variant="outline" className="mt-3 w-full">
          Увійти, щоб зробити ставку
        </Button>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={`Від ${floor.toLocaleString("uk-UA")}`}
            aria-label="Сума ставки в гривнях"
            className="h-10"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending || !amount} className="w-full">
            {pending ? "Надсилаємо…" : "Зробити ставку"}
          </Button>
          <BidList bids={state?.bids ?? []} />
        </form>
      )}
    </div>
  );
}

function BidList({
  bids,
  seller = false,
  pending = false,
  onAccept,
}: {
  bids: PublicBid[];
  seller?: boolean;
  pending?: boolean;
  onAccept?: (id: string) => void;
}) {
  if (!bids.length) return seller ? <p className="mt-2 text-sm text-muted-foreground">Ставок ще немає.</p> : null;
  return (
    <ul className="mt-3 max-h-52 space-y-2 overflow-auto">
      {bids.map((bid) => (
        <li key={bid.id} className="flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <p className="font-medium break-words">
              {formatPrice(bid.amount)}
              {bid.mine ? " · ваша" : ` · ${bid.bidderName}`}
              {bid.accepted ? " · прийнято" : ""}
            </p>
            <p className="text-xs break-words text-muted-foreground" suppressHydrationWarning>
              {formatAgo(bid.createdAt)}
              {bid.phone ? ` · ${bid.phone}` : ""}
            </p>
          </div>
          {seller && !bid.accepted && onAccept && (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onAccept(bid.id)}>
              Прийняти
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BidDialog({ listingId, asking, mine }: { listingId: string; asking: number; mine?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger
        render={<button type="button" aria-label="Ставки" className="flex flex-col items-center gap-0.5 text-white drop-shadow" />}
      >
        <Gavel className="size-7" />
        <span className="text-[11px] font-semibold">Ставка</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mine ? "Ставки на товар" : "Зробити ставку"}</DialogTitle>
          <DialogDescription>Ставка має бути вищою за поточну. Продавець бачить імʼя і номер.</DialogDescription>
        </DialogHeader>
        <BidBox listingId={listingId} asking={asking} mine={mine} />
      </DialogContent>
    </Dialog>
  );
}
