import Link from "next/link";
import { CATEGORIES } from "@/lib/market";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-secondary/50 pb-20 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">
            Купуйте й продавайте по всій Україні без комісії для покупця. Доставка Новою поштою,
            Укрпоштою та Meest, оплата після перевірки товару.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Категорії</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-muted-foreground md:grid-cols-1">
            {CATEGORIES.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/catalog?category=${c.id}`} className="hover:text-foreground">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Продавцям</h2>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/sell" className="hover:text-foreground">
                Подати оголошення
              </Link>
            </li>
            <li>
              <Link href="/my" className="hover:text-foreground">
                Мої оголошення та замовлення
              </Link>
            </li>
            <li>Безпечна угода — гроші продавцю після отримання</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © postinpulse.com · Designed in Ukraine ·{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms and Conditions
          </Link>
        </p>
      </div>
    </footer>
  );
}
