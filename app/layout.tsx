import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AccessCodeGate from "@/components/AccessCodeGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://da-records.github.io/"),
  title: "TO Records",
  description: "Public directory of Department of Agriculture travel order records.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "TO Records",
    title: "Travel Order Records | DA Records",
    description: "Browse the public register of Department of Agriculture travel orders by office and travel date.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Travel Order Records public register" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel Order Records | DA Records",
    description: "Browse the public register of Department of Agriculture travel orders by office and travel date.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/tor_logo_white.png",
    shortcut: "/tor_logo_white.png",
    apple: "/tor_logo_white.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AccessCodeGate>{children}</AccessCodeGate></body>
    </html>
  );
}
