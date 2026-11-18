"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { SlidersHorizontal, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CATEGORIES, CITIES, categoryById, type CategoryId, type Listing } from "@/lib/market";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { ListingCard, ListingGridSkeleton } from "./listing-card";
import { OfflineState } from "./offline-state";
import { SearchBar } from "./search-bar";

const SORTS = [
  { value: "new", label: "Спочатку нові" },
  { value: "cheap", label: "Спочатку дешеві" },
  { value: "expensive", label: "Спочатку дорогі" },
  { value: "popular", label: "Популярні" },
];

const CITY_ITEMS = [{ value: "all", label: "Уся Україна" }, ...CITIES.map((c) => ({ value: c, label: c }))];
const CONDITION_ITEMS = [
  { value: "all", label: "Будь-який" },
  { value: "new", label: "Нове" },
  { value: "used", label: "Вживане" },
];

function normalize(s: string) {
  return s.toLocaleLowerCase("uk").replace(/[’'ʼ`]/g, "'");
}

function applyFilters(listings: Listing[], p: URLSearchParams) {
  const q = normalize(p.get("q") ?? "").trim();
  const category = p.get("category");
  const city = p.get("city");
  const condition = p.get("condition");
  const min = Number(p.get("min")) || 0;
  const max = Number(p.get("max")) || Infinity;
  const ships = p.get("ships") === "1";
  const sort = p.get("sort") ?? "new";

  const terms = q.split(/\s+/).filter(Boolean);
  const result = listings.filter((l) => {
    if (category && l.category !== category) return false;
    if (city && l.city !== city) return false;
    if (condition && l.condition !== condition) return false;
    if (l.price < min || l.price > max) return false;
    if (ships && !l.delivery.some((d) => d !== "pickup")) return false;
    if (terms.length) {
      const hay = normalize(`${l.title} ${l.description} ${categoryById(l.category).label}`);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });

  const sorters: Record<string, (a: Listing, b: Listing) => number> = {
    new: (a, b) => b.createdAt - a.createdAt,
    cheap: (a, b) => a.price - b.price,
    expensive: (a, b) => b.price - a.price,
    popular: (a, b) => b.views - a.views,
  };
  return result.sort(sorters[sort] ?? sorters.new);
}

export function CatalogView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { listings, ready, status } = useMarket();

  const results = useMemo(() => applyFilters(listings, new URLSearchParams(params)), [listings, params]);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const q = params.get("q") ?? "";
  const category = params.get("category") as CategoryId | null;
  const activeFilters = ["city", "condition", "min", "max", "ships"].filter((k) => params.has(k)).length;

  const filters = (
    <Filters key={params.toString()} params={params} update={update} />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
      <SearchBar key={q} defaultValue={q} className="mb-5 md:max-w-2xl" />

      <div className="mb-6 w-full min-w-0 max-w-full overflow-x-auto">
        <div className="-mx-4 flex w-max gap-2 px-4 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:px-0">
        <CategoryChip active={!category} onClick={() => update({ category: null })}>
          Усі категорії
        </CategoryChip>
        {CATEGORIES.map((c) => (
          <CategoryChip key={c.id} active={category === c.id} onClick={() => update({ category: c.id })}>
            <CategoryIcon id={c.id} className="size-4" />
            {c.label}
          </CategoryChip>
        ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-xl border bg-card p-4">{filters}</div>
        </aside>

        <section aria-live="polite" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h1 className="mr-auto min-w-0 text-lg font-bold tracking-tight break-words sm:text-xl">
              {q ? `«${q}»` : category ? categoryById(category).label : "Усі оголошення"}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {ready ? `${results.length} ${plural(results.length)}` : "…"}
              </span>
            </h1>

            <Sheet>
              <SheetTrigger render={<Button variant="outline" className="h-9 gap-1.5 md:hidden" />}>
                <SlidersHorizontal className="size-4" />
                Фільтри
                {activeFilters > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] leading-5 text-primary-foreground">
                    {activeFilters}
                  </span>
                )}
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Фільтри</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">{filters}</div>
              </SheetContent>
            </Sheet>

            <Select
              items={SORTS}
              value={params.get("sort") ?? "new"}
              onValueChange={(v) => update({ sort: v === "new" ? null : (v as string) })}
            >
              <SelectTrigger className="h-9 w-full max-w-full min-w-0 sm:w-auto sm:min-w-44" aria-label="Сортування">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!ready ? (
            <ListingGridSkeleton count={6} />
          ) : status === "offline" && listings.length === 0 ? (
            <OfflineState />
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
              <SearchX className="mb-3 size-10 text-muted-foreground" />
              <h2 className="font-semibold">Нічого не знайшли</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Спробуйте змінити запит або прибрати частину фільтрів. Або розмістіть оголошення «Куплю» —
                продавці знайдуть вас самі.
              </p>
              <div className="mt-5 flex gap-2">
                <Button variant="outline" onClick={() => router.replace(pathname)}>
                  Скинути все
                </Button>
                <Button render={<Link href="/sell" />} nativeButton={false}>
                  Подати оголошення
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function plural(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "оголошення";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "оголошення";
  return "оголошень";
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Filters({
  params,
  update,
}: {
  params: URLSearchParams;
  update: (patch: Record<string, string | null>) => void;
}) {
  const hasAny = ["city", "condition", "min", "max", "ships"].some((k) => params.has(k));

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Місто</Label>
        <Select
          items={CITY_ITEMS}
          value={params.get("city") ?? "all"}
          onValueChange={(v) => update({ city: v as string })}
        >
          <SelectTrigger className="h-9 w-full" aria-label="Місто">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CITY_ITEMS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Стан</Label>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
          {CONDITION_ITEMS.map((c) => {
            const active = (params.get("condition") ?? "all") === c.value;
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={active}
                onClick={() => update({ condition: c.value })}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition",
                  active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          update({ min: String(fd.get("min") ?? ""), max: String(fd.get("max") ?? "") });
        }}
      >
        <Label htmlFor="price-min">Ціна, ₴</Label>
        <div className="flex items-center gap-2">
          <Input
            id="price-min"
            name="min"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="від"
            defaultValue={params.get("min") ?? ""}
            className="h-9"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            name="max"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="до"
            aria-label="Ціна до"
            defaultValue={params.get("max") ?? ""}
            className="h-9"
          />
        </div>
        <Button type="submit" variant="secondary" className="h-8 w-full">
          Застосувати ціну
        </Button>
      </form>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={params.get("ships") === "1"}
          onChange={(e) => update({ ships: e.target.checked ? "1" : null })}
          className="size-4 accent-primary"
        />
        Лише з доставкою
      </label>

      {hasAny && (
        <Button
          variant="ghost"
          className="h-8 w-full gap-1.5 text-muted-foreground"
          onClick={() => update({ city: null, condition: null, min: null, max: null, ships: null })}
        >
          <X className="size-4" />
          Скинути фільтри
        </Button>
      )}
    </div>
  );
}
