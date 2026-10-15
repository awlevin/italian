import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: { default: "Ponte — Italian from Spanish", template: "%s · Ponte" },
  description: "A fast Italian crash course for Spanish speakers. Built for a trip that starts tomorrow.",
  appleWebApp: { capable: true, title: "Ponte", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6efe3" },
    { media: "(prefers-color-scheme: dark)", color: "#17120d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="relative min-h-full">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "var(--accent)",
              colorBackground: "var(--card)",
              colorForeground: "var(--ink)",
              colorMutedForeground: "var(--ink-2)",
              colorInput: "var(--paper)",
              colorInputForeground: "var(--ink)",
              colorBorder: "var(--line)",
              colorNeutral: "var(--ink)",
              colorDanger: "var(--wrong)",
              colorSuccess: "var(--olive)",
              colorPrimaryForeground: "var(--accent-ink)",
              fontFamily: "var(--font-body)",
              borderRadius: "0.85rem",
            },
          }}
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
