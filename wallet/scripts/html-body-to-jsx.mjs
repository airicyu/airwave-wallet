import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(dir, "../src/popup/index.html");
const outPath = path.join(dir, "../src/popup/PopupMarkup.tsx");
const html = fs.readFileSync(htmlPath, "utf8");
const start = html.indexOf('<div id="app">');
const scriptIdx = html.indexOf('<script type="module"', start);
const end = html.lastIndexOf("</div>", scriptIdx);
if (start < 0 || end < 0 || scriptIdx < 0) throw new Error("could not find app div");
let inner = html.slice(start + '<div id="app">'.length, end);

inner = inner
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\bclass=/g, "className=")
  .replace(/\bfor=/g, "htmlFor=")
  .replace(/\bautocomplete=/g, "autoComplete=")
  .replace(/\bspellcheck=/g, "spellCheck=")
  .replace(/\binputmode=/g, "inputMode=")
  .replace(/\breadonly\b/g, "readOnly")
  .replace(/\bhidden\b(?=[\s/>])/g, "hidden={true}")
  .replace(/\bhidden={true}={true}/g, "hidden={true}");

const out = `/** Generated from index.html — edit source HTML then re-run scripts/html-body-to-jsx.mjs */
export function PopupMarkup(): JSX.Element {
  return (
    <>
${inner
  .split("\n")
  .map((line) => "      " + line)
  .join("\n")}
    </>
  );
}
`;

fs.writeFileSync(outPath, out);
console.log("wrote", outPath, "bytes", out.length);
