import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsShell } from "../../../../components/DocsShell";
import { findProductDoc, getProductDocs, isLocale } from "../../../../content";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return (["zh", "en"] as const).flatMap((locale) =>
    getProductDocs(locale, "heimdall").map((doc) => ({ locale, slug: doc.slug })),
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const doc = findProductDoc(locale, "heimdall", slug);
  return doc ? { title: doc.title, description: doc.description } : {};
}

export default async function HeimdallDocRoute({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const doc = findProductDoc(locale, "heimdall", slug);
  if (!doc) notFound();
  return <DocsShell locale={locale} product="heimdall" doc={doc} />;
}
