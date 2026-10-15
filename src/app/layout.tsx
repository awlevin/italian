import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { clerkAppearance, clerkLocalization } from "@/lib/clerk-theme";
import "./clerk.css";
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
  title: { default: "Ponte — Learn Italian", template: "%s · Ponte" },
  description: "Learn Italian.",
  applicationName: "Ponte",
  appleWebApp: { capable: true, title: "Ponte", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceef3" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1129" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="relative min-h-full">
        <ClerkProvider appearance={clerkAppearance} localization={clerkLocalization}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
