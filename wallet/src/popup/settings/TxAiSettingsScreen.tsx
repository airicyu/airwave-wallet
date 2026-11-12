/**
 * Settings screen for transaction AI: toggle, OpenRouter key, and report/decisions model chains.
 * Custom model ids are written from that row's confirm control.
 * Dragging a row writes the new order immediately.
 */
import type { JSX, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicSettings, Settings } from "../../shared/protocol";
import {
  DEFAULT_DECISIONS_MODEL_CHAIN,
  DEFAULT_REPORT_MODEL_CHAIN,
  isLegalOpenRouterModelId,
  normalizeModelChain,
  type TxAiModelMode,
} from "../../shared/tx-ai";
import { IconCheck, IconX } from "../components/StrokeIcon";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import {
  patchSettingsPartial,
  persistOpenRouterField,
  type SettingsIo,
} from "./settings-logic";
import { SecretKeyField } from "./SecretKeyField";

const CHAIN_SLOTS = 5;
const CHAIN_DRAG_PX = 6;

type ChainSlot = { id: string; value: string; saved: string };

let chainSlotSeq = 0;

function slotsFrom(chain: string[]): ChainSlot[] {
  return padSlots(chain).map((value) => ({ id: `chain-slot-${chainSlotSeq++}`, value, saved: value }));
}

function useSettingsIo(): SettingsIo {
  const { refresh, showError, wallet } = usePopupContext();
  const locale = wallet?.settings.locale ?? "zh-Hant";
  return { refresh, showError, locale };
}

