"use client";

import { useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarket } from "@/lib/store";

export function OfflineState() {
  const { refresh } = useMarket();
  const [retrying, setRetrying] = useState(false);

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
      <WifiOff className="mb-3 size-10 text-muted-foreground" />
      <h2 className="font-semibold">Немає зʼєднання</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Не вдалося завантажити оголошення. Перевірте інтернет — сторінка оновиться сама, щойно мережа зʼявиться.
      </p>
      <Button
        variant="outline"
        className="mt-5 gap-2"
        disabled={retrying}
        onClick={async () => {
          setRetrying(true);
          await refresh();
          setRetrying(false);
        }}
      >
        {retrying && <Loader2 className="size-4 animate-spin" />}
        Спробувати ще раз
      </Button>
    </div>
  );
}
