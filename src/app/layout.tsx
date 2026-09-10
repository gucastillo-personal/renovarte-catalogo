import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const description =
  "Catálogo de productos de skincare y cosmética seleccionados por RenovArte · Spa de piel.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RenovArte — Catálogo",
    template: "%s — RenovArte",
  },
  description,
  applicationName: "RenovArte",
  openGraph: {
    type: "website",
    siteName: "RenovArte",
    locale: "es_AR",
    title: "RenovArte — Catálogo",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "RenovArte — Catálogo",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f1e8",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b border-beige-200 bg-beige-100">
          <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
            <Link href="/" aria-label="RenovArte — inicio">
              <Image
                src="/brand/logo-wordmark.svg"
                alt="RenovArte"
                width={230}
                height={45}
                priority
                unoptimized
                className="h-9 w-auto sm:h-10"
              />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-beige-200 bg-beige-100">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-sage-600">
            © {new Date().getFullYear()} RenovArte · Spa de piel
          </div>
        </footer>
      </body>
    </html>
  );
}
