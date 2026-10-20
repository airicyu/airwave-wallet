/** Chevron-down stroke SVG and DOM chip used for row expand (tokens, fee breakdown). */

export const ROW_EXPAND_BTN_CLASS = "row-expand-btn";

export function chevronDownStrokeSvgHtml(size = 16): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
}

export function createRowExpandChevron(): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.className = ROW_EXPAND_BTN_CLASS;
  chip.setAttribute("aria-hidden", "true");
  chip.innerHTML = chevronDownStrokeSvgHtml(16);
  return chip;
}
