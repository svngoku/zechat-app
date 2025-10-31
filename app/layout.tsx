import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";

// Load custom fonts
const funnelDisplay = localFont({
  src: "../public/fonts/funneldisplay.ttf",
  variable: "--font-funnel-display",
  display: "swap",
});

const funnelSans = localFont({
  src: "../public/fonts/funnelsans.ttf",
  variable: "--font-funnel-sans",
  display: "swap",
});

const fragmentMono = localFont({
  src: "../public/fonts/fragment-mono.ttf",
  variable: "--font-fragment-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ZeChat - ZeroEntropy Chat Interface",
    template: "%s | ZeChat"
  },
  description: "Advanced chat interface with AI capabilities powered by ZeroEntropy",
  keywords: ["chat", "AI", "ZeroEntropy", "artificial intelligence", "conversation"],
  authors: [{ name: "ZeroEntropy Team" }],
  creator: "ZeroEntropy",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://zeroentropy.dev",
    title: "ZeChat - ZeroEntropy Chat Interface",
    description: "Advanced chat interface with AI capabilities powered by ZeroEntropy",
    siteName: "ZeChat",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZeChat - ZeroEntropy Chat Interface",
    description: "Advanced chat interface with AI capabilities powered by ZeroEntropy",
    creator: "@zeroentropy",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
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
        className={`${funnelDisplay.variable} ${funnelSans.variable} ${fragmentMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
