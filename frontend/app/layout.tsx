import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReachInbox Scheduler — Email Job Scheduler",
  description:
    "Production-grade email scheduler built with BullMQ, Redis, and Next.js. Schedule and track email campaigns with real-time status updates.",
  keywords: ["email scheduler", "BullMQ", "Redis", "email campaign", "ReachInbox"],
  authors: [{ name: "ReachInbox" }],
  openGraph: {
    title: "ReachInbox Scheduler",
    description: "Schedule emails that always deliver — powered by BullMQ and Redis.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
