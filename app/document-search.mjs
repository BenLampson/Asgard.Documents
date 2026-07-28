/**
 * @typedef {{
 *   title: string;
 *   description: string;
 *   group: string;
 *   eyebrow: string;
 *   sections: Array<{
 *     title: string;
 *     paragraphs?: string[];
 *     bullets?: string[];
 *     note?: string;
 *     code?: { value: string };
 *   }>;
 }} SearchableDocument
 */

export function normalizeSearchText(value) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function joinText(values) {
  return values.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/** @param {SearchableDocument} doc */
export function searchableDocumentFields(doc) {
  const headings = doc.sections.map((section) => section.title);
  const body = doc.sections.flatMap((section) => [
    ...(section.paragraphs ?? []),
    ...(section.bullets ?? []),
    ...(section.links ?? []).flatMap((link) => [link.label, link.href]),
    section.note ?? "",
  ]);
  const code = doc.sections.map((section) => section.code?.value ?? "");

  return {
    title: joinText([doc.title]),
    description: joinText([doc.description]),
    metadata: joinText([doc.group, doc.eyebrow]),
    headings: joinText(headings),
    body: joinText(body),
    code: joinText(code),
  };
}

/** @param {SearchableDocument} doc */
export function searchableContent(doc, additionalContent = []) {
  return joinText([...Object.values(searchableDocumentFields(doc)), ...additionalContent]);
}

function scoreField(field, needle, terms, phraseScore, termScore) {
  const normalized = normalizeSearchText(field);
  let score = normalized.includes(needle) ? phraseScore : 0;
  for (const term of terms) {
    if (normalized.includes(term)) score += termScore;
  }
  return score;
}

/**
 * Search complete authored content, including code samples and exact API/configuration identifiers.
 * Results are ranked before the display limit is applied so earlier broad guides cannot hide a
 * later exact match.
 *
 * @template {SearchableDocument} T
 * @param {T[]} documents
 * @param {string} query
 * @param {number} [limit]
 * @returns {T[]}
 */
function rankSearchItems(items, query, limit, getFields) {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  const terms = needle.split(" ").filter(Boolean);

  return items
    .map((item, index) => {
      const fields = getFields(item);
      const normalizedContent = normalizeSearchText(joinText(Object.values(fields)));
      if (!terms.every((term) => normalizedContent.includes(term))) return null;

      const score =
        scoreField(fields.title, needle, terms, 1_000, 160) +
        scoreField(fields.description, needle, terms, 420, 80) +
        scoreField(fields.metadata, needle, terms, 180, 35) +
        scoreField(fields.headings, needle, terms, 320, 65) +
        scoreField(fields.body, needle, terms, 100, 15) +
        scoreField(fields.code, needle, terms, 260, 45);

      return { item, index, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((result) => result.item);
}

export function searchDocuments(documents, query, limit = 6) {
  return rankSearchItems(documents, query, limit, searchableDocumentFields);
}

/**
 * @param {Array<{
 *   title: string;
 *   description: string;
 *   group: string;
 *   headings?: Array<{ title: string }>;
 *   skills?: string[];
 *   relatedDocs?: Array<{ label: string; path: string }>;
 *   content: string;
 * }>} entries
 * @param {string} query
 * @param {number} [limit]
 */
export function searchIndexEntries(entries, query, limit = 6) {
  return rankSearchItems(entries, query, limit, (entry) => ({
    title: entry.title,
    description: entry.description,
    metadata: entry.group,
    headings: joinText((entry.headings ?? []).map((heading) => heading.title)),
    body: entry.content,
    code: joinText([
      ...(entry.skills ?? []),
      ...(entry.relatedDocs ?? []).flatMap((related) => [related.label, related.path]),
    ]),
  }));
}
