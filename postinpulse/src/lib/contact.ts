import type { Listing } from "@/lib/market";

/** Ukrainian numbers become 380XXXXXXXXX so tel:, WhatsApp, and Viber links open. */
export function phoneDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("380")) return digits;
  if (digits.startsWith("80") && digits.length >= 11) digits = digits.slice(1);
  if (digits.startsWith("0")) return `38${digits}`;
  if (digits.length === 9) return `380${digits}`;
  return digits;
}

export function formatPhone(phone: string) {
  const digits = phoneDigits(phone);
  if (digits.length === 12 && digits.startsWith("380")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return phone.trim();
}

export function contactChannels(listing: Pick<Listing, "id" | "title" | "seller">, origin: string) {
  const digits = phoneDigits(listing.seller.phone);
  const text = `Добрий день! Цікавить «${listing.title}» на postinpulse: ${origin}/listing/${encodeURIComponent(listing.id)}`;
  const encoded = encodeURIComponent(text);
  return [
    { id: "call", label: "Зателефонувати", hint: "Набір номера", href: `tel:+${digits}` },
    { id: "whatsapp", label: "WhatsApp", hint: "Чат із готовим текстом", href: `https://wa.me/${digits}?text=${encoded}` },
    { id: "viber", label: "Viber", hint: "Відкриє застосунок Viber", href: `viber://chat?number=%2B${digits}` },
    { id: "telegram", label: "Telegram", hint: "Якщо цей номер є в Telegram", href: `tg://resolve?phone=${digits}` },
    { id: "sms", label: "SMS", hint: "Коротке повідомлення", href: `sms:+${digits}?body=${encoded}` },
  ] as const;
}
