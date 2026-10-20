/**
 * Popup accounts list with drag reorder and per-card actions.
 * Does not render manage, rename, or combined-create flows.
 */
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountVisualKind } from "../../shared/marks";
import { getExposedPublicKey, isSigningOrWatch } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import type { AccountMeta } from "../../shared/protocol";
import { AccountKindMark } from "../components/AccountKindMark";
import { CopyIconButton } from "../components/CopyPkButton";
import { IconKebab, IconPlus, IconRename, IconSwitch } from "../components/StrokeIcon";
import { apiErrorMessage } from "../../shared/i18n";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import type { State } from "../types";

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
