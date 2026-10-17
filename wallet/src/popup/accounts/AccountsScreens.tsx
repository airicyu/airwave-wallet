/**
 * Accounts list, manage, rename, and combined-create screens.
 * Does not own vault session or Home token rows.
 */
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountVisualKind } from "../../shared/account-kind-visual";
import {
  getExposedPublicKey,
  isCombinedAccount,
  isSigningOrWatch,
  parsePublicKeyBase58,
} from "../../shared/accounts";
import { ACCOUNT_LABEL_MAX } from "../../shared/account-label";
import { sendExtensionRequest } from "../../shared/ext-api";
import { accountKind, type AccountMeta } from "../../shared/storage-keys";
import { AccountKindMark } from "../components/AccountKindMark";
import { CopyIconButton } from "../components/CopyPkButton";
import { IconCopy, IconEye, IconKebab, IconPlus, IconRename, IconSwitch, IconX } from "../components/StrokeIcon";
import { CombinedManagePanel } from "./CombinedManage";
import { addCombinedDraftParts, emptyCombinedCreate, validCombinedMembers } from "./combined-logic";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import { apiErrorMessage } from "../../shared/ui-i18n";
import { shortAddr } from "../lib/format";
import { viewAfterAccountCreated } from "../lib/rpc-guide";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { CombinedCreateState, State } from "../types";

const ACCOUNT_DRAG_PX = 6;

export function AccountsList({ wallet }: { wallet: State }): JSX.Element {
  const { navigateTo, refresh, showError, clearError } = usePopupContext();
  const { t, locale } = useT();
  const [order, setOrder] = useState(() => wallet.accounts.map((a) => a.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropLine, setDropLine] = useState<{ id: string; edge: "before" | "after" } | null>(null);
  const dropLineRef = useRef(dropLine);
  dropLineRef.current = dropLine;
  const dragRef = useRef<{ id: string; startY: number; live: boolean } | null>(null);
  const skipClickRef = useRef(false);

  useEffect(() => {
    setOrder(wallet.accounts.map((a) => a.id));
  }, [wallet.accounts]);

  const persistOrder = useCallback(
    async (next: string[]) => {
      const res = await sendExtensionRequest("wallet.reorderAccounts", { orderedIds: next });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
      else await refresh();
    },
    [locale, refresh, showError],
  );

  const onPointerMove = useCallback((ev: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.live && Math.abs(ev.clientY - drag.startY) < ACCOUNT_DRAG_PX) return;
    if (!drag.live) {
      drag.live = true;
      skipClickRef.current = true;
      setDraggingId(drag.id);
      window.getSelection()?.removeAllRanges();
    }
    ev.preventDefault();
    const cards = Array.from(document.querySelectorAll<HTMLElement>("#accounts-list .account-card"));
    let line: { id: string; edge: "before" | "after" } | null = null;
    for (const card of cards) {
      const id = card.dataset.accountId;
      if (!id) continue;
      const r = card.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (ev.clientY < r.bottom && ev.clientY >= r.top) {
        line = { id, edge: ev.clientY < mid ? "before" : "after" };
        break;
      }
    }
    setDropLine(line);
  }, []);

  const onPointerUp = useCallback(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    const line = dropLineRef.current;
    setDropLine(null);
    if (!drag?.live || !line) return;
    setOrder((prev) => {
      const next = prev.filter((id) => id !== drag.id);
      let idx = next.indexOf(line.id);
      if (idx < 0) return prev;
      if (line.edge === "after") idx += 1;
      next.splice(idx, 0, drag.id);
      void persistOrder(next);
      return next;
    });
  }, [onPointerMove, persistOrder]);

  const startDrag = (id: string, ev: ReactPointerEvent) => {
    if (!(ev.target as HTMLElement).closest(".account-grip")) return;
    ev.preventDefault();
    window.getSelection()?.removeAllRanges();
    dragRef.current = { id, startY: ev.clientY, live: false };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
  };

  const byId = new Map(wallet.accounts.map((a) => [a.id, a]));
  const ordered = order.map((id) => byId.get(id)).filter((a): a is AccountMeta => a != null);

  return (
    <>
      <div className="subpage-head compact">
        <h2>{t("nav.accounts")}</h2>
        <button
          type="button"
          className="icon-btn primary"
          id="btn-go-add-account"
          title={t("nav.addAccount")}
          aria-label={t("nav.addAccount")}
          onClick={() => navigateTo("add-account")}
        >
          <IconPlus size={18} />
        </button>
      </div>
      <div id="accounts-list" className={draggingId ? "is-reordering" : undefined}>
        {ordered.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            wallet={wallet}
            dragging={draggingId === a.id}
            dropEdge={dropLine?.id === a.id ? dropLine.edge : null}
            onMainPointerDown={(ev) => startDrag(a.id, ev)}
            onMainClick={async () => {
              if (skipClickRef.current) {
                skipClickRef.current = false;
                return;
              }
              clearError();
              const res = await sendExtensionRequest("wallet.setActiveAccount", { accountId: a.id });
              if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.switchFailed"));
              else {
                await refresh();
                navigateTo("home-token");
              }
            }}
          />
        ))}
      </div>
    </>
  );
}

