"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale, Product } from "../content";
import { searchIndexEntries } from "../document-search.mjs";

type SearchIndexEntry = {
  locale: Locale;
  product: Product;
  slug: string;
  path: string;
  group: string;
  title: string;
  description: string;
  headings: { id: string; title: string }[];
  skills: string[];
  relatedDocs: { label: string; path: string }[];
  content: string;
};

type SearchState = "idle" | "ready" | "error";

let searchIndexRequest: Promise<SearchIndexEntry[]> | undefined;

function loadSearchIndex() {
  searchIndexRequest ??= fetch("/search-index.json", { headers: { accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Search index returned ${response.status}`);
      const payload = await response.json() as { entries?: SearchIndexEntry[] };
      if (!Array.isArray(payload.entries)) throw new Error("Search index is missing entries");
      return payload.entries;
    });
  return searchIndexRequest;
}

export function SearchBox({ locale, placeholder, product }: { locale: Locale; placeholder: string; product?: Product }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchIndexEntry[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    if (!query || state === "ready") return;
    let current = true;
    void loadSearchIndex().then((items) => {
      if (!current) return;
      setEntries(items);
      setState("ready");
    }).catch(() => {
      if (current) setState("error");
    });
    return () => { current = false; };
  }, [query, state]);

  const results = useMemo(() => searchIndexEntries(
    entries.filter((entry) => entry.locale === locale && (!product || entry.product === product)),
    query,
  ) as SearchIndexEntry[], [entries, locale, product, query]);

  const openResult = (entry: SearchIndexEntry | undefined) => {
    if (entry) window.location.href = entry.path;
  };
  const activeResult = results[Math.min(activeIndex, Math.max(0, results.length - 1))];
  const expanded = Boolean(query);
  const displayState = expanded && state === "idle" ? "loading" : state;

  return (
    <div className="search-wrap">
      <span className="search-icon" aria-hidden="true">⌕</span>
      <input
        aria-activedescendant={expanded && activeResult ? `${listboxId}-${activeResult.slug}` : undefined}
        aria-autocomplete="list"
        aria-busy={displayState === "loading"}
        aria-controls={listboxId}
        aria-expanded={expanded}
        aria-haspopup="listbox"
        aria-label={placeholder}
        className="search-input"
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          if (state === "error") setState("idle");
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && results.length) {
            event.preventDefault();
            setActiveIndex((index) => Math.min(index + 1, results.length - 1));
          } else if (event.key === "ArrowUp" && results.length) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Escape") {
            setQuery("");
            setActiveIndex(0);
          } else if (event.key === "Enter") {
            openResult(activeResult);
          }
        }}
        placeholder={placeholder}
        ref={inputRef}
        role="combobox"
        value={query}
      />
      <kbd>⌘ K</kbd>
      {expanded && (
        <div className="search-results" id={listboxId} role="listbox">
          {displayState === "loading" ? (
            <p role="status">{locale === "zh" ? "正在搜索…" : "Searching…"}</p>
          ) : state === "error" ? (
            <p role="status">{locale === "zh" ? "搜索暂时不可用" : "Search is temporarily unavailable"}</p>
          ) : results.length ? results.map((doc, index) => (
            <a
              aria-selected={index === activeIndex}
              href={doc.path}
              id={`${listboxId}-${doc.slug}`}
              key={doc.path}
              onClick={() => setQuery("")}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
            >
              <span>{doc.title}</span><small>{doc.group}</small>
            </a>
          )) : <p>{locale === "zh" ? "没有匹配的文档" : "No matching docs"}</p>}
        </div>
      )}
    </div>
  );
}
