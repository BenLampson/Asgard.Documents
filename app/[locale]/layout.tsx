import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@/app/globals.css";
export const metadata = {
  icons: { icon: "/favicon.svg" },
  title: { default: "Asgard · 阿斯加德", template: "%s · Asgard" },
  description:
    "AI-friendly .NET engineering. Framework contracts, identity and knowledge for people and agents.",
};
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  return (
    <html lang={locale === "en" ? "en" : "zh-CN"}>
      <body>{children}</body>
    </html>
  );
}
