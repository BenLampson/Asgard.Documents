import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { DocumentLanguage } from "./components/DocumentLanguage";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const docsSiteOrigin = process.env.DOCS_SITE_ORIGIN ?? "https://asgard.benlampson.cn";

export const metadata: Metadata = {
  title: {
    default: "Asgard Docs v5.1.3 — AI Ready .NET Application Framework",
    template: "%s · Asgard Docs",
  },
  description:
    "Asgard framework, Heimdall identity provider, integrations, and AI-ready development guides in Chinese and English.",
  metadataBase: new URL(docsSiteOrigin),
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Asgard Docs v5.1.3",
    description: "Build modular .NET systems with an AI-ready framework.",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asgard Docs",
    description: "The AI-ready .NET application framework.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${mono.variable}`}>
        <DocumentLanguage />
        {children}
      </body>
    </html>
  );
}
