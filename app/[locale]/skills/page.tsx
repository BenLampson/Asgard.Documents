import { notFound } from "next/navigation";
import { ProductHomePage } from "@/app/components/ProductHomePage";
import { isLocale } from "@/app/content";

export function generateStaticParams() {
  return [{ locale: "zh" }, { locale: "en" }];
}

export default async function SkillsHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ProductHomePage locale={locale} product="skills" />;
}