function ModelChainSection({
  title,
  mode,
  chain,
  defaultChain,
  modeKey,
  chainKey,
  io,
  locale,
}: {
  title: string;
  mode: TxAiModelMode;
  chain: string[];
  defaultChain: readonly string[];
  modeKey: "openRouterReportModelMode" | "openRouterDecisionsModelMode";
  chainKey: "openRouterReportModelChain" | "openRouterDecisionsModelChain";
  io: SettingsIo;
  locale: Settings["locale"];
}): JSX.Element {
  const { t } = useT();
  const saved = padSlots(chain);
  const savedKey = saved.join("\n");
  const [localMode, setLocalMode] = useState(mode);
  const [slots, setSlots] = useState<ChainSlot[]>(() => slotsFrom(chain));
  const [seen, setSeen] = useState(savedKey);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropLine, setDropLine] = useState<{ id: string; edge: "before" | "after" } | null>(null);
  const dropLineRef = useRef(dropLine);
  const dragRef = useRef<{ id: string; startY: number; live: boolean } | null>(null);
  dropLineRef.current = dropLine;
  const listId = `tx-ai-chain-${chainKey}`;
  const localSavedKey = slots.map((slot) => slot.saved).join("\n");

  if (savedKey !== seen) {
    setSeen(savedKey);
    if (savedKey !== localSavedKey) setSlots(slotsFrom(chain));
  }

  useEffect(() => {
    setLocalMode(mode);
  }, [mode]);

  const pickMode = (nextMode: TxAiModelMode): void => {
    setLocalMode(nextMode);
    void patchSettingsPartial({ [modeKey]: nextMode } as Partial<Settings>, io, locale);
  };

  const commitSlot = (slot: ChainSlot): void => {
    const nextId = slot.value.trim();
    if (nextId && !isLegalOpenRouterModelId(nextId)) return;
    const raw = slots.map((item) => (item.id === slot.id ? nextId : item.saved.trim())).filter(Boolean);
    const normalized = normalizeModelChain(raw, CHAIN_SLOTS);
    if (normalized.length === 0) return;
    if (nextId && !normalized.includes(nextId)) return;
    setSlots((prev) => prev.map((item) => (
      item.id === slot.id ? { ...item, value: nextId, saved: nextId } : item
    )));
    void patchSettingsPartial(
      { [modeKey]: "custom", [chainKey]: normalized } as Partial<Settings>,
      io,
      locale,
    );
  };

  const persistOrder = useCallback((next: ChainSlot[]) => {
    const normalized = normalizeModelChain(next.map((slot) => slot.saved), CHAIN_SLOTS);
    const current = normalizeModelChain(chain, CHAIN_SLOTS);
    if (normalized.length === 0 || normalized.join("\n") === current.join("\n")) return;
    void patchSettingsPartial(
      { [modeKey]: "custom", [chainKey]: normalized } as Partial<Settings>,
      io,
      locale,
    );
  }, [chain, chainKey, io, locale, modeKey]);

  const onPointerMove = useCallback((ev: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.live && Math.abs(ev.clientY - drag.startY) < CHAIN_DRAG_PX) return;
    if (!drag.live) {
      drag.live = true;
      setDraggingId(drag.id);
      window.getSelection()?.removeAllRanges();
    }
    ev.preventDefault();
    const cards = Array.from(document.querySelectorAll<HTMLElement>(`#${listId} .tx-ai-chain-card`));
    let line: { id: string; edge: "before" | "after" } | null = null;
    for (const card of cards) {
      const id = card.dataset.slotId;
      if (!id) continue;
      const rect = card.getBoundingClientRect();
      if (ev.clientY < rect.bottom && ev.clientY >= rect.top) {
        const mid = rect.top + rect.height / 2;
        line = { id, edge: ev.clientY < mid ? "before" : "after" };
        break;
      }
    }
    setDropLine(line);
  }, [listId]);

  const onPointerUp = useCallback(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    const drag = dragRef.current;
    dragRef.current = null;
    setDraggingId(null);
    const line = dropLineRef.current;
    setDropLine(null);
    if (!drag?.live || !line || line.id === drag.id) return;
    setSlots((prev) => {
      const next = prev.filter((slot) => slot.id !== drag.id);
      const moved = prev.find((slot) => slot.id === drag.id);
      let idx = next.findIndex((slot) => slot.id === line.id);
      if (!moved || idx < 0) return prev;
      if (line.edge === "after") idx += 1;
      next.splice(idx, 0, moved);
      persistOrder(next);
      return next;
    });
  }, [onPointerMove, persistOrder]);

  const startDrag = (id: string, ev: ReactPointerEvent): void => {
    if (!(ev.target as HTMLElement).closest(".account-grip")) return;
    ev.preventDefault();
    window.getSelection()?.removeAllRanges();
    dragRef.current = { id, startY: ev.clientY, live: false };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div className="tx-ai-chain-block">
      <div className="tx-ai-chain-head">
        <span className="tx-ai-chain-title">{title}</span>
        <div className="tx-ai-mode-segment" role="group" aria-label={title}>
          <button
            type="button"
            className={localMode === "default" ? "active" : ""}
            aria-pressed={localMode === "default"}
            onClick={() => pickMode("default")}
          >
            {t("settings.txAiAnalysis.modeDefault")}
          </button>
          <button
            type="button"
            className={localMode === "custom" ? "active" : ""}
            aria-pressed={localMode === "custom"}
            onClick={() => pickMode("custom")}
          >
            {t("settings.txAiAnalysis.modeCustom")}
          </button>
        </div>
      </div>
      {localMode === "default" ? (
        <ol className="tx-ai-chain-list">
          {Array.from({ length: CHAIN_SLOTS }, (_, index) => (
            <li key={index}>
              <input
                type="text"
                className="tx-ai-chain-input"
                value={defaultChain[index] ?? ""}
                readOnly
                disabled
                autoComplete="off"
                spellCheck={false}
              />
            </li>
          ))}
        </ol>
      ) : (
        <ol id={listId} className={`tx-ai-chain-list${draggingId ? " is-reordering" : ""}`}>
          {slots.map((slot) => {
            const dirty = slot.value !== slot.saved;
            const dropEdge = dropLine?.id === slot.id ? dropLine.edge : null;
            return (
              <li
                key={slot.id}
                className={`tx-ai-chain-card${draggingId === slot.id ? " is-dragging" : ""}`}
                data-slot-id={slot.id}
              >
                {dropEdge === "before" ? <div className="tx-ai-chain-drop" /> : null}
                <div className="tx-ai-chain-row" onPointerDown={(ev) => startDrag(slot.id, ev)}>
                  <span className="account-grip" aria-hidden="true" />
                  <input
                    type="text"
                    className="tx-ai-chain-input"
                    value={slot.value}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSlots((prev) => prev.map((item) => (item.id === slot.id ? { ...item, value } : item)));
                    }}
                  />
                  {dirty ? (
                    <>
                      <button
                        type="button"
                        className="icon-btn confirm-tick"
                        title={t("common.confirm")}
                        aria-label={t("common.confirm")}
                        onClick={() => commitSlot(slot)}
                      >
                        <IconCheck />
                      </button>
                      <button
                        type="button"
                        className="icon-btn discard-cross"
                        title={t("common.discard")}
                        aria-label={t("common.discard")}
                        onClick={() => {
                          setSlots((prev) => prev.map((item) => (
                            item.id === slot.id ? { ...item, value: item.saved } : item
                          )));
                        }}
                      >
                        <IconX />
                      </button>
                    </>
                  ) : null}
                </div>
                {dropEdge === "after" ? <div className="tx-ai-chain-drop" /> : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function padSlots(chain: string[]): string[] {
  const out = chain.slice(0, CHAIN_SLOTS);
  while (out.length < CHAIN_SLOTS) out.push("");
  return out;
}

export function TxAiSettingsScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const { wallet } = usePopupContext();
  const io = useSettingsIo();
  const { locale, t } = useT();
  const [claimedId, setClaimedId] = useState<string | null>(null);

  return (
    <>
      <div className="tx-ai-toggle-row">
        <span className="name">{t("settings.txAiAnalysis.enable")}</span>
        <button
          type="button"
          className="tx-ai-switch"
          role="switch"
          aria-checked={settings.txAiAnalysisEnabled}
          onClick={() => {
            void patchSettingsPartial({ txAiAnalysisEnabled: !settings.txAiAnalysisEnabled }, io, locale);
          }}
        />
      </div>
      <SecretKeyField
        id="openrouter-api-key"
        label={t("settings.openRouter.apiKey")}
        configured={settings.openRouterConfigured}
        secretName="openRouterApiKey"
        claimedId={claimedId}
        onClaim={setClaimedId}
        onRelease={(rowId) => setClaimedId((current) => (current === rowId ? null : current))}
        persist={(value) => {
          if (!wallet) return Promise.resolve(false);
          return persistOpenRouterField({ draft: value, io, locale });
        }}
      />
      <ModelChainSection
        title={t("settings.openRouter.model")}
        mode={settings.openRouterReportModelMode}
        chain={settings.openRouterReportModelChain}
        defaultChain={DEFAULT_REPORT_MODEL_CHAIN}
        modeKey="openRouterReportModelMode"
        chainKey="openRouterReportModelChain"
        io={io}
        locale={locale}
      />
      <ModelChainSection
        title={t("settings.openRouter.decisionsModel")}
        mode={settings.openRouterDecisionsModelMode}
        chain={settings.openRouterDecisionsModelChain}
        defaultChain={DEFAULT_DECISIONS_MODEL_CHAIN}
        modeKey="openRouterDecisionsModelMode"
        chainKey="openRouterDecisionsModelChain"
        io={io}
        locale={locale}
      />
    </>
  );
}
