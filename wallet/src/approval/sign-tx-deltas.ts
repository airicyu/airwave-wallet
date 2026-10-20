/**
 * Paints expected-delta rows and the fingerprints that decide when to repaint.
 * Does not mount the sign shell, run simulation, or update the fee total.
 */
import { copyPublicKeyWithFeedback, COPY_ICON_SVG } from "../shared/marks";
import { NATIVE_SOL_ICON_URL, WRAPPED_SOL_MINT } from "../shared/home";
import type { SimulatePendingTxResult, SimulateTxDelta, SimulateTxDeltaDisplay } from "../shared/tx";
import { messageForErrorCode, t, type UiLocale } from "../shared/i18n";
import type { MessageKey } from "../shared/i18n";

function simReasonText(locale: UiLocale, reason: string | undefined, fallback: string): string {
  if (!reason) return t(locale, fallback as MessageKey);
  const mapped = messageForErrorCode(locale, reason);
  return mapped !== reason ? mapped : reason;
}

export function deltaDisplayFingerprint(sim: SimulatePendingTxResult): string {
  if (sim.outcome === "unparseable" || sim.outcome === "rpc") {
    return `${sim.outcome}:${sim.reason ?? ""}`;
  }
  if (sim.outcome === "fail") {
    const errPart = sim.err != null ? JSON.stringify(sim.err) : "";
    const logsPart = sim.logs?.join("\n") ?? "";
    return `fail:${sim.reason ?? ""}:${errPart}:${logsPart}`;
  }
  const deltas = sim.deltas ?? [];
  if (deltas.length === 0) return "ok:none";
  return `ok:${deltas.map((d) => `${d.kind}:${d.mint ?? ""}:${d.sign}:${d.amount}`).join("|")}`;
}

/** Includes Jupiter display fields so paint updates when enrichment changes without delta amounts changing. */
export function deltaDisplayPaintFingerprint(sim: SimulatePendingTxResult): string {
  if (sim.outcome !== "ok" || !sim.deltas) return deltaDisplayFingerprint(sim);
  return sim.deltas
    .map((d) => {
      const disp = d.display;
      if (!disp) {
        return `${d.kind}:${d.mint ?? ""}:${d.sign}:${d.amount}:pending`;
      }
      return [
        d.kind,
        d.mint ?? "",
        d.sign,
        d.amount,
        disp.trust,
        disp.labelPrimary,
        disp.amountSuffix,
        disp.iconUrl ?? "",
        disp.iconLetter,
        disp.scoreLabel ?? "",
      ].join(":");
    })
    .join("|");
}

const TRUST_VERIFIED_SVG =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" fill="currentColor"/><path d="M8.5 12.2l2.3 2.3 4.7-5" stroke="#0f1419" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';


function splMintCopyTarget(d: SimulateTxDelta): string | null {
  if (d.kind === "native") return null;
  const mint = d.mint?.trim();
  if (!mint || mint === WRAPPED_SOL_MINT) return null;
  return mint;
}

function fallbackDisplay(d: SimulateTxDelta): SimulateTxDeltaDisplay {
  if (d.kind === "native") {
    return {
      trust: "verified",
      labelPrimary: "SOL",
      amountSuffix: "SOL",
      iconUrl: NATIVE_SOL_ICON_URL,
      iconLetter: "SO",
    };
  }
  const short = d.symbol;
  return {
    trust: "unverified",
    labelPrimary: short,
    amountSuffix: short,
    iconLetter: short.slice(0, 2).toUpperCase() || "?",
  };
}

