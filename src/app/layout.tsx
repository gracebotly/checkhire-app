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
    default: "CheckHire — Safe Payments for Online Work",
    template: "%s | CheckHire",
  },
  description:
    "Work with anyone online — without the risk. Define the deal, lock the payment, release when the work is done. Freelancer keeps 100%.",
  openGraph: {
    type: "website",
    siteName: "CheckHire",
    title: "CheckHire — Safe Payments for Online Work",
    description:
      "Work with anyone online — without the risk. Escrow-backed deals for freelance gig work. Payments secured by Stripe.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "CheckHire — Safe Payments for Online Work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CheckHire — Safe Payments for Online Work",
    description:
      "Work with anyone online — without the risk. Escrow-backed deals for freelance gig work.",
    images: ["/og-default.png"],
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
        <meta name="theme-color" content="#1A7A6D" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
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
