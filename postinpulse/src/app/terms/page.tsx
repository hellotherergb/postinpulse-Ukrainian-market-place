import type { Metadata } from "next";
import { TermsText } from "@/components/market/terms-text";

export const metadata: Metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:py-12">
      <div className="rounded-2xl border bg-card p-5 sm:p-8">
        <TermsText />
      </div>
    </div>
  );
}
