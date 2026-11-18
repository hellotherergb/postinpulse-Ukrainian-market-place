"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { SellForm } from "./sell-form";

export function SellGate() {
  const { user, ready } = useAuth();

  if (!ready) return <div className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />;

  if (!user) {
    return (
      <div className="mt-8 rounded-2xl border bg-card px-6 py-12 text-center">
        <h2 className="text-xl font-bold">Увійдіть, щоб продавати</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Оголошення привʼязується до акаунта, тож ви побачите його з будь-якого телефону.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button render={<Link href="/login?mode=register&next=/sell" />} nativeButton={false} className="h-10">
            Створити акаунт
          </Button>
          <Button render={<Link href="/login?next=/sell" />} nativeButton={false} variant="outline" className="h-10">
            У мене вже є акаунт
          </Button>
        </div>
      </div>
    );
  }

  return <SellForm sellerName={user.name} sellerPhone={user.phone} />;
}
