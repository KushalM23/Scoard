import type { Metadata } from "next";
import { Parkinsans, Bungee, Jersey_15 } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const parkinsans = Parkinsans({
  subsets: ["latin"],
  variable: "--font-parkinsans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: false,
});

const bungee = Bungee({
  subsets: ["latin"],
  variable: "--font-bungee",
  weight: ["400"],
});

const jersey15 = Jersey_15({
  subsets: ["latin"],
  variable: "--font-jersey",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Scoard!",
  description: "NBA Scores and Statistics",
  icons: {
    icon: "/logo.png",
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
        className={`${parkinsans.variable} ${bungee.variable} ${jersey15.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
