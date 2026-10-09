"use client";
import Link from "next/link";
import { Brand } from "./Brand";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, Github, X, Menu, ArrowUpRight } from "lucide-react";
import { brands, type Locale, type Product } from "@/lib/products";
type SearchDoc = {
  title: string;
  description: string;
  body: string;
  url: string;
  locale: string;
  product: string;
};
export function Header({
  locale,
  product,
}: {
  locale: Locale;
  product?: Product;
}) {
  const zh = locale === "zh",
    pathname = usePathname();
  const [open, setOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [docs, setDocs] = useState<SearchDoc[]>([]),
    [error, setError] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    wasOpen = useRef(false);
  const alt = pathname.startsWith("/zh")
    ? pathname.replace(/^\/zh/, "/en")
    : pathname.startsWith("/en")
      ? pathname.replace(/^\/en/, "/zh")
      : "/en/";
  useEffect(() => {
    document.documentElement.lang = zh ? "zh-CN" : "en";
  }, [zh]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setError(false);
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) trigger.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    input.current?.focus();
    const controller = new AbortController();
    fetch("/search-index.json", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data: SearchDoc[]) => {
        setDocs(data);
        setError(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [open]);
  const results = docs
    .filter((d) => d.locale === locale)
    .map((d) => ({
      ...d,
      score: query.trim()
        ? query
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .reduce(
              (s, q) =>
                s +
                (d.title.toLowerCase().includes(q) ? 10 : 0) +
                (d.description.toLowerCase().includes(q) ? 3 : 0) +
                (d.body.toLowerCase().includes(q) ? 1 : 0),
              0,
            )
        : 1,
    }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <>
      <header className="site-header">
        <Link
          className="wordmark"
          href={`/${locale}/`}
          aria-label="Asgard home"
        >
          <Brand />
        </Link>
        <nav
          className={mobile ? "global-nav expanded" : "global-nav"}
          aria-label={zh ? "主导航" : "Main navigation"}
        >
          {[
            ["", zh ? "生态" : "Ecosystem"],
            ["asgard", "Asgard"],
            ["heimdall", "Heimdall"],
            ["skills", "AI Ready"],
          ].map(([p, t]) => (
            <Link
              className={product === p || (!product && !p) ? "active" : ""}
              key={p}
              href={`/${locale}/${p ? p + "/" : ""}`}
              onClick={() => setMobile(false)}
            >
              {t}
            </Link>
          ))}
        </nav>
        <button
          ref={trigger}
          className="search-trigger"
          onClick={() => {
            setError(false);
            setOpen(true);
          }}
          aria-label={zh ? "搜索文档" : "Search documentation"}
        >
          <Search size={15} />
          <span>{zh ? "搜索文档…" : "Search documentation…"}</span>
          <kbd>⌘ K</kbd>
        </button>
        <Link href={alt} className="locale-link">
          {zh ? "中文 / EN" : "EN / 中文"}
        </Link>
        <a
          className="github-link"
          href={`https://github.com/BenLampson/${brands[product || "asgard"].repo}`}
          aria-label="GitHub"
        >
          <Github size={19} />
        </a>
        <button
          className="mobile-menu"
          onClick={() => setMobile((v) => !v)}
          aria-expanded={mobile}
          aria-label={zh ? "菜单" : "Menu"}
        >
          <Menu size={21} />
        </button>
      </header>
      {open && (
        <div className="dialog-backdrop" onClick={close}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-title"
            className="search-dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const controls = e.currentTarget.querySelectorAll<HTMLElement>(
                  "button,input,a[href]",
                );
                const first = controls[0],
                  last = controls[controls.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="search-dialog-header">
              <Search size={20} />
              <input
                ref={input}
                id="search-title"
                aria-label={zh ? "搜索文档" : "Search documentation"}
                placeholder={
                  zh
                    ? "搜索指南、API、配置…"
                    : "Search guides, APIs, configuration…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                onClick={close}
                aria-label={zh ? "关闭搜索" : "Close search"}
              >
                <X size={20} />
              </button>
            </div>
            <div className="search-results">
              {error ? (
                <p role="alert">
                  {zh
                    ? "搜索索引未能加载，请重试。"
                    : "Could not load the search index. Please try again."}
                </p>
              ) : results.length ? (
                results.map((d) => (
                  <Link key={d.url} href={d.url} onClick={close}>
                    <small>{d.product}</small>
                    <strong>{d.title}</strong>
                    <span>{d.description}</span>
                    <ArrowUpRight size={16} />
                  </Link>
                ))
              ) : (
                <p>{zh ? "没有找到相关文档" : "No matching documents"}</p>
              )}
            </div>
            <p className="search-hint">
              {zh
                ? "Tab 选择 · Enter 打开 · Esc 关闭"
                : "Tab to select · Enter to open · Esc to close"}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
export function Footer({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const alternate = pathname.startsWith("/zh")
    ? pathname.replace(/^\/zh/, "/en")
    : pathname.startsWith("/en")
      ? pathname.replace(/^\/en/, "/zh")
      : "/en/";
  return (
    <footer className="site-footer">
      <div>
        <Brand />
        <span>Knowledge for the next move.</span>
      </div>
      <nav>
        {["asgard", "heimdall", "skills"].map((p) => (
          <Link href={`/${locale}/${p}/`} key={p}>
            {p === "skills" ? "Skills" : p[0].toUpperCase() + p.slice(1)}
          </Link>
        ))}
        <a href="https://github.com/BenLampson">GitHub ↗</a>
        <Link href={alternate}>{locale === "zh" ? "English" : "中文"}</Link>
      </nav>
    </footer>
  );
}
