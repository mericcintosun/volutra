import type { Metadata } from "next";
import { Karla, Zilla_Slab } from "next/font/google";
import { AppRail } from "@/components/app-rail";
import { SITE_URL } from "@/lib/config";
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

const TITLE = "Volutra: a spiral that times wearing-off";
// 125 characters, under the 160 limit
const DESCRIPTION =
  "Parkinson's dose wear-off is told from memory. Draw a 20-second spiral and Volutra charts your tremor against your dose time.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | Volutra",
  },
  description: DESCRIPTION,
  // the image comes from app/opengraph-image.tsx (1200x630)
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: "Volutra", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${zilla.variable} ${karla.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <AppRail />
        <div className="pb-24 md:pb-0 md:pl-60 print:p-0">
          <main className="mx-auto max-w-6xl px-5 py-6 md:px-10 md:py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
