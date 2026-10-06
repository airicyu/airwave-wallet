import type { JSX } from "react";

export function LegalDoc({ markdown }: { markdown: string }): JSX.Element {
  const blocks = markdown.replace(/\r\n/g, "\n").trim().split(/\n\n+/);
  const nodes: JSX.Element[] = [];
  let i = 0;
  for (const block of blocks) {
    const line = block.trim();
    if (!line || line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      nodes.push(<h3 key={i++}>{line.slice(3).trim()}</h3>);
      continue;
    }
    nodes.push(<p key={i++}>{line.replace(/\n/g, " ")}</p>);
  }
  return <>{nodes}</>;
}
