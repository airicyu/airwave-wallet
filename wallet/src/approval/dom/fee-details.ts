/**
 * Fee card, transaction-details panel, and CU draft controls for sign-transaction review.
 * Does not call simulate or mount the delta card shell.
 */
import { instructionsFromTxBytes } from "../../background/simulate/phase2-deltas";
import { createRowExpandChevron } from "../../shared/row-expand-chevron";
import type { SimulatePendingTxResult, SimulateTxInstruction } from "../../shared/simulate-pending-tx-types";
import { ixKindLabel, ixRoleLabel } from "../../shared/ui-i18n";
import { bytesFromHexCompact, formatSolFromLamports } from "../format";
import { sess } from "../shell/session";
import {
  CU_CHECK_SVG,
  cuPairInBounds,
  draftsAreDirty,
  parseCuFieldInput,
} from "../shell/cu";
import { progressUserMessage, tr } from "../shell/locale";

export function renderFeeCard(sim: SimulatePendingTxResult | null, loading: boolean): HTMLElement {
  const card = document.createElement("div");
  card.className = "card fee-card";

  const details = document.createElement("details");
  details.className = "fee-details";

  const summary = document.createElement("summary");
  summary.className = "fee-card-head";
  const leading = document.createElement("span");
  leading.className = "fee-head-leading";
  const chevron = createRowExpandChevron();
  const title = document.createElement("span");
  title.className = "card-label fee-card-label";
  title.textContent = tr("approval.txFee");
  leading.append(chevron, title);
  const totalEl = document.createElement("span");
  totalEl.className = "fee-total";
  summary.append(leading, totalEl);
  details.append(summary);

  if (loading || (sim == null && sess.txCuEditable)) {
    totalEl.textContent = tr("approval.estimating");
  } else if (sim?.cuWriteError) {
    totalEl.textContent = progressUserMessage(sim.cuWriteError);
  } else if (sim?.totalFeeLamports != null) {
    totalEl.textContent = formatSolFromLamports(sim.totalFeeLamports);
  } else {
    totalEl.textContent = tr("approval.unknown");
  }

  const inner = document.createElement("div");
  inner.className = "fee-details-inner";

  const sigRow = document.createElement("div");
  sigRow.className = "fee-row";
  sigRow.innerHTML = `<span>${tr("approval.sigFee")}</span><span>${sim?.sigFeeLamports != null ? formatSolFromLamports(sim.sigFeeLamports) : tr("approval.unknown")}</span>`;
  inner.append(sigRow);

  const priRow = document.createElement("div");
  priRow.className = "fee-row";
  const priVal =
    sim?.priorityLamports != null ? formatSolFromLamports(sim.priorityLamports) : tr("approval.unknown");
  priRow.innerHTML = `<span>${tr("approval.priorityFee")}</span><span>${priVal}</span>`;
  inner.append(priRow);

  const cuGrid = document.createElement("div");
  cuGrid.className = "cu-grid";

  const limitWrap = document.createElement("label");
  limitWrap.className = "cu-field";
  limitWrap.textContent = "CU limit";
  const limitInp = document.createElement("input");
  limitInp.type = "text";
  limitInp.inputMode = "numeric";
  limitInp.autocomplete = "off";
  limitInp.disabled = loading || !sess.txCuEditable || sim?.cuWriteError != null;
  const limitShown = sess.cuDirty
    ? sess.draftLimitStr
    : sess.localCuLimit != null
      ? String(sess.localCuLimit)
      : "";
  limitInp.value = limitShown;
  limitWrap.append(limitInp);

  const priceWrap = document.createElement("label");
  priceWrap.className = "cu-field";
  priceWrap.textContent = "CU price";
  const priceInp = document.createElement("input");
  priceInp.type = "text";
  priceInp.inputMode = "numeric";
  priceInp.autocomplete = "off";
  priceInp.disabled = loading || !sess.txCuEditable || sim?.cuWriteError != null;
  const priceShown = sess.cuDirty
    ? sess.draftPriceStr
    : sess.localCuPrice != null
      ? String(sess.localCuPrice)
      : "";
  priceInp.value = priceShown;
  priceWrap.append(priceInp);

  const applyBtn = document.createElement("button");
  applyBtn.type = "button";
  applyBtn.className = "cu-apply";

  const paintApply = (): void => {
    const dirtyNow = draftsAreDirty(limitInp.value, priceInp.value);
    if (!limitInp.disabled) {
      sess.cuDirty = dirtyNow && sess.txCuEditable;
      sess.draftLimitStr = limitInp.value;
      sess.draftPriceStr = priceInp.value;
    }
    const limit = parseCuFieldInput(limitInp.value);
    const price = parseCuFieldInput(priceInp.value);
    const ok = cuPairInBounds(limit, price);
    applyBtn.classList.remove("pending", "busy");
    applyBtn.innerHTML = "";
    if (sess.cuApplyBusy) {
      applyBtn.classList.add("busy");
      applyBtn.disabled = true;
      applyBtn.title = tr("approval.cuApplying");
      applyBtn.setAttribute("aria-label", tr("approval.cuApplying"));
      const spin = document.createElement("span");
      spin.className = "cu-apply-spin";
      applyBtn.append(spin);
    } else if (sess.cuDirty && ok) {
      applyBtn.classList.add("pending");
      applyBtn.disabled = false;
      applyBtn.title = tr("approval.cuApply");
      applyBtn.setAttribute("aria-label", tr("approval.cuApply"));
      applyBtn.innerHTML = CU_CHECK_SVG;
    } else if (sess.cuDirty && !ok) {
      applyBtn.classList.add("pending");
      applyBtn.disabled = true;
      applyBtn.title = tr("approval.cuCannotApply");
      applyBtn.setAttribute("aria-label", tr("approval.cuCannotApply"));
      applyBtn.innerHTML = CU_CHECK_SVG;
    } else {
      applyBtn.disabled = true;
      applyBtn.title = tr("approval.cuApplied");
      applyBtn.setAttribute("aria-label", tr("approval.cuApplied"));
      applyBtn.innerHTML = CU_CHECK_SVG;
    }
    sess.onApplyApproveFromSimulation?.(sess.lastSim);
  };

  applyBtn.addEventListener("click", () => {
    if (!sess.txCuEditable || !sess.requestId) return;
    const limit = parseCuFieldInput(limitInp.value);
    const price = parseCuFieldInput(priceInp.value);
    if (!cuPairInBounds(limit, price)) return;
    sess.cuUserOverride = true;
    sess.localCuLimit = limit;
    sess.localCuPrice = price;
    sess.cuDirty = false;
    sess.draftLimitStr = String(limit);
    sess.draftPriceStr = String(price);
    sess.cuApplyBusy = true;
    sess.signTxBodyReady = false;
    sess.feeFrozenForSim = false;
    sess.feeBreakdownReady = false;
    sess.txDetailsReady = false;
    sess.onRunSimulation?.();
  });

  cuGrid.append(limitWrap, priceWrap, applyBtn);
  inner.append(cuGrid);
  details.append(inner);
  details.open = sess.feeDetailsOpen;
  details.addEventListener("toggle", () => {
    sess.feeDetailsOpen = details.open;
  });
  card.append(details);

  if (sess.txCuEditable) {
    limitInp.addEventListener("input", paintApply);
    priceInp.addEventListener("input", paintApply);
  }
  paintApply();

  return card;
}

