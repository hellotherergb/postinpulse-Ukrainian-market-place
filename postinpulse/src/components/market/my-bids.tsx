"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAgo, formatPrice } from "@/lib/market";

interface Row {
  id: string;
  amount: number;
  createdAt: number;
  bidderName: string;
  accepted: boolean;
  mine: boolean;
  phone?: string;
  listingId: string;
  listingTitle: string;
}

export function MyBids() {
  const [placed, setPlaced] = useState<Row[] | null>(null);
  const [received, setReceived] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/bids/mine", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { placed?: Row[]; received?: Row[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Не вдалося завантажити ставки");
        return data;
      })
      .then((data) => {
        if (!active) return;
        setPlaced(data.placed ?? []);
        setReceived(data.received ?? []);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Не вдалося завантажити ставки");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!placed || !received) return <div className="h-24 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-semibold">Ставки на ваші товари</h2>
        {received.length === 0 ? (
          <p className="text-sm text-muted-foreground">Поки ніхто не ставив. Ставки зʼявляться тут разом із номером покупця.</p>
        ) : (
          <BidRows rows={received} showBidder />
        )}
      </section>
      <section>
        <h2 className="mb-3 font-semibold">Ваші ставки</h2>
        {placed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ви ще не робили ставок. Кнопка «Зробити ставку» є на сторінці оголошення.</p>
        ) : (
          <BidRows rows={placed} />
        )}
      </section>
    </div>
  );
}

function BidRows({ rows, showBidder = false }: { rows: Row[]; showBidder?: boolean }) {
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <Link href={`/listing/${row.listingId}`} className="line-clamp-1 font-medium hover:underline">
              {row.listingTitle}
            </Link>
            <p className="text-xs break-words text-muted-foreground" suppressHydrationWarning>
              {formatAgo(row.createdAt)}
              {showBidder ? ` · ${row.bidderName}` : ""}
              {row.phone ? ` · ${row.phone}` : ""}
              {row.accepted ? " · прийнято" : ""}
            </p>
          </div>
          <p className="shrink-0 font-bold">{formatPrice(row.amount)}</p>
        </li>
      ))}
    </ul>
  );
}
