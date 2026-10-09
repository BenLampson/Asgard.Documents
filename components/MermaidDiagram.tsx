"use client";
import { useEffect, useId, useState } from "react";
export function MermaidDiagram({
  source,
  locale,
}: {
  source: string;
  locale: string;
}) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            primaryColor: "#ffffff",
            primaryBorderColor: "#dadce2",
            primaryTextColor: "#202127",
            lineColor: "#71737d",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "13px",
          },
        });
        const result = await mermaid.render(`diagram-${id}`, source);
        if (active) setSvg(result.svg);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id, source]);
  return (
    <figure className="architecture-diagram">
      <div
        role="img"
        aria-label="Controller → Service → Repository → Entity"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {!svg && (
        <p>
          {failed
            ? locale === "zh"
              ? "图示无法渲染，请阅读下方源码。"
              : "Diagram could not render. Read the source below."
            : "Controller → Service → Repository → Entity"}
        </p>
      )}
      <figcaption>
        {locale === "zh"
          ? "职责与依赖方向；服务返回 DTO，Controller 映射 VO 并封装响应。"
          : "Responsibilities and dependency direction; services return DTOs, controllers map VOs and wrap responses."}
      </figcaption>
      <details>
        <summary>
          {locale === "zh" ? "查看 Mermaid 源码" : "View Mermaid source"}
        </summary>
        <pre>
          <code>{source}</code>
        </pre>
      </details>
    </figure>
  );
}
