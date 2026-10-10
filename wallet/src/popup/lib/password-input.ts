/** Reduce the chance the browser/password manager treats seed or secret-key fields as saveable (not a guarantee). */
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

/** Wallet password field: type-B masked text; do not store in the password manager. */
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
