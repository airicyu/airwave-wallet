/** Product icon shared by toolbar, About, and unlock. Path matches manifest `icons`. */
export function brandIconUrl(): string {
  return chrome.runtime.getURL("public/icon128.png");
}
