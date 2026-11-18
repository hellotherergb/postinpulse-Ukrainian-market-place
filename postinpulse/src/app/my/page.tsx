"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingImage } from "@/components/market/listing-image";
import { deliveryLabel, formatAgo, formatPrice } from "@/lib/market";
import { MyBids } from "@/components/market/my-bids";
import { useAuth } from "@/lib/auth";
import { useMarket } from "@/lib/store";

export default function MyPage() {
  const { myListings, orders, removeListing, ready } = useMarket();
  const { user, ready: authReady, logout } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <AccountCard user={user} ready={authReady} onLogout={() => void logout()} />
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Мій кабінет</h1>
        <Button render={<Link href="/sell" />} nativeButton={false} className="gap-1.5">
          <Plus className="size-4" />
          Нове оголошення
        </Button>
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="h-auto! w-full max-w-full flex-wrap justify-start">
          <TabsTrigger value="listings" className="h-auto flex-none px-2.5 py-1.5 whitespace-normal">
            Мої оголошення{ready && ` (${myListings.length})`}
          </TabsTrigger>
          <TabsTrigger value="orders" className="h-auto flex-none px-2.5 py-1.5 whitespace-normal">
            Мої покупки{ready && ` (${orders.length})`}
          </TabsTrigger>
          <TabsTrigger value="bids" className="h-auto flex-none px-2.5 py-1.5 whitespace-normal">
            Ставки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="listings" className="mt-4">
          {!ready ? (
            <RowSkeleton />
          ) : myListings.length === 0 ? (
            <Empty
              title="Ви ще нічого не продаєте"
              text="Розмістіть перше оголошення — це безкоштовно і займає хвилину."
              cta={{ href: "/sell", label: "Подати оголошення" }}
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {myListings.map((l) => (
                <li key={l.id} className="flex items-center gap-3 p-3 sm:gap-4">
                  <Link href={`/listing/${l.id}`} className="size-16 shrink-0 overflow-hidden rounded-lg sm:size-20">
                    <ListingImage listing={l} iconClassName="size-8" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/listing/${l.id}`} className="line-clamp-1 font-medium hover:underline">
                      {l.title}
                    </Link>
                    <p className="font-bold">{formatPrice(l.price)}</p>
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {l.city} · опубліковано {formatAgo(l.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Зняти з публікації"
                    onClick={() =>
                      removeListing(l.id).then(
                        () => toast.success("Оголошення знято з публікації"),
                        () =>
                          toast.warning("Не вдалося зняти оголошення", {
                            description: "Перевірте зʼєднання та спробуйте ще раз.",
                          }),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {!ready ? (
            <RowSkeleton />
          ) : orders.length === 0 ? (
            <Empty
              title="Покупок поки немає"
              text="Оформлюйте замовлення з доставкою прямо на сторінці оголошення."
              cta={{ href: "/catalog", label: "До каталогу" }}
            />
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-4 p-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Package className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/listing/${o.listingId}`} className="line-clamp-1 font-medium hover:underline">
                      {o.title}
                    </Link>
                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {deliveryLabel(o.delivery)}, {o.city}, відділення №{o.branch} · {formatAgo(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatPrice(o.price)}</p>
                    <p className="text-xs text-amber-600">Очікує відправки</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="bids" className="mt-4">
          {user ? <MyBids /> : <p className="text-sm text-muted-foreground">Увійдіть, щоб бачити ставки.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountCard({
  user,
  ready,
  onLogout,
}: {
  user: { name: string; phone: string; admin?: boolean } | null;
  ready: boolean;
  onLogout: () => void;
}) {
  if (!ready) return <div className="mb-6 h-20 animate-pulse rounded-xl bg-muted" />;
  if (!user) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Увійдіть, щоб бачити свої оголошення на будь-якому пристрої.</p>
        <Button render={<Link href="/login?next=/my" />} nativeButton={false}>
          Увійти
        </Button>
      </div>
    );
  }
  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border bg-card p-4">
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
        {user.name.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-muted-foreground">
          {user.phone}
          {user.admin ? " · адміністратор" : ""}
        </p>
        {user.admin && (
          <Link href="/admin" className="text-sm font-semibold text-primary">
            Адмін-панель
          </Link>
        )}
      </div>
      <Button variant="outline" onClick={onLogout}>
        Вийти
      </Button>
    </div>
  );
}

function Empty({ title, text, cta }: { title: string; text: string; cta: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      <Button render={<Link href={cta.href} />} nativeButton={false} className="mt-5">
        {cta.label}
      </Button>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
