import type { Metadata } from "next";

export const metadata: Metadata = { title: "Адмін" };

export default function Layout({ children }: LayoutProps<"/admin">) {
  return children;
}
