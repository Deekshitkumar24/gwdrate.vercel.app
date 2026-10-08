import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DyeBackground from "@/components/DyeBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GWD Team Rating Platform | Live Competition Evaluation",
  description:
    "Authoritative peer-evaluation platform for hackathons, pitch rounds, and live competitions with fluid red DyeWhorl visual identity.",
  icons: {
    icon: "/logos/gwd.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0507] text-[#f5f5f7] relative">
        <DyeBackground />
        <div className="relative z-10 flex-1 flex flex-col min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
