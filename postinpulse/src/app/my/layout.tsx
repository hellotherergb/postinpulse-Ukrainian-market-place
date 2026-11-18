import type { Metadata } from "next";

export const metadata: Metadata = { title: "Мій кабінет" };

export default function Layout({ children }: LayoutProps<"/my">) {
  return children;
}
