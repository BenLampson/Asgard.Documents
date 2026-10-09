import { notFound } from "next/navigation";
import { Portal } from "@/components/Marketing";
import { Header, Footer } from "@/components/Shell";
import { locales, Locale } from "@/lib/content";
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const l = locale as Locale;
  return (
    <>
      <Header locale={l} />
      <Portal locale={l} />
      <Footer locale={l} />
    </>
  );
}
