/**
 * The chevron used to expand a token row or a fee breakdown.
 * It points down while expanded. The row that owns the list decides whether the control is shown.
 */

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
