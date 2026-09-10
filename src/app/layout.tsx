import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RenovArte — Catálogo",
    template: "%s — RenovArte",
  },
  description:
    "Catálogo de productos de skincare y cosmética seleccionados por RenovArte.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-beige-200 bg-beige-100">
          <div className="mx-auto flex max-w-6xl items-center px-4 py-4">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-sage-700"
            >
              RenovArte
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>

        <footer className="border-t border-beige-200 bg-beige-100">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-sage-600">
            © {new Date().getFullYear()} RenovArte · Catálogo de referencia
          </div>
        </footer>
      </body>
    </html>
  );
}
