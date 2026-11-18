import type { Metadata } from "next";
import { DealFeed } from "@/components/market/deal-feed";

export const metadata: Metadata = {
  title: "Стрічка угод",
  description: "Гортайте пропозиції на весь екран. Стрічка підлаштовується під те, що ви лайкаєте й дивитеся.",
};

export default function FeedPage() {
  return <DealFeed />;
}
