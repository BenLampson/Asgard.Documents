"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import {
  Copy,
  Check,
  X,
  PanelRightOpen,
  ListFilter,
  Menu,
  ArrowLeft,
  ArrowRight,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import type { Doc } from "@/lib/content";
type Heading = { id: string; text: string; level: number };
export function CopyButton({
  text,
  label,
  copiedLabel,
}: {
  text: string;
  label: string;
  copiedLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <button
      className="copy-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("failed");
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setState("idle"), 2000);
      }}
    >
      {state === "done" ? <Check size={14} /> : <Copy size={14} />}
      <span aria-live="polite">
        {state === "done"
          ? copiedLabel || "Copied"
          : state === "failed"
            ? "Copy failed"
            : label}
      </span>
    </button>
  );
}
export function CodeBlock({
  children,
  language = "code",
  ...props
}: React.ComponentProps<"pre"> & { language?: string }) {
  const ref = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState("Copy");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <span>{language.toUpperCase()}</span>
        <button
          className="copy-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                ref.current?.textContent || "",
              );
              setStatus("Copied");
            } catch {
              setStatus("Copy failed");
            }
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setStatus("Copy"), 2000);
          }}
          data-copied={status === "Copied" ? "true" : undefined}
          aria-label="Copy code"
        >
          <Copy size={14} />
          <span aria-live="polite">{status}</span>
        </button>
      </div>
      <pre ref={ref} {...props}>
        {children}
      </pre>
    </div>
  );
}
export function Reader({
  doc,
  docs,
  headings,
  children,
  version,
}: {
  doc: Doc;
  docs: Pick<Doc, "url" | "title" | "section" | "slug">[];
  headings: Heading[];
  children: React.ReactNode;
  version: string;
}) {
  const zh = doc.locale === "zh";
  const [panel, setPanel] = useState(false),
    [tree, setTree] = useState(false),
    [filter, setFilter] = useState(""),
    [task, setTask] = useState(""),
    [compact, setCompact] = useState(false);
  const opener = useRef<HTMLButtonElement>(null),
    closer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (panel) closer.current?.focus();
  }, [panel]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 980px)");
    const resize = () => setCompact(media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (!panel || !compact) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [panel, compact]);
  const groups = [...new Set(docs.map((d) => d.section))];
  const current = docs.findIndex((d) => d.slug === doc.slug),
    previous = docs[current - 1],
    next = docs[current + 1];
  const context = `# ${doc.title}\n\nProduct: ${doc.product} ${version}\nGuide: ${doc.url}\n\n${doc.body}\n\n## Task\n${task || (zh ? "请先阅读来源与相关 Skills，再按工程约定实施并验证。" : "Read the source evidence and relevant Skills before implementing and verifying the task.")}\n\n${zh ? "只把已验证的行为当作事实；说明未验证的边界。" : "Treat only verified behavior as fact; disclose unverified boundaries."}`;
  const close = () => {
    setPanel(false);
    opener.current?.focus();
  };
  return (
    <div className={`reader-layout ${panel ? "context-open" : ""}`}>
      <button
        className="tree-toggle"
        aria-expanded={tree}
        onClick={() => setTree((v) => !v)}
      >
        <Menu size={16} />
        {zh ? "文档目录" : "Documentation"}
      </button>
      <aside
        className={`doc-tree ${tree ? "tree-open" : ""}`}
        aria-label={zh ? "文档导航" : "Documentation navigation"}
      >
        <label className="tree-filter">
          <ListFilter size={14} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={zh ? "筛选文档…" : "Filter topics…"}
          />
        </label>
        {groups.map((section) => (
          <div className="tree-group" key={section}>
            <h2>{section}</h2>
            {docs
              .filter(
                (d) =>
                  d.section === section &&
                  `${d.title} ${d.slug}`
                    .toLowerCase()
                    .includes(filter.trim().toLowerCase()),
              )
              .map((d) => (
                <Link
                  key={d.url}
                  href={d.url}
                  aria-current={d.slug === doc.slug ? "page" : undefined}
                  onClick={() => setTree(false)}
                >
                  {d.title}
                </Link>
              ))}
          </div>
        ))}
        <div className="tree-agents">
          <small>ALSO FOR AGENTS</small>
          <a href={`${doc.url}index.html.md`}>
            Markdown <ArrowUpRight size={12} />
          </a>
          <Link href={`/${doc.locale}/skills/`}>
            Skills <ArrowUpRight size={12} />
          </Link>
        </div>
      </aside>
      <main className="article-workspace" id="main-content">
        <article className="doc-article">
          <header className="article-header">
            <div className="article-eyebrow">
              {doc.product.toUpperCase()} / DOCUMENTATION{" "}
              <span>{zh ? "当前版本" : "Current version"}</span>
            </div>
            <h1>{doc.title}</h1>
            <p className="article-summary">{doc.description}</p>
            <p className="article-meta">
              {doc.product === "asgard"
                ? "Asgard"
                : doc.product === "heimdall"
                  ? "Heimdall"
                  : "Skills"}{" "}
              · {version}
            </p>
            <div className="article-actions">
              <a href={`${doc.url}index.html.md`}>
                <FileText size={14} />
                Markdown
              </a>
              <Link href={`/${doc.locale}/skills/`}>
                Skills <ArrowUpRight size={13} />
              </Link>
              {headings.find((h) => h.id.startsWith("source")) && (
                <a
                  href={`#${headings.find((h) => h.id.startsWith("source"))!.id}`}
                >
                  {zh ? "来源依据" : "Source evidence"}
                </a>
              )}
              <button
                ref={opener}
                onClick={() => {
                  setCompact(window.matchMedia("(max-width: 980px)").matches);
                  setPanel(true);
                }}
                aria-expanded={panel}
              >
                <PanelRightOpen size={14} />
                {zh ? "准备 Agent 上下文" : "Prepare agent context"}
              </button>
            </div>
          </header>
          <div className="prose">{children}</div>
          <nav
            className="article-pagination"
            aria-label={zh ? "相邻文档" : "Adjacent documents"}
          >
            {previous ? (
              <Link href={previous.url}>
                <ArrowLeft size={15} />
                <span>
                  <small>{zh ? "上一篇" : "Previous"}</small>
                  {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.url}>
                <span>
                  <small>{zh ? "下一篇" : "Next"}</small>
                  {next.title}
                </span>
                <ArrowRight size={15} />
              </Link>
            )}
          </nav>
        </article>
      </main>
      {panel && compact && (
        <button
          className="context-backdrop"
          aria-label={zh ? "关闭上下文" : "Close context backdrop"}
          tabIndex={-1}
          onClick={close}
        />
      )}
      {panel ? (
        <aside
          className="context-panel"
          role={compact ? "dialog" : undefined}
          aria-modal={compact ? true : undefined}
          aria-label={zh ? "Agent 上下文" : "Agent context"}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
            if (compact && e.key === "Tab") {
              const controls = e.currentTarget.querySelectorAll<HTMLElement>(
                "button,textarea,a[href]",
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
          <div className="context-label">
            <span>CONTEXT / AGENT</span>
            <button
              ref={closer}
              aria-label={zh ? "关闭上下文" : "Close context"}
              onClick={close}
            >
              <X size={17} />
            </button>
          </div>
          <h2>
            {zh ? "带着依据，\n开始下一步。" : "Context for\nthe next move."}
          </h2>
          <p>
            {zh
              ? "把当前指南、来源和任务整理在一起，交给你正在使用的 Agent。"
              : "Prepare this guide, its sources and your task for the agent you use."}
          </p>
          <div className="context-included">
            <small>{zh ? "已包含的上下文" : "INCLUDED CONTEXT"}</small>
            <strong>{doc.title}</strong>
            <span>
              {doc.product} · {version}
            </span>
            <span>
              {zh
                ? "完整 Markdown · 源码链接 · 工程边界"
                : "Full Markdown · Source links · Engineering boundaries"}
            </span>
          </div>
          <div className="context-preview">
            <small>context.md</small>
            <pre>{`# ${doc.title}\n\n${doc.description}\n\n${zh ? "包含完整指南及其来源。" : "Includes the full guide and source evidence."}`}</pre>
          </div>
          <label className="task-label" htmlFor="agent-task">
            {zh ? "补充你的任务" : "ADD YOUR TASK"}
          </label>
          <textarea
            id="agent-task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder={
              zh
                ? "例如：依据这篇指南创建一个最小应用…"
                : "For example: create a minimal application using this guide…"
            }
          />
          <CopyButton
            text={context}
            label={zh ? "复制完整上下文" : "Copy complete context"}
            copiedLabel={zh ? "已复制" : "Copied"}
          />
          <p className="context-note">
            {zh
              ? "上下文在本地生成。复制后粘贴到你的 Agent；这里不会发送任务或生成 AI 回答。"
              : "Context is assembled locally. Paste it into your agent; this page does not send tasks or generate AI answers."}
          </p>
        </aside>
      ) : (
        <aside className="reading-rail">
          <h2>{zh ? "本页目录" : "ON THIS PAGE"}</h2>
          <nav>
            {headings.map((h) => (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={h.level === 3 ? "sub" : ""}
              >
                {h.text}
              </a>
            ))}
          </nav>
          <div>
            <small>AGENT WORKFLOW</small>
            <Link href={`/${doc.locale}/skills/docs/workflow/`}>
              {zh ? "选择、加载与验证" : "Select, load and verify"} ↗
            </Link>
          </div>
          <div>
            <small>READ AS MARKDOWN</small>
            <a href={`${doc.url}index.html.md`}>index.html.md ↗</a>
          </div>
        </aside>
      )}
    </div>
  );
}
