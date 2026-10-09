import productMetadata from "./products.json";
/** Client-safe product metadata shared by navigation, marketing and document shells. */
export type Locale = "zh" | "en";
export type Product = "asgard" | "heimdall" | "skills";
export const locales: Locale[] = ["zh", "en"];
export const products: Product[] = ["asgard", "heimdall", "skills"];
export const brands = productMetadata;
export function productVersionLabel(product: Product, locale: Locale): string {
  return product === "skills"
    ? locale === "zh"
      ? "30 项 Skills"
      : brands.skills.version
    : `v${brands[product].version}`;
}
export function productHomePath(locale: Locale, product: Product): string {
  return `/${locale}/${product}/`;
}
export function productDocPath(
  locale: Locale,
  product: Product,
  slug: string,
): string {
  return `/${locale}/${product}/docs/${slug}/`;
}
