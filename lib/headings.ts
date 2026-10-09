import type { Root, Element } from "hast";
/** Both translations reuse semantic English section IDs. */
export function stableHeadingIds(ids: string[]) {
  return (tree: Root) => {
    let index = 0;
    const walk = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "h2" || child.tagName === "h3") {
          child.properties.id = ids[index++] || `section-${index}`;
        }
        walk(child);
      }
    };
    walk(tree);
  };
}

/** Semantic Markdown callouts and section treatments, shared by both locales. */
export function articleComponents() {
  return (tree: Root) => {
    const decorate = (node: Root | Element) => {
      for (const child of node.children) {
        if (child.type !== "element") continue;
        if (child.tagName === "blockquote") {
          const first = child.children.find(
            (c) => c.type === "element" && c.tagName === "p",
          ) as Element | undefined;
          const text = first?.children[0];
          if (text?.type === "text") {
            const marker = text.value.match(
              /^\[!(NOTE|WARNING|DANGER|PREVIEW)\]\s*/,
            );
            if (marker) {
              child.properties.className = [
                "callout",
                `callout-${marker[1].toLowerCase()}`,
              ];
              text.value = text.value.replace(marker[0], "");
              child.children.unshift({
                type: "element",
                tagName: "strong",
                properties: { className: ["callout-label"] },
                children: [{ type: "text", value: marker[1] }],
              });
            }
          }
        }
        decorate(child);
      }
    };
    decorate(tree);
    const children: Root["children"] = [];
    let section: Element | undefined;
    for (const child of tree.children) {
      if (child.type === "element" && child.tagName === "h2") {
        const id = String(child.properties.id || "");
        const kind =
          id === "agent-workflow"
            ? "agent-workflow"
            : id.startsWith("source")
              ? "source-section"
              : /^\d+-/.test(id)
                ? "procedure-section"
                : undefined;
        section = kind
          ? {
              type: "element",
              tagName: "section",
              properties: {
                className: [kind],
                ...(kind === "procedure-section"
                  ? { "data-step": id.match(/^\d+/)?.[0] }
                  : {}),
              },
              children: [],
            }
          : undefined;
        if (section?.properties.className?.toString() === "procedure-section") {
          const text = child.children[0];
          if (text?.type === "text")
            text.value = text.value.replace(/^\d+\.\s*/, "");
        }
        if (section) children.push(section);
      }
      if (section) section.children.push(child as Element);
      else children.push(child);
    }
    tree.children = children;
  };
}
