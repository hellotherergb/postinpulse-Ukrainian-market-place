"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  CITIES,
  DELIVERY,
  isValidPhone,
  makeId,
  type CategoryId,
  type Condition,
  type DeliveryId,
  type Listing,
} from "@/lib/market";
import { useMarket } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ListingCard } from "./listing-card";

const MAX_PHOTOS = 6;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error("decode failed"));
      },
    );
  });
}

function jpegUnder(canvas: HTMLCanvasElement, limit: number) {
  let quality = 0.72;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > limit && quality > 0.42) {
    quality -= 0.1;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  return url;
}

// Phone photos are huge. Shrink them before upload so the request stays under the host limit.
async function downscale(file: File): Promise<string> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await withTimeout(createImageBitmap(file, { imageOrientation: "from-image" }), 8000);
  } catch {
    source = await withTimeout(loadImage(file), 8000);
  }
  const longest = Math.max(source.width, source.height);
  const scale = Math.min(1, 960 / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();
  let url = jpegUnder(canvas, 180_000);
  if (url.length > 220_000) {
    const smaller = document.createElement("canvas");
    smaller.width = Math.max(1, Math.round(canvas.width * 0.6));
    smaller.height = Math.max(1, Math.round(canvas.height * 0.6));
    const next = smaller.getContext("2d");
    if (!next) throw new Error("no canvas");
    next.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    url = jpegUnder(smaller, 180_000);
  }
  if (url.length > 220_000) throw new Error("too big");
  return url;
}


const FIELD_IDS: Record<string, string> = { name: "seller-name", phone: "seller-phone", delivery: "delivery" };

