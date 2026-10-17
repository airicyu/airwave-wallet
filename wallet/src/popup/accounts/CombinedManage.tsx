/**
 * Combined-account manage page: main-wallet card, member sheet, add-member screens, member rename.
 * Does not create combined accounts or write chrome.storage itself.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { ACCOUNT_LABEL_MAX } from "../../shared/account-label";
import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { accountKind, type CombinedAccountMeta, type SigningOrWatchMeta } from "../../shared/storage-keys";
import { apiErrorMessage } from "../../shared/ui-i18n";
import { AccountKindMark } from "../components/AccountKindMark";
import { CopyIconButton } from "../components/CopyPkButton";
import { IconPlus, IconRename, IconTrash } from "../components/StrokeIcon";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { State } from "../types";

let memberRenamePk = "";

export function setMemberRenamePk(pk: string): void {
  memberRenamePk = pk;
}

const DRAG_PX = 6;

function localFor(wallet: State, pk: string): SigningOrWatchMeta | undefined {
  return wallet.accounts.find(
    (a): a is SigningOrWatchMeta =>
      isSigningOrWatch(a) && (parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58) === pk,
  );
}

export function CombinedManagePanel({
  acc,
  wallet,
  editing = true,
}: {
  acc: CombinedAccountMeta;
  wallet: State;
  editing?: boolean;
}): JSX.Element {
  const { clearError, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [order, setOrder] = useState(acc.subPubkeys);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropLine, setDropLine] = useState<{ pk: string; edge: "before" | "after" } | null>(null);
  const dropLineRef = useRef(dropLine);
  dropLineRef.current = dropLine;
  const dragRef = useRef<{ pk: string; startY: number; live: boolean } | null>(null);
  const skipClickRef = useRef(false);

  useEffect(() => {
    setOrder(acc.subPubkeys);
  }, [acc.subPubkeys]);

  const persist = useCallback(
    async (next: string[]) => {
      const res = await sendExtensionRequest("wallet.reorderCombinedSubs", {
        combinedId: acc.id,
        subPubkeys: next,
      });
      if (!res.ok) {
        showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
        setOrder(acc.subPubkeys);
      } else await refresh();
    },
    [acc.id, acc.subPubkeys, locale, refresh, showError],
  );

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
    const rows = Array.from(document.querySelectorAll<HTMLElement>("#member-sheet .member-line"));
    let line: { pk: string; edge: "before" | "after" } | null = null;
    for (const row of rows) {
      const pk = row.dataset.pk;
      if (!pk) continue;
      const r = row.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (ev.clientY < r.bottom && ev.clientY >= r.top) {
        line = { pk, edge: ev.clientY < mid ? "before" : "after" };
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
    setOrder((prev) => {
      const next = prev.filter((pk) => pk !== drag.pk);
      let idx = next.indexOf(line.pk);
      if (idx < 0) return prev;
      if (line.edge === "after") idx += 1;
      next.splice(idx, 0, drag.pk);
      void persist(next);
      return next;
    });
  }, [onMove, persist]);

  const startDrag = (pk: string, ev: ReactPointerEvent) => {
    if (!(ev.target as HTMLElement).closest(".account-grip")) return;
    ev.preventDefault();
    window.getSelection()?.removeAllRanges();
    dragRef.current = { pk, startY: ev.clientY, live: false };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
  };

  const setMain = (pk: string) => {
    if (pk === (parsePublicKeyBase58(acc.mainPubkey) ?? acc.mainPubkey)) return;
    void (async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.setCombinedMain", {
        combinedId: acc.id,
        mainPubkey: pk,
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
      else await refresh();
    })();
  };

  const main = parsePublicKeyBase58(acc.mainPubkey) ?? acc.mainPubkey;
  const mainLocal = localFor(wallet, main);
  const mainName = mainLocal?.label ?? acc.memberNames?.[main] ?? "";

  return (
    <div className="combined-manage">
      <section className="main-wallet">
        <span className="main-wallet-label">{t("common.currentWallet")}</span>
        <div className="main-wallet-card">
          {mainName ? <div className="account-name">{mainName}</div> : null}
          <div className="account-addr-row">
            <span className="addr">{shortAddr(main)}</span>
            <CopyIconButton text={main} idleLabel={t("accounts.copyAddress")} />
          </div>
        </div>
      </section>
      <section className={`member-sheet${dragging ? " is-reordering" : ""}`} id="member-sheet">
        <div className="member-sheet-head">
          <h3>{t("accounts.members")}</h3>
          {editing ? (
          <button
            type="button"
            className="icon-btn accent-fill"
            title={t("common.add")}
            aria-label={t("common.add")}
            onClick={() => navigateTo("account-manage-add")}
          >
            <IconPlus size={18} />
          </button>
          ) : null}
        </div>
        {order.map((pk) => {
          const local = localFor(wallet, pk);
          const name = local?.label ?? acc.memberNames?.[pk] ?? "";
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
                const hit = ev.target as HTMLElement;
                if (hit.closest("button, .account-grip")) return;
                setMain(pk);
              }}
            >
              {edge === "before" ? <div className="account-drop-line" /> : null}
              <span className="account-grip" aria-hidden="true" />
              <button
                type="button"
                className={`main-pick${pk === main ? " on" : ""}`}
                aria-pressed={pk === main}
                aria-label={t("common.setAsCurrentWallet")}
                onClick={() => setMain(pk)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden="true">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              </button>
              <span className="member-kind-slot">
                {signing ? <AccountKindMark kind="signing" size={16} label={t("accounts.kindSigning")} /> : null}
              </span>
              <div className="member-copy">
                <div className="account-name">{name}</div>
                <div className="account-addr-row">
                  <span className="addr">{shortAddr(pk)}</span>
                  <CopyIconButton text={pk} idleLabel={t("accounts.copyAddress")} />
                </div>
              </div>
              {editing && !local ? (
                <button
                  type="button"
                  className="icon-btn member-rename"
                  title={t("accounts.renameAccount")}
                  aria-label={t("accounts.renameAccount")}
                  onClick={() => {
                    setMemberRenamePk(pk);
                    navigateTo("account-member-rename");
                  }}
                >
                  <IconRename />
                </button>
              ) : null}
              {editing ? (
              <button
                type="button"
                className="icon-btn trash-solid"
                title={t("common.delete")}
                aria-label={t("common.delete")}
                disabled={order.length <= 1}
                onClick={() => {
                  void (async () => {
                    clearError();
                    if (!confirm(t("accounts.removeMemberConfirm"))) return;
                    const res = await sendExtensionRequest("wallet.removeCombinedSub", {
                      combinedId: acc.id,
                      publicKeyBase58: pk,
                    });
                    if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
                    else await refresh();
                  })();
                }}
              >
                <IconTrash />
              </button>
              ) : null}
              {edge === "after" ? <div className="account-drop-line" /> : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function CombinedSwitchScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId } = usePopupContext();
  const { t } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  if (!acc || !("subPubkeys" in acc)) return <p className="muted">{t("error.accountNotFound")}</p>;
  return <CombinedManagePanel acc={acc} wallet={wallet} editing={false} />;
}

export function CombinedAddChoice(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <div className="manage-actions">
      <button type="button" className="manage-action-row neutral" onClick={() => navigateTo("account-manage-paste")}>
        <span>{t("common.address")}</span>
      </button>
      <button type="button" className="manage-action-row neutral" onClick={() => navigateTo("account-manage-local")}>
        <span>{t("common.localAccounts")}</span>
      </button>
    </div>
  );
}

export function CombinedPasteScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [value, setValue] = useState("");
  useRegisterDock({
    label: t("common.confirm"),
    disabled: !parsePublicKeyBase58(value.trim()),
    onPrimary: async () => {
      if (!focusAccountId) return;
      const res = await sendExtensionRequest("wallet.addCombinedSub", {
        combinedId: focusAccountId,
        publicKeyBase58: value.trim(),
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.addFailed"));
      else {
        await refresh();
        navigateTo("account-manage");
      }
    },
  });
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  return (
    <div className="field">
      <label htmlFor="member-paste">{t("common.address")}</label>
      <input
        id="member-paste"
        className="mono"
        value={value}
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
      />
      {acc ? null : <p className="muted">{t("error.accountNotFound")}</p>}
    </div>
  );
}

export function CombinedLocalScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const members = new Set(
    acc && "subPubkeys" in acc ? acc.subPubkeys.map((pk) => parsePublicKeyBase58(pk) ?? pk) : [],
  );
  const locals = wallet.accounts.filter(isSigningOrWatch);
  return (
    <div className="pick-list">
      {locals.map((a) => {
        const pk = parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58;
        const inSet = members.has(pk);
        return (
          <button
            key={a.id}
            type="button"
            className="manage-action-row neutral"
            disabled={inSet}
            onClick={() => {
              void (async () => {
                if (!focusAccountId || inSet) return;
                const res = await sendExtensionRequest("wallet.addCombinedSub", {
                  combinedId: focusAccountId,
                  publicKeyBase58: a.publicKeyBase58,
                });
                if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.addFailed"));
                else await refresh();
              })();
            }}
          >
            <span>
              {a.label} · {shortAddr(pk)}
              {inSet ? ` · ${t("accounts.alreadyIn")}` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MemberRenameScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const pk = memberRenamePk;
  const stored =
    acc && "memberNames" in acc ? acc.memberNames?.[pk] ?? "" : "";
  const [name, setName] = useState(stored);
  useRegisterDock({
    label: t("common.confirm"),
    disabled: false,
    onPrimary: async () => {
      if (!focusAccountId || !pk) return;
      const res = await sendExtensionRequest("wallet.setCombinedMemberName", {
        combinedId: focusAccountId,
        publicKeyBase58: pk,
        name,
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.renameFailed"));
      else {
        await refresh();
        navigateTo("account-manage");
      }
    },
  });
  return (
    <>
      <p className="muted addr-hint">{shortAddr(pk)}</p>
      <div className="field">
        <label htmlFor="member-name">{t("common.name")}</label>
        <input
          id="member-name"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </>
  );
}
