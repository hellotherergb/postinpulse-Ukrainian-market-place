"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/market";
import { useMarket } from "@/lib/store";

export default function AdminPage() {
  const { user, ready: authReady } = useAuth();
  const { listings, ready, removeListing } = useMarket();
  const [busy, setBusy] = useState<string | null>(null);

  if (!authReady || !ready) return <div className="mx-auto h-40 max-w-3xl animate-pulse px-4 py-10" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Потрібен вхід</h1>
        <Button render={<Link href="/login?next=/admin" />} nativeButton={false} className="mt-6">
          Увійти
        </Button>
      </div>
    );
  }

  if (!user.admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Це панель адміністратора</h1>
        <p className="mt-2 text-muted-foreground">Цей акаунт не має доступу. Увійдіть номером адміністратора.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Адмін</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Демо-оголошення вимкнено. Тут лишаються лише реальні публікації — будь-яку можна зняти.
      </p>
      {listings.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed px-6 py-14 text-center text-sm text-muted-foreground">
          Оголошень немає.
        </p>
      ) : (
        <ul className="mt-6 divide-y rounded-xl border bg-card">
          {listings.map((listing) => (
            <li key={listing.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/listing/${listing.id}`} className="line-clamp-1 font-medium hover:underline">
                  {listing.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {formatPrice(listing.price)} · {listing.city} · {listing.seller.name} · {listing.seller.phone}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Видалити оголошення"
                disabled={busy === listing.id}
                onClick={() => {
                  if (!window.confirm(`Зняти «${listing.title}»?`)) return;
                  setBusy(listing.id);
                  removeListing(listing.id)
                    .then(() => toast.success("Оголошення знято"))
                    .catch(() => toast.warning("Не вдалося зняти оголошення"))
                    .finally(() => setBusy(null));
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
