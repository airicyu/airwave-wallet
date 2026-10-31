/**
 * Create-combined page: name, main-wallet card, and member sheet.
 * Does not add members (see combined-create-add) or edit an existing combined account.
 */
import { useCallback, useRef, useState } from "react";
import type { JSX } from "react";
import { ACCOUNT_LABEL_MAX } from "../../shared/accounts";
import { accountKind, sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { AccountKindMark } from "../components/AccountKindMark";
import { CopyIconButton } from "../components/CopyPkButton";
import { IconPlus, IconTrash } from "../components/StrokeIcon";
import { shortAddr } from "../lib/format";
import { viewAfterAccountCreated } from "../lib/rpc-guide";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { State } from "../types";
import {
  clearCombinedDraft,
  removeCombinedMember,
  reorderCombinedMembers,
  setCombinedLabel,
  setCombinedMain,
  useCombinedDraft,
} from "./combined-logic";
import { localCombinedMember, useMemberSheetDrag } from "./member-sheet-drag";

export function CombinedCreateScreen({ wallet }: { wallet: State }): JSX.Element {
  const { clearError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const draft = useCombinedDraft();
  const [err, setErr] = useState("");
  const membersRef = useRef(draft.members);
  membersRef.current = draft.members;
  const { dragging, dropLine, skipClickRef, startDrag } = useMemberSheetDrag(
    "#create-member-sheet",
    draft.members,
    reorderCombinedMembers,
  );

  const onPrimary = useCallback(async () => {
    clearError();
    const members = membersRef.current;
    if (members.length === 0) return;
    const label = draft.label.trim();
    const res = await sendExtensionRequest("wallet.createCombinedAccount", {
      label: label || undefined,
      subPubkeys: members,
      mainPubkey: draft.main || members[0],
    });
    if (!res.ok) {
      setErr(apiErrorMessage(locale, res.error, "error.createFailed"));
      return;
    }
    const prevCount = wallet.accounts.length;
    clearCombinedDraft();
    const state = await refresh();
    navigateTo(viewAfterAccountCreated(prevCount, state, "accounts"));
  }, [clearError, draft.label, draft.main, wallet.accounts.length, refresh, navigateTo, locale]);

  useRegisterDock({
    label: t("accounts.combinedCreate"),
    disabled: draft.members.length < 1,
    onPrimary,
  });

  const mainLocal = localCombinedMember(wallet, draft.main);
  const mainName = mainLocal?.label ?? "";

  return (
    <div className="combined-manage">
      <div className="field">
        <label htmlFor="combined-label">{t("common.name")}</label>
        <input
          id="combined-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("common.optional")}
          autoComplete="off"
          value={draft.label}
          onChange={(e) => setCombinedLabel(e.target.value)}
        />
      </div>
      {draft.members.length > 0 ? (
        <section className="main-wallet">
          <span className="main-wallet-label">{t("common.currentWallet")}</span>
          <div className="main-wallet-card">
            {mainName ? <div className="account-name">{mainName}</div> : null}
            <div className="account-addr-row">
              <span className="addr">{shortAddr(draft.main)}</span>
              <CopyIconButton text={draft.main} idleLabel={t("accounts.copyAddress")} />
            </div>
          </div>
        </section>
      ) : null}
      <section className={`member-sheet${dragging ? " is-reordering" : ""}`} id="create-member-sheet">
        <div className="member-sheet-head">
          <h3>{t("accounts.members")}</h3>
          <button
            type="button"
            className="icon-btn accent-fill"
            title={t("common.add")}
            aria-label={t("common.add")}
            onClick={() => navigateTo("add-combined-add")}
          >
            <IconPlus size={18} />
          </button>
        </div>
        {draft.members.map((pk) => {
          const local = localCombinedMember(wallet, pk);
          const name = local?.label ?? "";
          const signing = local != null && accountKind(local) === "signing";
          const edge = dropLine?.pk === pk ? dropLine.edge : null;
          return (
            <div
              key={pk}
              className={`member-line${dragging === pk ? " is-dragging" : ""}`}
              data-pk={pk}
              onPointerDown={(ev) => startDrag(pk, ev)}
              onClick={(ev) => {
                if (skipClickRef.current) {
                  skipClickRef.current = false;
                  return;
                }
                if ((ev.target as HTMLElement).closest("button, .account-grip")) return;
                setCombinedMain(pk);
              }}
            >
              {edge === "before" ? <div className="account-drop-line" /> : null}
              <span className="account-grip" aria-hidden="true" />
              <button
                type="button"
                className={`main-pick${pk === draft.main ? " on" : ""}`}
                aria-pressed={pk === draft.main}
                aria-label={t("common.setAsCurrentWallet")}
                onClick={() => setCombinedMain(pk)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden="true">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              </button>
              <span className="member-kind-slot">
                {signing ? <AccountKindMark kind="signing" size={16} label={t("accounts.kindSigning")} /> : null}
              </span>
              <div className="member-copy">
                {name ? <div className="account-name">{name}</div> : null}
                <div className="account-addr-row">
                  <span className="addr">{shortAddr(pk)}</span>
                  <CopyIconButton text={pk} idleLabel={t("accounts.copyAddress")} />
                </div>
              </div>
              <button
                type="button"
                className="icon-btn trash-solid"
                title={t("common.delete")}
                aria-label={t("common.delete")}
                onClick={() => removeCombinedMember(pk)}
              >
                <IconTrash />
              </button>
              {edge === "after" ? <div className="account-drop-line" /> : null}
            </div>
          );
        })}
      </section>
      <p id="combined-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </div>
  );
}
