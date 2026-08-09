import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import VersionBadge from "@/components/version-badge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gondrongecommerce.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GondrongShop — Demo Marketplace",
    template: "%s — GondrongShop",
  },
  description:
    "A full-stack demo marketplace built with Next.js, Supabase, and Tailwind. Multi-role e-commerce with simulated payments and shipping.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GondrongShop — Demo Marketplace",
    description:
      "A full-stack demo marketplace built with Next.js, Supabase, and Tailwind. Multi-role e-commerce with simulated payments and shipping.",
    url: SITE_URL,
    siteName: "GondrongShop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GondrongShop — Demo Marketplace",
    description:
      "A full-stack demo marketplace built with Next.js, Supabase, and Tailwind. Multi-role e-commerce with simulated payments and shipping.",
  },
};

export default async function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "GondrongShop",
              url: SITE_URL,
              description:
                "A full-stack demo marketplace built with Next.js, Supabase, and Tailwind. Multi-role e-commerce with simulated payments and shipping.",
            }),
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t">
          <div className="mx-auto flex h-12 max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-sm text-muted-foreground">
            <p>
              GondrongShop — demo marketplace. Payments and shipping are
              simulated.
            </p>
            <VersionBadge />
          </div>
        </footer>
      </body>
    </html>
  );
}