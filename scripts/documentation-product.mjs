/** @typedef {"asgard" | "heimdall" | "skills"} DocumentationProduct */

/** @type {readonly DocumentationProduct[]} */
export const documentationProducts = ["asgard", "heimdall", "skills"];

/**
 * Keep legacy globally unique slugs mapped to one scoped site.
 * New ecosystem sites must add their rule here before the Asgard fallback.
 *
 * @param {string} slug
 * @returns {DocumentationProduct}
 */
export function productForDocumentationSlug(slug) {
  if (slug === "ai-ready" || slug.startsWith("skills-")) return "skills";
  if (slug.startsWith("heimdall")) return "heimdall";
  return "asgard";
}
