/** Toolbar／關於／解鎖共用的產品圖。路徑對齊 manifest `icons`。 */
export function brandIconUrl(): string {
  return chrome.runtime.getURL("public/icon128.png");
}
