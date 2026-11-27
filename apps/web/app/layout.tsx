import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import { APP_NAME, LIBRARY_NAME, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { themeInitScript } from "@/lib/themeScript";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap" });
const body = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });

// Static, reader-independent metadata. Progress never appears here.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: APP_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: LIBRARY_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_GB",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Lantern Lane Library — Your reading challenge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/og-image.png", alt: "Lantern Lane Library — Your reading challenge" }],
  },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-icon.png" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF6EC" },
    { media: "(prefers-color-scheme: dark)", color: "#15130F" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set before paint by themeInitScript, so React must not warn about it.
    <html lang="en" data-theme="system" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
