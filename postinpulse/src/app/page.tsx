import Link from "next/link";
import { ArrowRight, BadgePercent, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/market/category-icon";
import { LatestListings } from "@/components/market/latest-listings";
import { LiveBadge } from "@/components/market/live-badge";
import { SearchBar } from "@/components/market/search-bar";
import { CATEGORIES } from "@/lib/market";

const POPULAR = ["Зарядна станція", "iPhone", "Вишиванка", "Генератор", "LEGO", "Коляска"];

const PERKS = [
  {
    icon: ShieldCheck,
    title: "Безпечна угода",
    text: "Гроші надходять продавцю лише після того, як ви отримали й перевірили товар.",
  },
  {
    icon: Truck,
    title: "Доставка по всій Україні",
    text: "Нова пошта, Укрпошта, Meest або самовивіз — продавець обирає зручне.",
  },
  {
    icon: BadgePercent,
    title: "0% комісії для покупця",
    text: "Платите тільки ціну товару. Жодних митних зборів і конвертації валют.",
  },
  {
    icon: PackageCheck,
    title: "Оплата при отриманні",
    text: "Огляньте посилку у відділенні та оплатіть, якщо все гаразд.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_10%_-10%,oklch(0.93_0.05_250),transparent),radial-gradient(40rem_25rem_at_100%_120%,oklch(0.95_0.06_200),transparent)]"
        />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
          <div className="max-w-3xl">
            <LiveBadge className="mb-4" />
            <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl">
              Купуйте й продавайте <span className="text-primary">по-українськи</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Ваш маркетплейс замість eBay: ціни в гривнях, доставка Новою поштою за день-два та безпечна
              оплата без іноземних карток.
            </p>
            <SearchBar size="lg" className="mt-8 max-w-2xl" />
            <Link href="/feed" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
              Або гортайте стрічку угод на весь екран
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Часто шукають:</span>
              {POPULAR.map((q) => (
                <Link
                  key={q}
                  href={`/catalog?q=${encodeURIComponent(q)}`}
                  className="rounded-full border bg-background/70 px-3 py-1 transition hover:border-primary hover:text-primary"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Категорії</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/catalog?category=${c.id}`}
              className="group flex min-w-0 flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition hover:border-primary/40 hover:shadow-md sm:p-4"
            >
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full transition group-hover:scale-110 sm:size-12"
                style={{ background: `oklch(0.94 0.05 ${c.hue})`, color: `oklch(0.42 0.13 ${c.hue})` }}
              >
                <CategoryIcon id={c.id} className="size-5 sm:size-6" />
              </span>
              <span className="w-full text-sm leading-tight font-medium text-balance">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold tracking-tight">Свіжі оголошення</h2>
          <Link href="/catalog" className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline">
            Усі оголошення <ArrowRight className="size-4" />
          </Link>
        </div>
        <LatestListings />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border bg-card p-5">
              <Icon className="mb-3 size-6 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary p-8 text-primary-foreground md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Є що продати?</h2>
            <p className="mt-2 max-w-lg text-primary-foreground/80">
              Розмістіть оголошення за хвилину — безкоштовно. Покупці з усієї України побачать його вже
              сьогодні.
            </p>
          </div>
          <Button
            render={<Link href="/sell" />}
            nativeButton={false}
            className="h-11 bg-accent px-6 text-base text-accent-foreground hover:bg-accent/90"
          >
            Подати оголошення
          </Button>
        </div>
      </section>
    </>
  );
}
