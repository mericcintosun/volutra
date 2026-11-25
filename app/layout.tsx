import type { Metadata } from "next";
import { Karla, Zilla_Slab } from "next/font/google";
import { AppRail } from "@/components/app-rail";
import "./globals.css";

const zilla = Zilla_Slab({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-zilla",
});

const karla = Karla({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-karla",
});

export const metadata: Metadata = {
  title: {
    default: "Volutra: a 20-second spiral that shows when your dose wears off",
    template: "%s | Volutra",
  },
  description:
    "Draw a spiral on your phone or laptop. Volutra measures tremor frequency and strength in the browser and plots it against your levodopa dose time, so you and your neurologist can see when the dose starts wearing off.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${zilla.variable} ${karla.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <AppRail />
        <div className="pb-24 md:pb-0 md:pl-60 print:p-0">
          <main className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
