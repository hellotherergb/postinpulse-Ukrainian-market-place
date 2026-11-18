export type CategoryId =
  | "electronics"
  | "fashion"
  | "home"
  | "kids"
  | "auto"
  | "sport"
  | "collectibles"
  | "books";

export type DeliveryId = "nova" | "ukrposhta" | "meest" | "pickup";
export type Condition = "new" | "used";

export interface Seller {
  name: string;
  rating: number;
  reviews: number;
  since: number;
  phone: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  negotiable: boolean;
  category: CategoryId;
  city: string;
  condition: Condition;
  delivery: DeliveryId[];
  seller: Seller;
  createdAt: number;
  images: string[];
  /** Total photo count; feed responses only include the cover in `images`. */
  imageCount?: number;
  views: number;
  mine?: boolean;
}

export const CATEGORIES: { id: CategoryId; label: string; hue: number }[] = [
  { id: "electronics", label: "Електроніка", hue: 255 },
  { id: "fashion", label: "Одяг і взуття", hue: 340 },
  { id: "home", label: "Дім і сад", hue: 150 },
  { id: "kids", label: "Дитячі товари", hue: 50 },
  { id: "auto", label: "Авто та запчастини", hue: 20 },
  { id: "sport", label: "Спорт і хобі", hue: 190 },
  { id: "collectibles", label: "Колекціонування", hue: 290 },
  { id: "books", label: "Книги та музика", hue: 80 },
];

export const CITIES = [
  "Київ",
  "Львів",
  "Одеса",
  "Харків",
  "Дніпро",
  "Запоріжжя",
  "Вінниця",
  "Івано-Франківськ",
  "Тернопіль",
  "Ужгород",
  "Полтава",
  "Чернівці",
  "Житомир",
  "Луцьк",
  "Рівне",
  "Черкаси",
];

export const DELIVERY: { id: DeliveryId; label: string; short: string }[] = [
  { id: "nova", label: "Нова пошта", short: "НП" },
  { id: "ukrposhta", label: "Укрпошта", short: "УП" },
  { id: "meest", label: "Meest", short: "Meest" },
  { id: "pickup", label: "Самовивіз", short: "Самовивіз" },
];

export const categoryById = (id: CategoryId) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export const deliveryLabel = (id: DeliveryId) =>
  DELIVERY.find((d) => d.id === id)?.label ?? id;

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 13;
}

// crypto.randomUUID only exists in secure contexts (HTTPS or localhost).
export function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y",
  і: "i", ї: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "iu",
  я: "ia", ы: "y", э: "e", ё: "e", ъ: "", "'": "", "’": "", "ʼ": "",
};

