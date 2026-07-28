import type { Locale, Product } from "./content";
import { siteBaseline } from "./site-baseline";

type ProductPath = `/${Locale}/${Product}` | `/${Locale}/${Product}/docs/${string}`;

export type ProductMetadata = {
  id: Product;
  brandLabel: string;
  navigationLabel: Readonly<Record<Locale, string>>;
  versionLabel: (locale: Locale) => string;
  repositoryUrl: `https://github.com/${string}`;
  homePath: (locale: Locale) => ProductPath;
  releasePath: (locale: Locale) => ProductPath;
};

export const productRegistry = {
  asgard: {
    id: "asgard",
    brandLabel: siteBaseline.framework.name,
    navigationLabel: { zh: "Asgard", en: "Asgard" },
    versionLabel: () => `v${siteBaseline.framework.version}`,
    repositoryUrl: "https://github.com/BenLampson/Asgard",
    homePath: (locale) => `/${locale}/asgard`,
    releasePath: (locale) => `/${locale}/asgard/docs/release-notes`,
  },
  heimdall: {
    id: "heimdall",
    brandLabel: siteBaseline.heimdall.name,
    navigationLabel: { zh: "Heimdall", en: "Heimdall" },
    versionLabel: () => `v${siteBaseline.heimdall.version}`,
    repositoryUrl: "https://github.com/BenLampson/Asgard.Heimdall",
    homePath: (locale) => `/${locale}/heimdall`,
    releasePath: (locale) => `/${locale}/heimdall/docs/heimdall-release-notes`,
  },
  skills: {
    id: "skills",
    brandLabel: "Asgard Skills",
    navigationLabel: { zh: "AI Ready", en: "AI Ready" },
    versionLabel: (locale) => locale === "zh"
      ? `审阅于 ${siteBaseline.skills.reviewedAt}`
      : `Reviewed ${siteBaseline.skills.reviewedAt}`,
    repositoryUrl: "https://github.com/BenLampson/Asgard.Skills",
    homePath: (locale) => `/${locale}/skills`,
    releasePath: (locale) => `/${locale}/skills/docs/skills-release-notes`,
  },
} as const satisfies Record<Product, ProductMetadata>;

export function getProductMetadata(product: Product): ProductMetadata {
  return productRegistry[product];
}

export function productHomePath(product: Product, locale: Locale): ProductPath {
  return productRegistry[product].homePath(locale);
}

export function productReleasePath(product: Product, locale: Locale): ProductPath {
  return productRegistry[product].releasePath(locale);
}
