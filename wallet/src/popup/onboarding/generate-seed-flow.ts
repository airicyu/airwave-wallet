import { createEnglishMnemonic12, keypairFromMnemonic } from "../../shared/seed-derive";
import { elGenerateForm, elGenerateSuccess, elGenerateSuccessPk } from "../lib";
import { shortAddr } from "../lib";
import { SVG_COPY } from "../lib";
import { session } from "../lib";

export function renderGenerateChrome(): void {
  const done = session.generateSuccessPk != null;
  elGenerateForm.hidden = done;
  elGenerateSuccess.hidden = !done;
  if (done) elGenerateSuccessPk.textContent = shortAddr(session.generateSuccessPk!);
}

export function resetGenerateSeedFlow(): void {
  session.generateSeedBusy = false;
  const label = document.getElementById("generate-seed-label") as HTMLInputElement | null;
  const err = document.getElementById("generate-seed-err");
  if (label) label.value = "";
  if (err) err.textContent = "";
  try {
    const mnemonic = createEnglishMnemonic12();
    const kp = keypairFromMnemonic(mnemonic, "phantom", 0);
    session.generateSeedWords = mnemonic.split(" ");
    session.generateSeedPk = kp.publicKey.toBase58();
  } catch {
    session.generateSeedWords = null;
    session.generateSeedPk = null;
  }
}

export function renderGenerateSeedChrome(): void {
  const grid = document.getElementById("generate-seed-grid");
  const pkEl = document.getElementById("generate-seed-pk");
  if (!grid || !pkEl) return;
  if (!session.generateSeedWords || !session.generateSeedPk) {
    grid.innerHTML = "";
    pkEl.textContent = "";
    pkEl.removeAttribute("title");
    return;
  }
  grid.innerHTML = session.generateSeedWords
    .map(
      (w, i) =>
        `<div class="word-ro"><span class="word-ro-n">${i + 1}</span><span class="word-ro-w">${w}</span></div>`,
    )
    .join("");
  pkEl.textContent = shortAddr(session.generateSeedPk);
  pkEl.title = session.generateSeedPk;
}

export function bindGenerateSeedCopyButtons(): void {
  const btnCopySeedWords = document.getElementById("btn-copy-seed-words")!;
  const btnCopySeedPk = document.getElementById("btn-copy-seed-pk")!;
  btnCopySeedWords.innerHTML = SVG_COPY;
  btnCopySeedPk.innerHTML = SVG_COPY;
  btnCopySeedWords.addEventListener("click", () => {
    if (session.generateSeedWords) void navigator.clipboard.writeText(session.generateSeedWords.join(" "));
  });
  btnCopySeedPk.addEventListener("click", () => {
    if (session.generateSeedPk) void navigator.clipboard.writeText(session.generateSeedPk);
  });
}
