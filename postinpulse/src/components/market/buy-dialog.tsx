"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES, DELIVERY, formatPrice, isValidPhone, makeId, type DeliveryId, type Listing } from "@/lib/market";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";

const DELIVERY_FEE: Partial<Record<DeliveryId, number>> = { nova: 80, ukrposhta: 45, meest: 60 };

export function BuyDialog({ listing }: { listing: Listing }) {
  const { placeOrder } = useMarket();
  const options = DELIVERY.filter((d) => d.id !== "pickup" && listing.delivery.includes(d.id));
  const [open, setOpen] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryId>(options[0]?.id ?? "nova");
  const [city, setCity] = useState("Київ");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fee = DELIVERY_FEE[delivery] ?? 0;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "");
    const branch = String(fd.get("branch") ?? "").trim();

    const next: Record<string, string> = {};
    if (name.length < 2) next.name = "Вкажіть, хто отримає посилку";
    if (!isValidPhone(phone)) next.phone = "Вкажіть номер для SMS від служби доставки";
    if (!branch) next.branch = "Вкажіть номер відділення або поштомату";
    setErrors(next);
    if (Object.keys(next).length) return;

    placeOrder({
      id: makeId(),
      listingId: listing.id,
      title: listing.title,
      price: listing.price + fee,
      delivery,
      city,
      branch,
      buyerName: name,
      createdAt: Date.now(),
    });
    setOpen(false);
    toast.success("Замовлення оформлено", {
      description: `${listing.seller.name} підтвердить відправку протягом доби. Оплата — при отриманні.`,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setErrors({});
      }}
    >
      <DialogTrigger render={<Button className="h-11 w-full gap-2 text-base" />}>
        <ShoppingBag className="size-4" />
        Купити з доставкою
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Оформлення замовлення</DialogTitle>
          <DialogDescription className="line-clamp-1">{listing.title}</DialogDescription>
        </DialogHeader>

        <form
          id="buy-form"
          onSubmit={submit}
          onChange={(e) => {
            const field = (e.target as unknown as HTMLInputElement).name;
            if (field && errors[field]) {
              setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== field)));
            }
          }}
          className="space-y-4"
          noValidate
        >
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Служба доставки</legend>
            <div className="grid grid-cols-3 gap-2">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={delivery === o.id}
                  onClick={() => setDelivery(o.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm font-medium transition",
                    delivery === o.id ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/40",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-[1fr_120px] gap-2">
            <div className="space-y-1.5">
              <Label>Місто</Label>
              <Select items={CITIES.map((c) => ({ value: c, label: c }))} value={city} onValueChange={(v) => setCity(v as string)}>
                <SelectTrigger className="h-9 w-full" aria-label="Місто доставки">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field id="branch" label="Відділення №" error={errors.branch}>
              <Input id="branch" name="branch" inputMode="numeric" placeholder="12" className="h-9" />
            </Field>
          </div>

          <Field id="name" label="Отримувач" error={errors.name}>
            <Input id="name" name="name" autoComplete="name" placeholder="Ім'я та прізвище" className="h-9" />
          </Field>
          <Field id="phone" label="Телефон" error={errors.phone}>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+380 67 123 45 67" className="h-9" />
          </Field>

          <div className="space-y-1 rounded-xl bg-secondary p-3 text-sm">
            <Row label="Товар" value={formatPrice(listing.price)} />
            <Row label="Доставка (орієнтовно)" value={formatPrice(fee)} />
            <Row label="Разом" value={formatPrice(listing.price + fee)} strong />
          </div>
          <p className="flex gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            Оплата при отриманні у відділенні після огляду товару. Без передоплати.
          </p>
        </form>

        <DialogFooter>
          <Button type="submit" form="buy-form" className="h-10 w-full sm:w-auto">
            Підтвердити замовлення
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong && "border-t pt-1.5 font-semibold")}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
