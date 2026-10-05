/** 降低瀏覽器／密碼管理器把助記詞或私鑰當成可儲存表單欄位的機率（無法 100% 保證）。 */
export function hardenSensitiveTextInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.autocomplete = "off";
  el.setAttribute("autocapitalize", "off");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("spellcheck", "false");
  el.setAttribute("aria-autocomplete", "none");
  el.setAttribute("data-lpignore", "true");
  el.setAttribute("data-1p-ignore", "");
  el.setAttribute("data-form-type", "other");
  el.readOnly = true;
  el.addEventListener("focus", () => {
    el.readOnly = false;
  });
}

/** 錢包密碼欄：類 B 遮罩 text，不進密碼管理器。 */
export function hardenWalletPasswordInput(inp: HTMLInputElement): void {
  inp.type = "text";
  inp.classList.add("wallet-pwd-masked");
  inp.removeAttribute("name");
  hardenSensitiveTextInput(inp);
}

export function hardenApiKeyInput(inp: HTMLInputElement): void {
  inp.type = "text";
  inp.autocomplete = "off";
  inp.setAttribute("autocapitalize", "off");
  inp.setAttribute("autocorrect", "off");
  inp.setAttribute("spellcheck", "false");
  inp.setAttribute("aria-autocomplete", "none");
  inp.setAttribute("data-lpignore", "true");
  inp.setAttribute("data-1p-ignore", "");
  inp.setAttribute("data-form-type", "other");
}
