"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchBar({
  defaultValue = "",
  size = "default",
  className,
}: {
  defaultValue?: string;
  size?: "default" | "lg";
  className?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const lg = size === "lg";

  return (
    <form
      role="search"
      className={cn("flex w-full min-w-0 gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        router.push(query ? `/catalog?q=${encodeURIComponent(query)}` : "/catalog");
      }}
    >
      <div className="relative flex-1">
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground",
            lg ? "size-5" : "size-4",
          )}
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Що шукаєте?"
          aria-label="Пошук оголошень"
          className={cn("bg-background", lg ? "h-12 pl-10 text-base" : "h-9 pl-9")}
        />
      </div>
      <Button type="submit" className={lg ? "h-12 px-6 text-base" : "h-9"}>
        Знайти
      </Button>
    </form>
  );
}
