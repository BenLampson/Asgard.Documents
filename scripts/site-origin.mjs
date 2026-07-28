import assert from "node:assert/strict";

export const defaultSiteOrigin = "https://asgard.benlampson.cn";

export function getSiteOrigin(value = process.env.DOCS_SITE_ORIGIN) {
  const configuredValue = value === undefined ? defaultSiteOrigin : value.trim();
  assert.notEqual(configuredValue, "", "DOCS_SITE_ORIGIN must not be empty");
  let url;

  try {
    url = new URL(configuredValue);
  } catch {
    throw new Error(`DOCS_SITE_ORIGIN must be an absolute HTTPS origin: ${configuredValue}`);
  }

  assert.equal(url.protocol, "https:", "DOCS_SITE_ORIGIN must use HTTPS");
  assert.equal(url.username, "", "DOCS_SITE_ORIGIN must not contain credentials");
  assert.equal(url.password, "", "DOCS_SITE_ORIGIN must not contain credentials");
  assert.equal(url.pathname, "/", "DOCS_SITE_ORIGIN must not contain a path");
  assert.equal(url.search, "", "DOCS_SITE_ORIGIN must not contain a query string");
  assert.equal(url.hash, "", "DOCS_SITE_ORIGIN must not contain a fragment");

  return url.origin;
}
