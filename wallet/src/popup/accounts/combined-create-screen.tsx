/**
 * Popup flow to create a combined account from chips and local signing accounts.
 * Does not edit existing combined members (see CombinedManage).
 */
import type { JSX } from "react";
import { useCallback, useState } from "react";
import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { ACCOUNT_LABEL_MAX } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { IconPlus } from "../components/StrokeIcon";
import { apiErrorMessage } from "../../shared/i18n";
import { shortAddr } from "../lib/format";
import { viewAfterAccountCreated } from "../lib/rpc-guide";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { CombinedCreateState, State } from "../types";
import { addCombinedDraftParts, emptyCombinedCreate, validCombinedMembers } from "./combined-logic";

export function CombinedCreateScreen({ wallet }: { wallet: State }): JSX.Element {
  const { clearError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [label, setLabel] = useState("");
  const [draftText, setDraftText] = useState("");
  const [err, setErr] = useState("");
  const [create, setCreate] = useState<CombinedCreateState>(emptyCombinedCreate);
  const valid = validCombinedMembers(create, wallet);
  const currentMain = create.currentMain && valid.includes(create.currentMain) ? create.currentMain : (valid[0] ?? "");

  const onPrimary = useCallback(async () => {
    clearError();
    const subPubkeys = validCombinedMembers(create, wallet);
    if (subPubkeys.length === 0) {
      setErr(t("error.minOneAddress"));
      return;
    }
    const res = await sendExtensionRequest("wallet.createCombinedAccount", {
      label: label.trim() || undefined,
      subPubkeys,
      mainPubkey: currentMain || subPubkeys[0],
    });
    if (!res.ok) {
      setErr(apiErrorMessage(locale, res.error, "error.createFailed"));
      return;
    }
    const prevCount = wallet.accounts.length;
    const state = await refresh();
    navigateTo(viewAfterAccountCreated(prevCount, state, "accounts"));
  }, [clearError, create, wallet, label, currentMain, refresh, navigateTo, t, locale]);

  useRegisterDock({
    label: t("accounts.combinedCreate"),
    disabled: valid.length < 1,
    onPrimary,
  });

  return (
    <>
      <div className="field">
        <label htmlFor="combined-label">{t("common.name")}</label>
        <input
          id="combined-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("common.optional")}
          autoComplete="off"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label">{t("common.members")}</label>
        <div id="combined-chip-list" className="chip-list">
          {create.draftChips.map((pk, i) => (
            <span key={`${pk}-${i}`} className={`addr-chip${pk === currentMain ? " main" : ""}`}>
              <button
                type="button"
                className="chip-pick"
                title={pk}
                onClick={() => {
                  if (parsePublicKeyBase58(pk)) setCreate((prev) => ({ ...prev, currentMain: pk }));
                }}
              >
                {shortAddr(pk)}
              </button>
              {pk === currentMain ? <span className="addr-tag">{t("common.current")}</span> : null}
              <button
                type="button"
                className="icon-btn sm-inline ghost-inline"
                title={t("common.delete")}
                aria-label={t("common.delete")}
                onClick={() => {
                  setCreate((prev) => ({
                    ...prev,
                    draftChips: prev.draftChips.filter((_, idx) => idx !== i),
                  }));
                }}
              >
                <StrokeX />
              </button>
            </span>
          ))}
        </div>
        <div className="add-line">
          <input
            id="combined-draft"
            type="text"
            spellCheck={false}
            placeholder={t("onboarding.pasteMulti")}
            autoComplete="off"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setCreate((prev) => addCombinedDraftParts(prev, draftText));
                setDraftText("");
                setErr("");
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/[\n,]/.test(text)) {
                e.preventDefault();
                setCreate((prev) => addCombinedDraftParts(prev, text));
                setDraftText("");
                setErr("");
              }
            }}
          />
          <button
            type="button"
            className="icon-btn sm-inline"
            id="btn-combined-add-chip"
            title={t("common.add")}
            aria-label={t("common.add")}
            onClick={() => {
              setCreate((prev) => addCombinedDraftParts(prev, draftText));
              setDraftText("");
              setErr("");
            }}
          >
            <IconPlus size={14} />
          </button>
        </div>
      </div>
      <p className="sec-head">{t("common.localAccounts")}</p>
      <div id="combined-pick-list" className="combined-pick-list">
        {wallet.accounts.filter(isSigningOrWatch).map((a) => (
          <label key={a.id} className="combined-pick-row">
            <input
              type="checkbox"
              checked={create.pickedPks.has(a.publicKeyBase58)}
              onChange={(e) => {
                setCreate((prev) => {
                  const pickedPks = new Set(prev.pickedPks);
                  if (e.target.checked) pickedPks.add(a.publicKeyBase58);
                  else pickedPks.delete(a.publicKeyBase58);
                  return { ...prev, pickedPks };
                });
              }}
            />
            <span className="pick-name">{a.label}</span>
            <span className="pick-addr">{shortAddr(a.publicKeyBase58)}</span>
          </label>
        ))}
      </div>
      <div id="combined-member-rows">
        {valid.map((pk) => (
          <div key={pk} className="combined-member-row">
            <span className="mono">{shortAddr(pk)}</span>
            {pk === currentMain ? <span className="addr-tag">{t("common.currentWallet")}</span> : null}
          </div>
        ))}
      </div>
      <p id="combined-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </>
  );
}

function StrokeX(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}
