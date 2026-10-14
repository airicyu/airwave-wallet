/**
 * Address cards list, inline rename, add page, and full-screen send picker.
 * Does not write chrome.storage; mutations go through addressBook commands.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { isAddress } from "@solana/kit";
import { getExposedPublicKey } from "../../shared/accounts";
import { accountVisualKind } from "../../shared/account-kind-visual";
import { sendExtensionRequest } from "../../shared/ext-api";
import { apiErrorMessage } from "../../shared/ui-i18n";
import { AccountKindMark } from "../components/AccountKindMark";
import { IconCheck, IconCopy, IconPlus, IconRename, IconTrash } from "../components/StrokeIcon";
import { shortAddr } from "../lib/format";
import { patchSendDraft } from "../send/send-draft";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { State } from "../types";

function errorText(code: string | undefined, t: (key: "addressCards.invalid" | "addressCards.duplicate" | "addressCards.notFound") => string): string {
  if (code === "INVALID_ADDRESS") return t("addressCards.invalid");
  if (code === "DUPLICATE_ADDRESS") return t("addressCards.duplicate");
  if (code === "NOT_FOUND") return t("addressCards.notFound");
  return "";
}

const DRAG_PX = 6;

export function AddressCardsScreen({ wallet }: { wallet: State }): JSX.Element {
  const { navigateTo, showError } = usePopupContext();
  const { t, locale } = useT();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState("");
  const [order, setOrder] = useState(() => wallet.addressBook.map((c) => c.id));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropLine, setDropLine] = useState<{ id: string; edge: "before" | "after" } | null>(null);
  const dropLineRef = useRef(dropLine);
  dropLineRef.current = dropLine;
  const dragRef = useRef<{ id: string; startY: number; live: boolean } | null>(null);

  useEffect(() => {
    setOrder(wallet.addressBook.map((c) => c.id));
  }, [wallet.addressBook]);

  const persistOrder = useCallback(
    async (next: string[]) => {
      const res = await sendExtensionRequest("addressBook.reorder", { orderedIds: next });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
    },
    [locale, showError],
  );

  const onPointerMove = useCallback((ev: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.live && Math.abs(ev.clientY - drag.startY) < DRAG_PX) return;
    if (!drag.live) {
      drag.live = true;
      setDraggingId(drag.id);
      window.getSelection()?.removeAllRanges();
    }
    ev.preventDefault();
    const cards = Array.from(document.querySelectorAll<HTMLElement>("#address-cards-list .account-card"));
    let line: { id: string; edge: "before" | "after" } | null = null;
    for (const card of cards) {
      const id = card.dataset.cardId;
      if (!id) continue;
      const r = card.getBoundingClientRect();
      if (ev.clientY < r.bottom && ev.clientY >= r.top) {
        line = { id, edge: ev.clientY < r.top + r.height / 2 ? "before" : "after" };
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
    if ((ev.target as HTMLElement).closest("button, input")) return;
    ev.preventDefault();
    dragRef.current = { id, startY: ev.clientY, live: false };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
  };

  async function commitRename(id: string, current: string): Promise<void> {
    const name = draftName.trim();
    setEditingId(null);
    if (!name || name === current) return;
    const res = await sendExtensionRequest("addressBook.rename", { id, name });
    if (!res.ok) setNotice(errorText(res.error?.code, t) || res.error?.message || "");
  }

  async function remove(id: string, address: string): Promise<void> {
    if (!confirm(`${t("addressCards.deleteTitle")}\n${shortAddr(address)}`)) return;
    const res = await sendExtensionRequest("addressBook.remove", { id });
    if (!res.ok) setNotice(errorText(res.error?.code, t) || res.error?.message || "");
  }

  const head = (
    <div className="subpage-head compact">
      <h2>{t("menu.addressCards")}</h2>
      <button
        type="button"
        className="icon-btn primary"
        id="btn-go-add-address"
        title={t("common.add")}
        aria-label={t("common.add")}
        onClick={() => navigateTo("address-cards-add")}
      >
        <IconPlus size={18} />
      </button>
    </div>
  );

  if (wallet.addressBook.length === 0) {
    return (
      <>
        {head}
        <p className="address-cards-empty">{t("addressCards.empty")}</p>
      </>
    );
  }

  const byId = new Map(wallet.addressBook.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId.get(id)).filter((c) => c != null);

  return (
    <>
    {head}
    <div id="address-cards-list" className={draggingId ? "is-reordering" : undefined}>
      {notice ? <p className="inline-err">{notice}</p> : null}
      {ordered.map((card) => {
        const editing = editingId === card.id;
        return (
          <div
            key={card.id}
            className={`account-card${draggingId === card.id ? " is-dragging" : ""}`}
            data-card-id={card.id}
          >
            {dropLine?.id === card.id && dropLine.edge === "before" ? <div className="account-drop-line" /> : null}
            <div className="account-card-body">
              <div className="account-card-main" onPointerDown={(ev) => startDrag(card.id, ev)}>
                <span className="account-grip" aria-hidden="true" />
                <div className="account-card-copy">
                  <div className="account-title-row">
                    {editing ? (
                      <input
                        className="address-card-input"
                        value={draftName}
                        aria-label={t("addressCards.name")}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => void commitRename(card.id, card.name)}
                      />
                    ) : (
                      <span className="account-name">{card.name}</span>
                    )}
                    <button
                      type="button"
                      className="icon-btn ghost-inline"
                      title={editing ? t("common.confirm") : t("accounts.renameAccount")}
                      aria-label={editing ? t("common.confirm") : t("accounts.renameAccount")}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (editing) void commitRename(card.id, card.name);
                        else {
                          setDraftName(card.name);
                          setEditingId(card.id);
                        }
                      }}
                    >
                      {editing ? <IconCheck /> : <IconRename />}
                    </button>
                  </div>
                  <div className="account-addr-row">
                    <span className="addr">{shortAddr(card.address)}</span>
                    <button
                      type="button"
                      className="icon-btn ghost-inline"
                      title={t("common.copy")}
                      aria-label={t("common.copy")}
                      onClick={() => void navigator.clipboard.writeText(card.address)}
                    >
                      <IconCopy />
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                title={t("common.delete")}
                aria-label={t("common.delete")}
                onClick={() => void remove(card.id, card.address)}
              >
                <IconTrash />
              </button>
            </div>
            {dropLine?.id === card.id && dropLine.edge === "after" ? <div className="account-drop-line" /> : null}
          </div>
        );
      })}
    </div>
    </>
  );
}

export function AddressCardsAddScreen(): JSX.Element {
  const { t } = useT();
  const { navigateTo } = usePopupContext();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const canSubmit = name.trim().length > 0 && isAddress(address.trim()) && !busy && !blocked;

  useRegisterDock({
    label: t("addressCards.add"),
    disabled: !canSubmit,
    onPrimary: async () => {
      setBusy(true);
      const res = await sendExtensionRequest("addressBook.add", {
        name: name.trim(),
        address: address.trim(),
      });
      setBusy(false);
      if (!res.ok) {
        setBlocked(true);
        setError(errorText(res.error?.code, t) || res.error?.message || "");
        return;
      }
      navigateTo("address-cards");
    },
  });

  return (
    <div className="address-cards-add">
      <label className="field-label" htmlFor="address-card-name">
        {t("addressCards.name")}
      </label>
      <input
        id="address-card-name"
        className="token-send-input"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError("");
          setBlocked(false);
        }}
      />
      <label className="field-label" htmlFor="address-card-address">
        {t("addressCards.address")}
      </label>
      <input
        id="address-card-address"
        className="token-send-input mono"
        value={address}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setAddress(e.target.value);
          setError("");
          setBlocked(false);
        }}
      />
      {error || (address.trim() && !isAddress(address.trim())) ? (
        <p className="inline-err">{error || t("addressCards.invalid")}</p>
      ) : null}
    </div>
  );
}

export function SendPickScreen({ wallet }: { wallet: State }): JSX.Element {
  const { t } = useT();
  const { navigateTo } = usePopupContext();
  const [tab, setTab] = useState<"wallet" | "cards">("wallet");

  function choose(address: string, label: string): void {
    patchSendDraft({ recipient: address, label });
    navigateTo("token-send");
  }

  return (
    <div className="send-pick">
      <div className="send-pick-tabs">
        <button type="button" className={tab === "wallet" ? "on" : ""} onClick={() => setTab("wallet")}>
          {t("addressCards.tabWallet")}
        </button>
        <button type="button" className={tab === "cards" ? "on" : ""} onClick={() => setTab("cards")}>
          {t("addressCards.tabCards")}
        </button>
      </div>
      {tab === "wallet"
        ? wallet.accounts.map((account) => {
            const kind = accountVisualKind(account);
            const address = getExposedPublicKey(account);
            const label =
              kind === "combined"
                ? t("accounts.kindCombined")
                : kind === "readOnly"
                  ? t("accounts.kindReadOnly")
                  : t("accounts.kindSigning");
            return (
              <button key={account.id} type="button" className="send-pick-row" onClick={() => choose(address, account.label)}>
                <AccountKindMark kind={kind} label={label} />
                <span className="book-main">
                  <span className="account-name">{account.label}</span>
                  <span className="mono dim">{shortAddr(address)}</span>
                </span>
              </button>
            );
          })
        : wallet.addressBook.length === 0
          ? <p className="address-cards-empty">{t("addressCards.empty")}</p>
          : wallet.addressBook.map((card) => (
              <button key={card.id} type="button" className="send-pick-row" onClick={() => choose(card.address, card.name)}>
                <span className="book-main">
                  <span className="account-name">{card.name}</span>
                  <span className="mono dim">{shortAddr(card.address)}</span>
                </span>
              </button>
            ))}
    </div>
  );
}
