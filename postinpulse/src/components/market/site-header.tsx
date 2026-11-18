"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Heart, LayoutGrid, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { SearchBar } from "./search-bar";

const NAV = [
  { href: "/feed", label: "Стрічка", icon: Clapperboard },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/favorites", label: "Обране", icon: Heart },
  { href: "/my", label: "Профіль", icon: UserRound },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { favorites, ready } = useMarket();
  const { user } = useAuth();
  const feed = pathname === "/feed";
  const showSearch = pathname !== "/" && pathname !== "/catalog" && !feed;

  return (
    <>
      <header className={cn("sticky top-0 z-40 w-full min-w-0 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75", feed && "hidden")}>
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Logo className="shrink-0" />
          <div className="hidden min-w-0 flex-1 md:block">{showSearch && <SearchBar className="max-w-xl min-w-0" />}</div>
          <nav className="ml-auto hidden min-w-0 items-center gap-0.5 md:flex" aria-label="Основна навігація">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground lg:px-3",
                  pathname.startsWith(href) && "text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="hidden lg:inline">{label}</span>
                {href === "/favorites" && ready && favorites.length > 0 && (
                  <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 text-[11px] leading-5 text-white">
                    {favorites.length}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          {user?.admin && (
            <Link href="/admin" className="hidden text-sm font-semibold text-primary md:inline">
              Адмін
            </Link>
          )}
          <Link
            href={user ? "/my" : "/login"}
            className="hidden max-w-24 truncate text-sm font-medium text-muted-foreground hover:text-foreground lg:inline"
          >
            {user ? user.name.split(" ")[0] : "Увійти"}
          </Link>
          <Button render={<Link href="/sell" />} nativeButton={false} className="ml-auto h-9 shrink-0 gap-1.5 md:ml-1">
            <Plus className="size-4" />
            <span className="lg:hidden">Продати</span>
            <span className="hidden lg:inline">Подати оголошення</span>
          </Button>
        </div>
      </header>

      <nav
        aria-label="Мобільна навігація"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden",
          feed ? "border-white/10 bg-black/75 text-white" : "bg-background/95",
        )}
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                feed ? "text-white/60" : "text-muted-foreground",
                active && (feed ? "text-white" : "text-primary"),
              )}
            >
              <Icon className="size-5" />
              {label}
              {href === "/favorites" && ready && favorites.length > 0 && (
                <span className="absolute top-1 left-1/2 ml-2 rounded-full bg-rose-500 px-1.5 text-[10px] leading-4 text-white">
                  {favorites.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
