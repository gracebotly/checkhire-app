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
    default: "CheckHire — The Safe Way to Work With Anyone Online",
    template: "%s | CheckHire",
  },
  description:
    "Never get scammed again when paying someone online. Define the work, lock the payment, get protected — before anything starts. Zero freelancer fees.",
  openGraph: {
    type: "website",
    siteName: "CheckHire",
    title: "CheckHire — The Safe Way to Work With Anyone Online",
    description:
      "Turn any online deal into a protected transaction. Define the work, lock the payment, release with confidence.",
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