export function renderTxDetails(sim: SimulatePendingTxResult | null): HTMLElement {
  const details = document.createElement("details");
  details.className = "tx-details";
  details.open = false;
  const summary = document.createElement("summary");
  summary.textContent = tr("approval.txDetailsIx");
  details.append(summary);

  const inner = document.createElement("div");
  inner.className = "card";

  let instructions: SimulateTxInstruction[] = sim?.instructions ?? [];
  if (!instructions.length && sess.txRawHex) {
    const raw = bytesFromHexCompact(sess.txRawHex);
    if (raw) instructions = instructionsFromTxBytes(raw);
  }
  if (!instructions.length) {
    const p = document.createElement("p");
    p.className = "muted-center";
    p.textContent = sim ? tr("approval.cannotListIx") : tr("approval.querying");
    inner.append(p);
  } else {
    instructions.forEach((ix, i) => {
      const row = document.createElement("div");
      row.className = "ix-row";
      const prog = document.createElement("div");
      prog.className = "ix-prog";
      prog.textContent = `${i + 1}. ${ix.program}`;
      row.append(prog);
      if (ix.decoded === true) {
        if (ix.kind) {
          const nameEl = document.createElement("div");
          nameEl.className = "ix-name";
          nameEl.textContent = ixKindLabel(sess.shellLocale, ix.kind);
          row.append(nameEl);
        }
        const fields = ix.fields ?? [];
        if (fields.length) {
          const kv = document.createElement("div");
          kv.className = "ix-kv";
          for (const f of fields) {
            const k = document.createElement("span");
            k.className = "ix-k";
            k.textContent = ixRoleLabel(sess.shellLocale, f.role);
            const v = document.createElement("span");
            v.className = "ix-v";
            v.textContent = f.value;
            kv.append(k, v);
          }
          row.append(kv);
        }
      } else {
        const accts = ix.accounts ?? [];
        if (accts.length) {
          const ul = document.createElement("ul");
          ul.className = "ix-accounts";
          for (const a of accts) {
            const li = document.createElement("li");
            li.textContent = a.short;
            if (a.unresolved) li.classList.add("unresolved");
            ul.append(li);
          }
          row.append(ul);
        }
        const dataEl = document.createElement("p");
        dataEl.className = "ix-data";
        dataEl.textContent =
          ix.dataHex != null && ix.dataHex.length > 0 ? ix.dataHex : tr("approval.emptyData");
        row.append(dataEl);
      }
      inner.append(row);
    });
  }

  const payer = sim?.feePayerShort;
  if (payer) {
    const feeLine = document.createElement("p");
    feeLine.className = "fee-line";
    feeLine.textContent = tr("approval.feePayer", { payer });
    inner.append(feeLine);
  }

  const rawDetails = document.createElement("details");
  rawDetails.className = "raw-details";
  const rawSum = document.createElement("summary");
  rawSum.textContent = tr("approval.rawTx");
  const hexEl = document.createElement("p");
  hexEl.className = "card-hex";
  hexEl.textContent = sess.txRawHex;
  rawDetails.append(rawSum, hexEl);
  inner.append(rawDetails);

  details.append(inner);
  return details;
}