function appendDeltaRow(
  parent: HTMLElement,
  d: SimulateTxDelta,
  locale: UiLocale,
): void {
  const disp = d.display ?? fallbackDisplay(d);
  const row = document.createElement("div");
  row.className = "delta-row";

  const trust = document.createElement("span");
  const verified = disp.trust === "verified";
  trust.className = `delta-trust ${verified ? "delta-trust--verified" : "delta-trust--empty"}`;
  trust.title = t(locale, verified ? "token.verified" : "token.notVerified");
  trust.setAttribute("aria-label", trust.title);
  if (verified) {
    trust.innerHTML = TRUST_VERIFIED_SVG;
    if (disp.scoreLabel) {
      const score = document.createElement("span");
      score.className = "delta-trust-score";
      score.textContent = disp.scoreLabel;
      trust.append(score);
    }
  }

  const iconWrap = document.createElement("span");
  iconWrap.className = "delta-token-icon";
  if (disp.iconUrl) {
    const img = document.createElement("img");
    img.src = disp.iconUrl;
    img.alt = "";
    const letter = document.createElement("span");
    letter.className = "delta-token-letter";
    letter.textContent = disp.iconLetter;
    letter.hidden = true;
    img.addEventListener("error", () => {
      img.remove();
      letter.hidden = false;
    });
    iconWrap.append(img, letter);
  } else {
    const letter = document.createElement("span");
    letter.className = "delta-token-letter";
    letter.textContent = disp.iconLetter;
    iconWrap.append(letter);
  }

  const label = document.createElement("div");
  label.className = "delta-token-label";
  const primary = document.createElement("div");
  primary.className = "delta-token-primary";
  primary.textContent = disp.labelPrimary;
  label.append(primary);
  if (disp.labelMintShort) {
    const mintRow = document.createElement("div");
    mintRow.className = "delta-token-mint-row";
    const mintLine = document.createElement("span");
    mintLine.className = "delta-token-mint";
    mintLine.textContent = disp.labelMintShort;
    mintRow.append(mintLine);
    const copyMint = splMintCopyTarget(d);
    if (copyMint) {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "icon-btn ghost-inline delta-mint-copy";
      const copyLabel = t(locale, "common.copy");
      copyBtn.title = copyLabel;
      copyBtn.setAttribute("aria-label", copyLabel);
      copyBtn.innerHTML = COPY_ICON_SVG;
      copyBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        void copyPublicKeyWithFeedback(copyBtn, copyMint, locale);
      });
      mintRow.append(copyBtn);
    }
    label.append(mintRow);
  }

  const amt = document.createElement("span");
  amt.className = `delta-amount ${d.sign}`;
  const signChar = d.sign === "plus" ? "+" : "−";
  amt.textContent = `${signChar}${d.amount} ${disp.amountSuffix}`;

  row.append(trust, iconWrap, label, amt);
  parent.append(row);
}

export function paintDeltaInner(
  inner: HTMLElement,
  sim: SimulatePendingTxResult | null,
  loading: boolean,
  locale: UiLocale,
): void {
  inner.replaceChildren();
  if (loading) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.querying");
    inner.append(p);
    return;
  }
  if (!sim) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.querying");
    inner.append(p);
    return;
  }
  if (sim.outcome === "unparseable" || sim.outcome === "rpc") {
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = t(locale, "sim.cannotSimulate");
    const reason = document.createElement("p");
    reason.className = "notice-reason";
    reason.textContent = simReasonText(
      locale,
      sim.reason,
      sim.outcome === "unparseable" ? "error.code.TX_UNPARSEABLE" : "error.code.SIM_RPC",
    );
    inner.append(title, reason);
    return;
  }
  if (sim.outcome === "fail") {
    const title = document.createElement("p");
    title.className = "notice-title";
    title.textContent = t(locale, "sim.willFail");
    inner.append(title);
    if (sim.reason) {
      const reason = document.createElement("p");
      reason.className = "notice-reason";
      reason.textContent = sim.reason;
      inner.append(reason);
    }
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = t(locale, "sim.failDetails");
    const pre = document.createElement("pre");
    pre.style.fontSize = "0.72rem";
    pre.style.maxHeight = "160px";
    const errPart = sim.err != null ? JSON.stringify(sim.err, null, 2) : "";
    const logsPart = sim.logs?.join("\n") ?? "";
    pre.textContent = [errPart, logsPart].filter(Boolean).join("\n\n");
    details.append(summary, pre);
    inner.append(details);
    const muted = document.createElement("p");
    muted.className = "muted-center";
    muted.textContent = t(locale, "approval.cannotEstimateDelta");
    inner.append(muted);
    return;
  }

  const deltas = sim.deltas;
  if (!deltas) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.cannotEstimateDelta");
    inner.append(p);
    return;
  }
  if (deltas.length === 0) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = t(locale, "approval.noBalanceChange");
    inner.append(p);
    return;
  }
  for (const d of deltas) {
    appendDeltaRow(inner, d, locale);
  }
}
