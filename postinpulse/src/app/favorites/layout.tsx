import type { Metadata } from "next";

export const metadata: Metadata = { title: "Обране" };

export default function Layout({ children }: LayoutProps<"/favorites">) {
  return children;
}
