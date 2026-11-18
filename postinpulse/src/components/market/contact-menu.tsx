"use client";

import { useState, useSyncExternalStore } from "react";
import { Copy, MessageCircle, MessagesSquare, Phone, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { contactChannels, formatPhone } from "@/lib/contact";
import type { Listing } from "@/lib/market";
import { cn } from "@/lib/utils";

const ICONS = {
  call: Phone,
  whatsapp: MessageCircle,
  viber: MessagesSquare,
  telegram: Send,
  sms: Smartphone,
} as const;

export function ContactMenu({
  listing,
  label,
  variant = "secondary",
  feed = false,
}: {
  listing: Listing;
  label: string;
  variant?: "secondary" | "outline";
  feed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const origin = useSyncExternalStore(
    () => () => {},
    () => location.origin,
    () => "https://postinpulse.com",
  );
  const number = formatPhone(listing.seller.phone);
  const channels = contactChannels(listing, origin);

  async function copy() {
    try {
      await navigator.clipboard.writeText(number);
      toast.success("Номер скопійовано");
    } catch {
      toast.warning("Не вдалося скопіювати номер");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          feed ? (
            <button type="button" aria-label={label} className="flex flex-col items-center gap-0.5 text-white drop-shadow" />
          ) : (
            <Button variant={variant} className="h-11 w-full gap-2 text-base" />
          )
        }
      >
        <Phone className={feed ? "size-7" : "size-4"} />
        {feed ? <span className="text-[11px] font-semibold">Звʼязок</span> : label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="break-words pr-8">Звʼязатися з {listing.seller.name}</DialogTitle>
          <DialogDescription className="line-clamp-2 break-words">{listing.title}</DialogDescription>
        </DialogHeader>
        <p className="text-center text-2xl font-bold tracking-tight break-all">{number}</p>
        <ul className="space-y-2">
          {channels.map((channel) => {
            const Icon = ICONS[channel.id];
            return (
              <li key={channel.id}>
                <a
                  href={channel.href}
                  className="flex items-center gap-3 rounded-xl border px-3 py-3 transition hover:border-primary hover:bg-secondary"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold break-words">{channel.label}</span>
                    <span className="block text-sm break-words text-muted-foreground">{channel.hint}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => void copy()}
          className={cn("flex h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:bg-secondary")}
        >
          <Copy className="size-4" />
          Скопіювати номер
        </button>
      </DialogContent>
    </Dialog>
  );
}
