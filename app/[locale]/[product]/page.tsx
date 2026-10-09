import { notFound } from "next/navigation";
import { ProductHome } from "@/components/Marketing";
import { Header, Footer } from "@/components/Shell";
import { locales, products, Locale, Product, brands } from "@/lib/content";
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    products.map((product) => ({ locale, product })),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { product } = await params;
  return { title: brands[product as Product]?.name };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; product: string }>;
}) {
  const { locale, product } = await params;
  if (
    !locales.includes(locale as Locale) ||
    !products.includes(product as Product)
  )
    notFound();
  const l = locale as Locale,
    p = product as Product;
  return (
    <>
      <Header locale={l} product={p} />
      <ProductHome locale={l} product={p} />
      <Footer locale={l} />
    </>
  );
}
