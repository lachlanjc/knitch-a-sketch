import type { Metadata } from "next";

import localFont from "next/font/local";

import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const appSans = localFont({
  display: "swap",
  src: [
    {
      path: "./fonts/ABCDailySlabEdu-Regular.woff2",
      style: "normal",
      weight: "400",
    },
    {
      path: "./fonts/ABCDailySlabEdu-Bold.woff2",
      style: "normal",
      weight: "700",
    },
  ],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  description: "",
  title: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${appSans.variable} antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
