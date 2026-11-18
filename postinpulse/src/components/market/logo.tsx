import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const wordmark =
  "bg-[linear-gradient(100deg,#6A80F2_0%,#3A9AEE_42%,#2AD6E8_100%)] bg-clip-text font-extrabold tracking-[0.08em] text-transparent uppercase";

export function Logo({
  className,
  tone = "light",
  compact = false,
  stacked = false,
}: {
  className?: string;
  tone?: "light" | "dark";
  compact?: boolean;
  stacked?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="POST IN PULSE — на головну"
      className={cn("flex items-center gap-2", stacked && "flex-col gap-3 text-center", className)}
    >
      <Image
        src="/brand/cart.png"
        alt=""
        width={394}
        height={304}
        priority={!compact}
        className={cn("w-auto shrink-0", stacked ? "h-20" : compact ? "h-8" : "h-9")}
      />
      <span className={cn("flex flex-col leading-none", stacked && "items-center")}>
        <span className={cn(wordmark, stacked ? "text-2xl" : compact ? "text-[11px] tracking-[0.04em]" : "text-[13px] sm:text-[15px]")}>
          Post in Pulse
        </span>
        {stacked ? (
          <>
            <span className={cn("mt-1.5 text-[11px] font-medium tracking-[0.32em] uppercase", tone === "dark" ? "text-white/70" : "text-muted-foreground")}>
              Since 2026
            </span>
            <span className={cn("mt-1 text-sm font-medium", tone === "dark" ? "text-white/85" : "text-foreground")}>
              Designed in Ukraine
            </span>
          </>
        ) : (
          !compact && (
            <span
              className={cn(
                "mt-1 hidden text-[9px] font-medium tracking-[0.28em] uppercase sm:block",
                tone === "dark" ? "text-white/70" : "text-muted-foreground",
              )}
            >
              Since 2026
            </span>
          )
        )}
      </span>
    </Link>
  );
}
