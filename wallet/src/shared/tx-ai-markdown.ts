/**
 * Allowlisted Markdown for the transaction AI report overlay.
 * Does not interpret raw HTML, links, or images.
 */

export type MdInline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string };

export type MdBlock =
  | { kind: "h"; level: 1 | 2 | 3; inlines: MdInline[] }
  | { kind: "p"; inlines: MdInline[] }
  | { kind: "ul"; items: MdInline[][] }
  | { kind: "ol"; items: MdInline[][] };

function parseInlines(raw: string): MdInline[] {
  const out: MdInline[] = [];
  let i = 0;
  const pushText = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last?.kind === "text") last.text += text;
    else out.push({ kind: "text", text });
  };
  while (i < raw.length) {
    if (raw[i] === "<") {
      const close = raw.indexOf(">", i + 1);
      const end = close === -1 ? raw.length : close + 1;
      pushText(raw.slice(i, end));
      i = end;
      continue;
    }
    if (raw.startsWith("`", i)) {
      const end = raw.indexOf("`", i + 1);
      if (end > i + 1) {
        out.push({ kind: "code", text: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (raw.startsWith("**", i)) {
      const end = raw.indexOf("**", i + 2);
      if (end > i + 2) {
        out.push({ kind: "strong", text: raw.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (raw[i] === "*" && raw[i + 1] !== "*") {
      const end = raw.indexOf("*", i + 1);
      if (end > i + 1) {
        out.push({ kind: "em", text: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    pushText(raw[i]!);
    i += 1;
  }
  return out;
}

export function parseTxAiMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) blocks.push({ kind: "p", inlines: parseInlines(text) });
  };

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = heading[1]!.length as 1 | 2 | 3;
      blocks.push({ kind: "h", level, inlines: parseInlines(heading[2]!.trim()) });
      continue;
    }
    const ul = /^[-*]\s+(.+)$/.exec(line);
    if (ul) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(parseInlines(ul[1]!.trim()));
      else blocks.push({ kind: "ul", items: [parseInlines(ul[1]!.trim())] });
      continue;
    }
    const ol = /^\d+\.\s+(.+)$/.exec(line);
    if (ol) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ol") last.items.push(parseInlines(ol[1]!.trim()));
      else blocks.push({ kind: "ol", items: [parseInlines(ol[1]!.trim())] });
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  return blocks;
}

function appendInlines(parent: HTMLElement, inlines: MdInline[]): void {
  for (const part of inlines) {
    if (part.kind === "text") {
      parent.append(part.text);
      continue;
    }
    const el = parent.ownerDocument.createElement(
      part.kind === "strong" ? "strong" : part.kind === "em" ? "em" : "code",
    );
    el.textContent = part.text;
    parent.append(el);
  }
}

export function mountTxAiMarkdown(parent: HTMLElement, source: string): void {
  parent.replaceChildren();
  for (const block of parseTxAiMarkdown(source)) {
    if (block.kind === "h") {
      const el = parent.ownerDocument.createElement(`h${block.level}`);
      appendInlines(el, block.inlines);
      parent.append(el);
      continue;
    }
    if (block.kind === "p") {
      const el = parent.ownerDocument.createElement("p");
      appendInlines(el, block.inlines);
      parent.append(el);
      continue;
    }
    const list = parent.ownerDocument.createElement(block.kind);
    for (const item of block.items) {
      const li = parent.ownerDocument.createElement("li");
      appendInlines(li, item);
      list.append(li);
    }
    parent.append(list);
  }
}
