import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "CheckHire — Safe Escrow for Gig Work",
    template: "%s | CheckHire",
  },
  description:
    "Create a deal, fund escrow, get paid. The safe way to hire and get hired for gig work. Zero freelancer fees. 72-hour auto-release.",
  openGraph: {
    type: "website",
    siteName: "CheckHire",
    title: "CheckHire — Safe Escrow for Gig Work",
    description:
      "You found each other. We make sure nobody gets screwed. Escrow-protected payments for freelance gigs.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d9488" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${plusJakarta.variable} ${GeistSans.variable} ${GeistMono.variable} font-sans antialiased text-slate-900 bg-white`}
      >
        {children}
      </body>
    </html>
  );
}
