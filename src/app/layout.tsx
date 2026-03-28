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
    default: "CheckHire — The Trust-First Job Board",
    template: "%s | CheckHire",
  },
  description:
    "Every employer verified. Every salary shown. Your identity protected. The job board that eliminates scams, ghost jobs, and data harvesting.",
  openGraph: {
    type: "website",
    siteName: "CheckHire",
    title: "CheckHire — The Trust-First Job Board",
    description:
      "Every employer verified. Every salary shown. Your identity protected.",
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