function AccountCard({
  account: a,
  wallet,
  dragging,
  dropEdge,
  onMainPointerDown,
  onMainClick,
}: {
  account: AccountMeta;
  wallet: State;
  dragging: boolean;
  dropEdge: "before" | "after" | null;
  onMainPointerDown: (ev: ReactPointerEvent) => void;
  onMainClick: () => void;
}): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  const kind = accountVisualKind(a);
  return (
    <div
      className={`account-card${a.id === wallet.activeAccountId ? " active" : ""}${dragging ? " is-dragging" : ""}`}
      data-account-id={a.id}
    >
      {dropEdge === "before" ? <div className="account-drop-line" /> : null}
      <div className="account-card-body">
        <div className="account-card-main" onPointerDown={onMainPointerDown} onClick={() => onMainClick()}>
          <span className="account-grip" aria-hidden="true" />
          <AccountKindMark
            kind={kind}
            size={16}
            label={
              kind === "combined"
                ? t("accounts.kindCombined")
                : kind === "readOnly"
                  ? t("accounts.kindReadOnly")
                  : t("accounts.kindSigning")
            }
          />
          <div className="account-card-copy">
            <div className="account-title-row">
              <span className="account-name">{a.label}</span>
              {a.id === wallet.activeAccountId ? (
                <span className="badge" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  {t("accounts.active")}
                </span>
              ) : null}
            </div>
            <div className="account-addr-row">
              <span className="addr">{shortAddr(getExposedPublicKey(a))}</span>
              <CopyIconButton
                text={getExposedPublicKey(a)}
                idleLabel={t("accounts.copyAddress")}
                stopPropagation
              />
            </div>
          </div>
        </div>
        {kind === "combined" ? (
          <button
            type="button"
            className="icon-btn account-side-rename"
            title={t("accounts.changeCurrentWallet")}
            aria-label={t("accounts.changeCurrentWallet")}
            onClick={(ev) => {
              ev.stopPropagation();
              navigateTo("account-switch", a.id);
            }}
          >
            <IconSwitch size={16} />
          </button>
        ) : null}
        <button
          type="button"
          className="icon-btn account-side-rename"
          title={t("accounts.renameAccount")}
          aria-label={t("accounts.renameAccount")}
          onClick={(ev) => {
            ev.stopPropagation();
            navigateTo("account-rename", a.id);
          }}
        >
          <IconRename />
        </button>
        <button
          type="button"
          className="icon-btn"
          title={t("accounts.manageAccount")}
          aria-label={t("accounts.manageAccount")}
          onClick={() => navigateTo("account-manage", a.id)}
        >
          <IconKebab />
        </button>
      </div>
      {dropEdge === "after" ? <div className="account-drop-line" /> : null}
    </div>
  );
}

