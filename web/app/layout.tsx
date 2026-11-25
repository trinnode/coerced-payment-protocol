import type { Metadata, Viewport } from "next";
import { Telemetry } from "@/components/site/telemetry";
import "./globals.css";

/* Kept in step with --color-base in app/globals.css. */
const BASE_COLOUR = "#050807";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Phylax — coerced-payment incident infrastructure",
    template: "%s · Phylax",
  },
  description:
    "A safer signal when consent is taken away. Coerced-payment signalling and incident coordination for Nigerian financial institutions. Design record, not a live product.",
  applicationName: "Phylax",
  authors: [{ name: "The Phylax project" }],
  keywords: [
    "coerced payments",
    "duress signal",
    "fraud operations",
    "NIP",
    "NIBSS",
    "Nigeria",
    "financial safety",
  ],
  openGraph: {
    type: "website",
    locale: "en_NG",
    title: "Phylax — coerced-payment incident infrastructure",
    description:
      "A safer signal when consent is taken away. Institution-led design record for signalling and coordinating suspected coerced payments.",
    siteName: "Phylax",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: BASE_COLOUR,
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="min-h-dvh bg-base text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:border focus:border-guard focus:bg-base focus:px-4 focus:py-2 focus:text-body focus:text-guard"
        >
          Skip to content
        </a>
        <Telemetry />
        {children}
      </body>
    </html>
  );
}
