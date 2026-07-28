"use client";

import { useEffect, useId, useState } from "react";

type MermaidDiagramProps = { value: string };

export function MermaidDiagram({ value }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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
    <div className={`mermaid-block${expanded ? " mermaid-expanded" : ""}`} aria-label="Mermaid architecture diagram">
      {expanded ? <button className="mermaid-backdrop" type="button" aria-label="Close expanded diagram" onClick={() => setExpanded(false)} /> : null}
      <div className="mermaid-toolbar">
        <span>ARCHITECTURE DIAGRAM</span>
        {svg ? <button type="button" className="mermaid-expand-button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? "Close" : "Expand"} ↗</button> : null}
      </div>
      {svg ? <div className="mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      {error ? <div className="mermaid-error">Mermaid diagram could not be rendered: {error}</div> : null}
      {!svg && !error ? <div className="mermaid-loading">Rendering architecture diagram…</div> : null}
      <details className="mermaid-source">
        <summary>View Mermaid source</summary>
        <pre><code>{value}</code></pre>
      </details>
    </div>
  );
}
