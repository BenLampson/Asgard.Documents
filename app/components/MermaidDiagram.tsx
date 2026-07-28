"use client";

import { useEffect, useId, useState } from "react";

type MermaidDiagramProps = { value: string };

export function MermaidDiagram({ value }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mermaid-block" aria-label="Mermaid architecture diagram">
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
