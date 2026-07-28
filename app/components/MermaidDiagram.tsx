"use client";

import { useEffect, useId, useState } from "react";

type MermaidDiagramProps = { value: string; locale: "zh" | "en" };

export function MermaidDiagram({ value, locale }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const labels = locale === "zh"
    ? { aria: "Mermaid 架构图", close: "关闭", expand: "放大", source: "查看 Mermaid 源码", loading: "正在渲染架构图…", error: "Mermaid 图渲染失败：", badge: "架构图" }
    : { aria: "Mermaid architecture diagram", close: "Close", expand: "Expand", source: "View Mermaid source", loading: "Rendering architecture diagram…", error: "Mermaid diagram could not be rendered: ", badge: "ARCHITECTURE DIAGRAM" };

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
        const result = await mermaid.render(id, value);
        if (!cancelled) setSvg(result.svg);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [reactId, value]);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return (
    <div className={`mermaid-block${expanded ? " mermaid-expanded" : ""}`} aria-label={labels.aria}>
      {expanded ? <button className="mermaid-backdrop" type="button" aria-label={labels.close} onClick={() => setExpanded(false)} /> : null}
      <div className="mermaid-toolbar">
        <span>{labels.badge}</span>
        {svg ? <button type="button" className="mermaid-expand-button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? labels.close : labels.expand} ↗</button> : null}
      </div>
      {svg ? <div className="mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {error ? <div className="mermaid-error">{labels.error}{error}</div> : null}
      {!svg && !error ? <div className="mermaid-loading">{labels.loading}</div> : null}
      <details className="mermaid-source">
        <summary>{labels.source}</summary>
        <pre><code>{value}</code></pre>
      </details>
    </div>
  );
}