export function SellForm({
  sellerName = "",
  sellerPhone = "",
}: {
  sellerName?: string;
  sellerPhone?: string;
}) {
  const router = useRouter();
  const { addListing } = useMarket();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(true);
  const [category, setCategory] = useState<CategoryId | "">("");
  const [city, setCity] = useState("Київ");
  const [condition, setCondition] = useState<Condition>("used");
  const [delivery, setDelivery] = useState<DeliveryId[]>(["nova", "pickup"]);
  const [name, setName] = useState(sellerName);
  const [phone, setPhone] = useState(sellerPhone);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const [clientKey] = useState(() => makeId());

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const room = MAX_PHOTOS - images.length;
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || IMAGE_EXT.test(f.name))
      .slice(0, room);
    const results = await Promise.allSettled(picked.map((f) => downscale(f)));
    const urls = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    setImages((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
    if (urls.length < picked.length) {
      toast.info("Частину фото не вдалося відкрити", {
        description: "Додайте їх у форматі JPG або PNG.",
      });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = "Напишіть, що продаєте";
    if (!category) e.category = "Оберіть категорію";
    if (price === "") e.price = "Вкажіть ціну (0 — віддам безкоштовно)";
    if (!delivery.length) e.delivery = "Оберіть хоча б один спосіб";
    if (!isValidPhone(phone)) e.phone = "Вкажіть номер, щоб покупці могли зателефонувати";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) {
      const el = document.getElementById(FIELD_IDS[first] ?? first);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    }
    return !first;
  }

  const draft: Listing = {
    id: "preview",
    title: title.trim() || "Назва вашого товару",
    description,
    price: Number(price) || 0,
    negotiable,
    category: category || "electronics",
    city,
    condition,
    delivery,
    seller: { name: name.trim() || "Продавець", rating: 5, reviews: 0, since: new Date(openedAt).getFullYear(), phone },
    createdAt: openedAt,
    images,
    views: 0,
    mine: true,
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || uploading || !validate()) return;
    setSubmitting(true);
    try {
      const listing = await addListing({
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        negotiable,
        category: category as CategoryId,
        city,
        condition,
        delivery,
        images,
        sellerName: name.trim(),
        phone: phone.trim(),
        clientKey,
      });
      toast.success("Оголошення опубліковано", { description: "Його вже бачать усі покупці." });
      router.push(`/listing/${listing.id}`);
    } catch (err) {
      setSubmitting(false);
      const offline = err instanceof TypeError;
      toast.warning(offline ? "Немає зʼєднання з інтернетом" : "Не вдалося опублікувати", {
        description: offline
          ? "Ваші дані збережено у формі. Натисніть «Опублікувати» ще раз, коли зʼявиться мережа."
          : err instanceof Error
            ? err.message
            : "Спробуйте ще раз за хвилину.",
      });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <Section title="Фото" hint={`До ${MAX_PHOTOS} фото. Перше буде обкладинкою.`}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {images.map((src, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
                <img src={src} alt={`Фото ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Видалити фото"
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {images.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
                Додати
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </Section>

        <Section title="Про товар">
          <Field id="title" label="Назва" error={errors.title}>
            <Input
              id="title"
              value={title}
              maxLength={80}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
              placeholder="Наприклад, «Зарядна станція EcoFlow River 2»"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="category" label="Категорія" error={errors.category}>
              <Select
                items={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
                value={category || null}
                onValueChange={(v) => {
                  if (!v) return;
                  setCategory(v as CategoryId);
                  clearError("category");
                }}
              >
                <SelectTrigger id="category" className="h-9 w-full">
                  <SelectValue placeholder="Оберіть категорію" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="condition" label="Стан">
              <Segmented
                value={condition}
                onChange={(v) => setCondition(v as Condition)}
                options={[
                  { value: "used", label: "Вживане" },
                  { value: "new", label: "Нове" },
                ]}
              />
            </Field>
          </div>
          <Field id="description" label="Опис (за бажанням)">
            <Textarea
              id="description"
              rows={5}
              maxLength={3000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Стан, комплектація, причина продажу, чи можлива перевірка при отриманні…"
            />
          </Field>
        </Section>

        <Section title="Ціна">
          <div className="flex flex-wrap items-end gap-4">
            <Field id="price" label="Ціна, ₴" error={errors.price}>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value.replace(/\D/g, "").slice(0, 9));
                  clearError("price");
                }}
                placeholder="Наприклад, 1500"
                className="w-40"
              />
            </Field>
            <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={negotiable}
                onChange={(e) => setNegotiable(e.target.checked)}
                className="size-4 accent-primary"
              />
              Можливий торг
            </label>
          </div>
        </Section>

        <Section title="Доставка">
          <Field id="city" label="Місто">
            <Select items={CITIES.map((c) => ({ value: c, label: c }))} value={city} onValueChange={(v) => v && setCity(v as string)}>
              <SelectTrigger id="city" className="h-9 w-full sm:w-64">
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
          </Field>
          <fieldset id="delivery" tabIndex={-1} className="space-y-2 outline-none">
            <legend className="text-sm font-medium">Способи отримання</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DELIVERY.map((d) => {
                const on = delivery.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setDelivery((prev) => (on ? prev.filter((x) => x !== d.id) : [...prev, d.id]));
                      clearError("delivery");
                    }}
                    className={cn(
                      "min-w-0 rounded-lg border px-2 py-2 text-center text-sm leading-tight font-medium break-words transition",
                      on ? "border-primary bg-primary/5 text-primary" : "hover:border-primary/40",
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            {errors.delivery && <p className="text-xs text-destructive">{errors.delivery}</p>}
          </fieldset>
        </Section>

        <Section title="Контакти">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="seller-name" label="Ваше ім'я (за бажанням)">
              <Input id="seller-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field id="seller-phone" label="Телефон" error={errors.phone}>
              <Input
                id="seller-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                inputMode="tel"
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearError("phone");
                }}
                placeholder="+380 67 123 45 67"
              />
            </Field>
          </div>
        </Section>

        <Button
          type="submit"
          disabled={submitting || uploading}
          className="h-11 w-full gap-2 text-base sm:w-auto sm:px-8"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {uploading ? "Обробляємо фото…" : "Опублікувати оголошення"}
        </Button>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Так покупці побачать ваше оголошення</p>
          <div className="pointer-events-none">
            <ListingCard listing={draft} />
          </div>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
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

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid h-9 grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md text-sm font-medium transition",
            value === o.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