// Listing ids go into URLs, so keep them ASCII-only.
export function slugify(title: string, suffix = Math.random().toString(36).slice(2, 7)) {
  const base = Array.from(title.toLowerCase(), (ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "item"}-${suffix}`;
}

const uah = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });
export const formatPrice = (price: number) =>
  price === 0 ? "Безкоштовно" : `${uah.format(price)} ₴`;

const rtf = new Intl.RelativeTimeFormat("uk", { numeric: "auto" });
export function formatAgo(ts: number, now = Date.now()) {
  const minutes = Math.round((ts - now) / 60000);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

const H = 3600_000;
const now = Date.now();

const sellers: Record<string, Seller> = {
  oksana: { name: "Оксана К.", rating: 4.9, reviews: 132, since: 2021, phone: "+380 67 214 55 09" },
  taras: { name: "Тарас М.", rating: 4.7, reviews: 58, since: 2022, phone: "+380 50 381 12 77" },
  iryna: { name: "Ірина Л.", rating: 5.0, reviews: 21, since: 2024, phone: "+380 93 640 08 31" },
  andriy: { name: "Андрій П.", rating: 4.8, reviews: 310, since: 2020, phone: "+380 97 552 71 44" },
  sofia: { name: "Софія Д.", rating: 4.6, reviews: 14, since: 2025, phone: "+380 66 109 23 85" },
  maksym: { name: "Максим Г.", rating: 4.9, reviews: 87, since: 2022, phone: "+380 68 777 40 12" },
  shop: { name: "Vintage Lviv", rating: 4.9, reviews: 540, since: 2019, phone: "+380 32 245 10 10" },
};

type Seed = Omit<Listing, "createdAt" | "images" | "views"> & { hoursAgo: number; views?: number };

const seed: Seed[] = [
  {
    id: "iphone-15-pro",
    title: "iPhone 15 Pro 256 ГБ, Natural Titanium",
    description:
      "Телефон в ідеальному стані, завжди в чохлі та зі склом. Ємність батареї 94%. Повний комплект: коробка, кабель USB-C. Не ремонтувався, не втоплений. Можлива перевірка на Новій пошті перед оплатою.",
    price: 38500,
    negotiable: true,
    category: "electronics",
    city: "Київ",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.taras,
    hoursAgo: 2,
    views: 412,
  },
  {
    id: "vyshyvanka-len",
    title: "Вишиванка жіноча, льон, ручна вишивка",
    description:
      "Вишиванка ручної роботи з натурального льону, полтавська гладь. Розмір M (обхват грудей 92 см). Виготовлю на замовлення будь-який розмір за 3 тижні.",
    price: 4200,
    negotiable: false,
    category: "fashion",
    city: "Полтава",
    condition: "new",
    delivery: ["nova", "ukrposhta", "meest"],
    seller: sellers.oksana,
    hoursAgo: 5,
    views: 189,
  },
  {
    id: "ecoflow-river-2",
    title: "Зарядна станція EcoFlow River 2 Pro",
    description:
      "768 Вт·год, 800 Вт вихідна потужність. Використовувалась кілька разів під час відключень. Тримає роутер і ноутбук цілу ніч. Гарантія ще 8 місяців.",
    price: 17900,
    negotiable: true,
    category: "electronics",
    city: "Харків",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.andriy,
    hoursAgo: 9,
    views: 803,
  },
  {
    id: "macbook-air-m2",
    title: "MacBook Air 13 M2 8/256, Midnight",
    description:
      "Куплений в офіційному магазині, 54 цикли зарядки. Без подряпин, використовувався вдома для навчання. Віддам з чохлом.",
    price: 32000,
    negotiable: true,
    category: "electronics",
    city: "Львів",
    condition: "used",
    delivery: ["nova", "meest", "pickup"],
    seller: sellers.maksym,
    hoursAgo: 20,
    views: 356,
  },
  {
    id: "kolyaska-anex",
    title: "Коляска Anex m/type 2 в 1",
    description:
      "Коляска після однієї дитини, все працює ідеально. Люлька + прогулянковий блок, дощовик, сумка для мами. Колір — пісочний.",
    price: 9800,
    negotiable: true,
    category: "kids",
    city: "Вінниця",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.sofia,
    hoursAgo: 26,
  },
  {
    id: "lego-technic-porsche",
    title: "LEGO Technic Porsche 911 GT3 RS (42056)",
    description:
      "Зібраний один раз, стояв на полиці. Всі деталі на місці, є оригінальна коробка та інструкції. Рідкісний набір, знятий з виробництва.",
    price: 14500,
    negotiable: false,
    category: "collectibles",
    city: "Одеса",
    condition: "used",
    delivery: ["nova"],
    seller: sellers.andriy,
    hoursAgo: 30,
  },
  {
    id: "velosyped-trek",
    title: "Велосипед Trek Marlin 7, рама L, 2023",
    description:
      "Гідравлічні гальма, вилка RockShox. Пробіг близько 900 км, обслуговувався у веломайстерні. Причина продажу — переїзд.",
    price: 27000,
    negotiable: true,
    category: "sport",
    city: "Дніпро",
    condition: "used",
    delivery: ["pickup"],
    seller: sellers.taras,
    hoursAgo: 40,
  },
  {
    id: "kozatskyi-kylym",
    title: "Вінтажний гуцульський ліжник, 1970-ті",
    description:
      "Справжній ліжник з овечої вовни, ручне ткацтво, Косівщина. Розмір 140×200 см. Почищений, без молі та плям.",
    price: 6500,
    negotiable: false,
    category: "home",
    city: "Івано-Франківськ",
    condition: "used",
    delivery: ["nova", "ukrposhta", "meest"],
    seller: sellers.shop,
    hoursAgo: 46,
  },
  {
    id: "kava-machine-delonghi",
    title: "Кавомашина De'Longhi Magnifica S",
    description:
      "Автоматична кавомашина з капучинатором. Регулярно чистилась від накипу, повністю справна. Віддам з пачкою зерен у подарунок.",
    price: 7300,
    negotiable: true,
    category: "home",
    city: "Київ",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.iryna,
    hoursAgo: 52,
  },
  {
    id: "kobzar-1914",
    title: "«Кобзар» Т. Шевченка, видання 1914 року",
    description:
      "Антикварне видання, Санкт-Петербург, 1914. Палітурка відреставрована, текстовий блок повний. Для колекціонерів.",
    price: 22000,
    negotiable: true,
    category: "books",
    city: "Тернопіль",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.shop,
    hoursAgo: 60,
  },
  {
    id: "zymovi-shyny",
    title: "Зимові шини Nokian Hakkapeliitta R17 225/65, 4 шт",
    description:
      "Один сезон пробігу, протектор 8 мм. Без латок та кил. Можу допомогти з доставкою по місту.",
    price: 11200,
    negotiable: true,
    category: "auto",
    city: "Запоріжжя",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.maksym,
    hoursAgo: 70,
  },
  {
    id: "sony-wh1000xm5",
    title: "Навушники Sony WH-1000XM5, нові",
    description:
      "Запаковані, офіційна гарантія 12 місяців. Подарували, але вже маю такі. Чорний колір.",
    price: 10400,
    negotiable: false,
    category: "electronics",
    city: "Луцьк",
    condition: "new",
    delivery: ["nova", "ukrposhta"],
    seller: sellers.iryna,
    hoursAgo: 75,
  },
  {
    id: "ps5-slim",
    title: "PlayStation 5 Slim з дисководом + 2 геймпади",
    description:
      "Консоль у відмінному стані, другий геймпад DualSense та 3 диски: Ghost of Tsushima, GT7, Spider-Man 2.",
    price: 21500,
    negotiable: true,
    category: "electronics",
    city: "Житомир",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.taras,
    hoursAgo: 90,
  },
  {
    id: "keramika-opishnia",
    title: "Опішнянська кераміка, набір глечиків",
    description:
      "Набір з трьох глечиків ручної роботи, майстерня з Опішні. Ідеально як подарунок або для інтер'єру.",
    price: 1850,
    negotiable: false,
    category: "home",
    city: "Полтава",
    condition: "new",
    delivery: ["nova", "ukrposhta", "meest"],
    seller: sellers.oksana,
    hoursAgo: 100,
  },
  {
    id: "kurtka-columbia",
    title: "Пуховик Columbia чоловічий, розмір L",
    description: "Носив один сезон, без пошкоджень. Тепла модель до −25 °C, капюшон відстібається.",
    price: 3400,
    negotiable: true,
    category: "fashion",
    city: "Чернівці",
    condition: "used",
    delivery: ["nova", "ukrposhta"],
    seller: sellers.maksym,
    hoursAgo: 110,
  },
  {
    id: "dytiache-lizhko",
    title: "Дитяче ліжечко з маятником, бук",
    description: "Натуральний бук, три рівні дна, матрац у подарунок. Самовивіз з Рівного.",
    price: 2600,
    negotiable: true,
    category: "kids",
    city: "Рівне",
    condition: "used",
    delivery: ["pickup"],
    seller: sellers.sofia,
    hoursAgo: 130,
  },
  {
    id: "monety-nbu",
    title: "Пам'ятні монети НБУ «ЗСУ», повний набір",
    description: "Повна серія у капсулах, стан UNC. Альбом для зберігання входить у вартість.",
    price: 3900,
    negotiable: false,
    category: "collectibles",
    city: "Черкаси",
    condition: "new",
    delivery: ["nova", "ukrposhta"],
    seller: sellers.andriy,
    hoursAgo: 150,
  },
  {
    id: "gitara-yamaha",
    title: "Акустична гітара Yamaha F310 + чохол",
    description: "Ідеально для початківців. Нові струни, чохол і каподастр у комплекті.",
    price: 3800,
    negotiable: true,
    category: "books",
    city: "Ужгород",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.iryna,
    hoursAgo: 170,
  },
  {
    id: "generator-konner",
    title: "Генератор Könner & Söhnen 3.5 кВт, інверторний",
    description: "Тихий інверторний генератор, напрацювання 60 мотогодин. Масло міняв за регламентом.",
    price: 24900,
    negotiable: true,
    category: "home",
    city: "Харків",
    condition: "used",
    delivery: ["nova", "pickup"],
    seller: sellers.andriy,
    hoursAgo: 190,
  },
  {
    id: "namet-turystychnyi",
    title: "Туристичний намет Naturehike 3-місний",
    description: "Двошаровий, вага 2,4 кг. Використовувався у двох походах Карпатами. Без дірок.",
    price: 4100,
    negotiable: true,
    category: "sport",
    city: "Львів",
    condition: "used",
    delivery: ["nova", "meest"],
    seller: sellers.shop,
    hoursAgo: 210,
  },
  {
    id: "kotenya",
    title: "Віддам кошеня в добрі руки",
    description: "Хлопчик, 3 місяці, привчений до лотка, оброблений від паразитів. Тільки в квартиру.",
    price: 0,
    negotiable: false,
    category: "home",
    city: "Київ",
    condition: "new",
    delivery: ["pickup"],
    seller: sellers.sofia,
    hoursAgo: 230,
  },
  {
    id: "videoreyestrator",
    title: "Відеореєстратор 70mai A810 4K з задньою камерою",
    description: "Повний комплект, працював пів року. Знімав, бо продав авто.",
    price: 3300,
    negotiable: true,
    category: "auto",
    city: "Одеса",
    condition: "used",
    delivery: ["nova"],
    seller: sellers.taras,
    hoursAgo: 260,
  },
];

export const SEED_LISTINGS: Listing[] = seed.map(({ hoursAgo, views, ...rest }) => ({
  ...rest,
  createdAt: now - hoursAgo * H,
  images: [],
  views: views ?? 40 + ((rest.id.length * 37) % 260),
}));
