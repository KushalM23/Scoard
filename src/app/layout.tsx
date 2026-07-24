import type { Metadata, Viewport } from "next";
import { Parkinsans, Bungee, Jersey_15 } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SeasonProvider } from "@/providers/SeasonProvider";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";

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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Scoard",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1616",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-startup-image" href="/splash/apple-splash.png" />
      </head>
      <body
        className={`${parkinsans.variable} ${bungee.variable} ${jersey15.variable} font-sans antialiased`}
      >
        <SeasonProvider>
          <ServiceWorkerRegistration />
          {children}
        </SeasonProvider>
      </body>
    </html>
  );
}
