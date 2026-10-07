const COPY_OK_MS = 1600;

const COPY_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

const CHECK_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

const timers = new WeakMap<HTMLElement, number>();

export async function copyPublicKeyWithFeedback(btn: HTMLElement, text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    return;
  }
  const prev = timers.get(btn);
  if (prev != null) window.clearTimeout(prev);
  btn.classList.add("copy-ok");
  btn.title = "已複製";
  btn.setAttribute("aria-label", "已複製");
  btn.innerHTML = CHECK_SVG;
  const id = window.setTimeout(() => {
    timers.delete(btn);
    btn.classList.remove("copy-ok");
    btn.title = "複製";
    btn.setAttribute("aria-label", "複製");
    btn.innerHTML = COPY_SVG;
  }, COPY_OK_MS);
  timers.set(btn, id);
}
