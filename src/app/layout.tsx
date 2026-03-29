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
      <body
        className={`${plusJakarta.variable} ${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
