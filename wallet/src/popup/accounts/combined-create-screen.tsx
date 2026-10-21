/**
 * Create-combined page: name, main-wallet card, and member sheet.
 * Does not add members (see combined-create-add) or edit an existing combined account.
 */
import { useCallback, useRef, useState } from "react";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { ACCOUNT_LABEL_MAX, isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { accountKind, sendExtensionRequest, type SigningOrWatchMeta } from "../../shared/protocol";
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

const DRAG_PX = 6;

function localFor(wallet: State, pk: string): SigningOrWatchMeta | undefined {
  return wallet.accounts.find(
    (a): a is SigningOrWatchMeta =>
      isSigningOrWatch(a) && (parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58) === pk,
  );
}

export function CombinedCreateScreen({ wallet }: { wallet: State }): JSX.Element {
  const { clearError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const draft = useCombinedDraft();
  const [err, setErr] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropLine, setDropLine] = useState<{ pk: string; edge: "before" | "after" } | null>(null);
  const dropLineRef = useRef(dropLine);
  dropLineRef.current = dropLine;
  const dragRef = useRef<{ pk: string; startY: number; live: boolean } | null>(null);
  const skipClickRef = useRef(false);
  const membersRef = useRef(draft.members);
  membersRef.current = draft.members;

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

  const onMove = useCallback((ev: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.live && Math.abs(ev.clientY - drag.startY) < DRAG_PX) return;
    if (!drag.live) {
      drag.live = true;
      skipClickRef.current = true;
      setDragging(drag.pk);
      window.getSelection()?.removeAllRanges();
    }
    ev.preventDefault();
    const rows = Array.from(document.querySelectorAll<HTMLElement>("#create-member-sheet .member-line"));
    let line: { pk: string; edge: "before" | "after" } | null = null;
    for (const row of rows) {
      const pk = row.dataset.pk;
      if (!pk) continue;
      const r = row.getBoundingClientRect();
      if (ev.clientY < r.bottom && ev.clientY >= r.top) {
        line = { pk, edge: ev.clientY < r.top + r.height / 2 ? "before" : "after" };
        break;
      }
    }
    setDropLine(line);
  }, []);

  const onUp = useCallback(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(null);
    const line = dropLineRef.current;
    setDropLine(null);
    if (!drag?.live || !line || line.pk === drag.pk) return;
    const next = membersRef.current.filter((pk) => pk !== drag.pk);
    let idx = next.indexOf(line.pk);
    if (idx < 0) return;
    if (line.edge === "after") idx += 1;
    next.splice(idx, 0, drag.pk);
    reorderCombinedMembers(next);
  }, [onMove]);

  const startDrag = (pk: string, ev: ReactPointerEvent) => {
    if (!(ev.target as HTMLElement).closest(".account-grip")) return;
    ev.preventDefault();
    window.getSelection()?.removeAllRanges();
    dragRef.current = { pk, startY: ev.clientY, live: false };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
  };

  const mainLocal = localFor(wallet, draft.main);
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
          const local = localFor(wallet, pk);
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
