import type { Metadata } from "next";
import { Suspense } from "react";
import { SellGate } from "@/components/market/sell-gate";

export const metadata: Metadata = { title: "Подати оголошення" };

export default function SellPage() {
  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Подати оголошення</h1>
      <p className="mt-1 text-muted-foreground">Безкоштовно. Оголошення одразу зʼявиться в каталозі.</p>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <SellGate />
      </Suspense>
    </div>
  );
}