export function RenameScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, clearError, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const [renameLabel, setRenameLabel] = useState(acc?.label ?? "");
  useRegisterDock({
    label: t("common.confirm"),
    disabled: false,
    onPrimary: async () => {
      clearError();
      if (!focusAccountId || !renameLabel.trim()) return;
      const res = await sendExtensionRequest("wallet.renameAccount", {
        accountId: focusAccountId,
        label: renameLabel,
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.renameFailed"));
      else {
        await refresh();
        navigateTo("accounts");
      }
    },
  });

  return (
    <>
      <p id="rename-addr-hint" className="muted addr-hint">
        {acc ? shortAddr(getExposedPublicKey(acc)) : ""}
      </p>
      <div className="field">
        <label htmlFor="rename-label">{t("common.name")}</label>
        <input
          id="rename-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("accounts.newNamePlaceholder")}
          value={renameLabel}
          onChange={(e) => setRenameLabel(e.target.value)}
        />
      </div>
    </>
  );
}

export function ManageScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, setFocusAccountId, clearError, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  if (!acc) return <p className="muted">{t("error.accountNotFound")}</p>;
  const combined = isCombinedAccount(acc);
  const ro = !combined && accountKind(acc) === "readOnly";
  if (combined) return <CombinedManagePanel acc={acc} wallet={wallet} />;
  return (
    <>
      <p id="manage-name" className="manage-name">
        {acc.label}
      </p>
      <p id="manage-addr" className="manage-addr">
        {isSigningOrWatch(acc) ? acc.publicKeyBase58 : ""}
      </p>
      <p id="manage-readOnly-badge" className="badge" hidden={!ro}>
        {t("accounts.badgeReadOnly")}
      </p>
      <div className="manage-actions">
        <button
          type="button"
          className="manage-action-row neutral"
          id="btn-go-reveal"
          hidden={combined || ro || !wallet.unlocked}
          onClick={() => navigateTo("account-reveal-key")}
        >
          <span>{t("accounts.revealPrivateKey")}</span>
        </button>
        <button
          type="button"
          className="manage-action-row danger"
          id="btn-delete"
          onClick={async () => {
            clearError();
            if (!focusAccountId) return;
            if (!confirm(t("accounts.removeConfirm"))) return;
            const res = await sendExtensionRequest("wallet.deleteAccount", { accountId: focusAccountId });
            if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.deleteFailed"));
            else {
              setFocusAccountId(null);
              await refresh();
              navigateTo("accounts");
            }
          }}
        >
          {t("accounts.removeWalletAccount")}
        </button>
      </div>
    </>
  );
}

export function RevealScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, clearError, showError } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);

  if (revealed) {
    return (
      <>
        <p id="reveal-hint" className="muted">
          {acc && isSigningOrWatch(acc) ? `${acc.label} · ${shortAddr(acc.publicKeyBase58)}` : ""}
        </p>
        <div id="reveal-secret-block">
          <div className="secret-card">
            <div className="secret-value-row">
              <div className="secret-value" id="reveal-secret-text">
                {revealed}
              </div>
              <button
                type="button"
                className="icon-btn primary ghost-inline"
                id="btn-copy-secret"
                title={t("accounts.copyPrivateKey")}
                aria-label={t("accounts.copyPrivateKey")}
                onClick={() => {
                  void navigator.clipboard.writeText(revealed);
                }}
              >
                <IconCopy size={18} />
              </button>
            </div>
          </div>
          <p className="muted small">{t("accounts.revealWarn")}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <p id="reveal-hint" className="muted">
        {acc && isSigningOrWatch(acc) ? `${acc.label} · ${shortAddr(acc.publicKeyBase58)}` : ""}
      </p>
      <div id="reveal-mask-block">
        <div className="secret-card">
          <div className="secret-mask">••••••••••••••••</div>
        </div>
        <div className="field">
          <label htmlFor="reveal-password">{t("accounts.walletPassword")}</label>
          <WalletPasswordInput id="reveal-password" value={password} onChange={setPassword} />
        </div>
        <button
          type="button"
          className="icon-btn primary"
          id="btn-reveal-submit"
          title={t("accounts.revealPrivateKey")}
          aria-label={t("accounts.revealPrivateKey")}
          onClick={async () => {
            clearError();
            if (!focusAccountId) return;
            const res = await sendExtensionRequest("wallet.exportAccountSecret", {
              accountId: focusAccountId,
              password,
            });
            if (!res.ok) {
              showError(apiErrorMessage(locale, res.error, "error.exportFailed"));
              return;
            }
            const { secretBase58 } = res.result as { secretBase58: string };
            setRevealed(secretBase58);
            setPassword("");
          }}
        >
          <IconEye size={18} />
        </button>
      </div>
    </>
  );
}

export function ConnectedSites({ wallet }: { wallet: State }): JSX.Element {
  const { clearError, showError, refresh } = usePopupContext();
  const { t, locale } = useT();
  return (
    <>
      <ul id="connected-list" className="connected-list">
        {wallet.connections.map((c) => (
          <li key={c.origin} className="connected-row">
            <span>{c.origin}</span>
            <button
              type="button"
              className="icon-btn"
              title={t("accounts.disconnect")}
              aria-label={t("accounts.disconnect")}
              onClick={async () => {
                clearError();
                const res = await sendExtensionRequest("wallet.disconnectOrigin", { origin: c.origin });
                if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.disconnectFailed"));
                else await refresh();
              }}
            >
              <IconX />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="block-btn"
        id="btn-disconnect-all"
        onClick={async () => {
          clearError();
          const res = await sendExtensionRequest("wallet.disconnectAllOrigins");
          if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.disconnectFailed"));
          else await refresh();
        }}
      >
        {t("common.allDisconnect")}
      </button>
    </>
  );
}

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
