import { localeCopy, type Locale, type Product } from "../content";
import { getProductMetadata, productHomePath, productReleasePath } from "../product-registry";
import { SearchBox } from "./SearchBox";

export function Brand({ label = "ECOSYSTEM" }: { label?: string }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span><b>Asgard</b><small>{label}</small></span>
    </span>
  );
}

export function SiteHeader({ locale, pageSlug, product }: { locale: Locale; pageSlug?: string; product?: Product }) {
  const copy = localeCopy[locale];
  const alternate = locale === "zh" ? "en" : "zh";
  const metadata = product ? getProductMetadata(product) : null;
  const languageUrl = product ? (pageSlug ? `/${alternate}/${product}/docs/${pageSlug}` : `/${alternate}/${product}`) : `/${alternate}`;
  const homeUrl = product ? productHomePath(product, locale) : `/${locale}`;
  const version = metadata?.versionLabel(locale) ?? copy.version;
  const versionUrl = product ? productReleasePath(product, locale) : `/${locale}/asgard/docs/release-notes`;
  const githubUrl = metadata?.repositoryUrl ?? "https://github.com/BenLampson/Asgard";

  return (
    <header className="site-header">
      <a className="brand-link" href={homeUrl} aria-label="Asgard Docs home"><Brand label={product?.toUpperCase()} /></a>
      <nav className="top-nav" aria-label="Primary navigation">
        <a href={`/${locale}`}>{locale === "zh" ? "生态" : "Ecosystem"}</a>
        <a href={`/${locale}/asgard`}>Asgard</a>
        <a href={`/${locale}/heimdall`}>Heimdall</a>
        <a href={`/${locale}/skills`}>AI Ready</a>
      </nav>
      <div className="header-actions">
        <SearchBox locale={locale} placeholder={copy.search as string} product={product} />
        <a className="version-pill" href={versionUrl}>{version}</a>
        <a className="language-link" href={languageUrl}>{alternate.toUpperCase()}</a>
        <a className="github-link" href={githubUrl} target="_blank" rel="noreferrer">{copy.github}</a>
      </div>
    </header>
  );
}
