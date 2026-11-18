import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SiteFooter } from "@/components/market/site-footer";
import { Logo } from "@/components/market/logo";
import { SiteHeader } from "@/components/market/site-header";
import { AuthProvider } from "@/lib/auth";
import { MarketProvider } from "@/lib/store";
import { PathHide } from "@/components/market/path-hide";
import { TermsGate } from "@/components/market/terms-gate";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://postinpulse.com"),
  title: {
    default: "POST IN PULSE — маркетплейс України",
    template: "%s · POST IN PULSE",
  },
  description:
    "Купуйте та продавайте нове й вживане по всій Україні. Доставка Новою поштою, Укрпоштою та Meest, безпечна угода без комісії для покупця.",
  openGraph: {
    title: "POST IN PULSE",
    description:
      "Купуйте та продавайте нове й вживане по всій Україні. Ціни в гривнях, доставка Новою поштою.",
    images: [{ url: "/brand/lockup.png", width: 1036, height: 831, alt: "POST IN PULSE" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full min-w-0 flex-col">
        <AuthProvider>
        <MarketProvider>
          <Suspense
            fallback={
              <header className="sticky top-0 z-40 border-b bg-background">
                <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
                  <Logo />
                </div>
              </header>
            }
          >
            <SiteHeader />
          </Suspense>
          <main className="min-w-0 flex-1">{children}</main>
          <Suspense fallback={null}>
            <PathHide hideOn="/feed">
              <SiteFooter />
            </PathHide>
          </Suspense>
          <Suspense fallback={null}>
            <TermsGate />
          </Suspense>
          <Toaster position="top-center" richColors />
        </MarketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
