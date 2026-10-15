/**
 * Settings screen for transaction AI: toggle, OpenRouter key, and report/decisions model chains.
 * Does not start an assess or read the vault.
 */
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { hardenApiKeyInput } from "../lib/password-input";
import { IconCheck, IconEye } from "../components/StrokeIcon";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { PublicSettings, Settings } from "../../shared/storage-keys";
import {
  DEFAULT_DECISIONS_MODEL_CHAIN,
  DEFAULT_REPORT_MODEL_CHAIN,
  normalizeModelChain,
  type TxAiModelMode,
} from "../../shared/tx-ai";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import {
  MASKED_SECRET_DISPLAY,
  patchSettingsPartial,
  persistOpenRouterField,
  type SettingsIo,
} from "./settings-logic";

const CHAIN_SLOTS = 5;

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
  const [localMode, setLocalMode] = useState(mode);
  const [slots, setSlots] = useState<string[]>(() => padSlots(chain));
  const localModeRef = useRef(localMode);
  const slotsRef = useRef(slots);
  localModeRef.current = localMode;
  slotsRef.current = slots;

  // 只跟 server 的 mode；勿把 chain 放 dependency（refresh 會新陣列參考，打字會被洗回）
  useEffect(() => {
    setLocalMode(mode);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (localModeRef.current !== "custom") return;
      const normalized = normalizeModelChain(slotsRef.current, CHAIN_SLOTS);
      if (normalized.length === 0) return;
      void patchSettingsPartial(
        { [modeKey]: "custom", [chainKey]: normalized } as Partial<Settings>,
        io,
        locale,
      );
    };
  }, [modeKey, chainKey, io, locale]);

  const persistSlots = (nextMode: TxAiModelMode): void => {
    const normalized = normalizeModelChain(slotsRef.current, CHAIN_SLOTS);
    void patchSettingsPartial(
      { [modeKey]: nextMode, [chainKey]: normalized } as Partial<Settings>,
      io,
      locale,
    );
  };

  const pickDefault = (): void => {
    setLocalMode("default");
    persistSlots("default");
  };

  const pickCustom = (): void => {
    setLocalMode("custom");
    persistSlots("custom");
  };

  const displayChain = localMode === "default" ? defaultChain : slots;

  return (
    <div className="tx-ai-chain-block">
      <div className="tx-ai-chain-head">
        <span className="tx-ai-chain-title">{title}</span>
        <div className="tx-ai-mode-segment" role="group" aria-label={title}>
          <button
            type="button"
            className={localMode === "default" ? "active" : ""}
            aria-pressed={localMode === "default"}
            onClick={pickDefault}
          >
            {t("settings.txAiAnalysis.modeDefault")}
          </button>
          <button
            type="button"
            className={localMode === "custom" ? "active" : ""}
            aria-pressed={localMode === "custom"}
            onClick={pickCustom}
          >
            {t("settings.txAiAnalysis.modeCustom")}
          </button>
        </div>
      </div>
      <ol className="tx-ai-chain-list">
        {Array.from({ length: CHAIN_SLOTS }, (_, index) => {
          const value = displayChain[index] ?? "";
          const disabled = localMode === "default";
          return (
            <li key={index}>
              <input
                type="text"
                className="tx-ai-chain-input"
                value={value}
                readOnly={disabled}
                disabled={disabled}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  if (disabled) return;
                  const next = [...slots];
                  next[index] = event.target.value;
                  setSlots(padSlots(next));
                }}
              />
            </li>
          );
        })}
      </ol>
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
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) hardenApiKeyInput(inputRef.current);
  }, []);
  const storedMask = settings.openRouterConfigured ? MASKED_SECRET_DISPLAY : "";
  const display = !revealed && storedMask ? MASKED_SECRET_DISPLAY : draft;
  const commit = (value: string): void => {
    if (!wallet) return;
    void persistOpenRouterField({ draft: value, io, locale });
  };

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
      <div className="field keys-field">
        <label htmlFor="openrouter-api-key">{t("settings.openRouter.apiKey")}</label>
        <div className="keys-input-row">
          <input
            ref={inputRef}
            id="openrouter-api-key"
            type="text"
            autoComplete="off"
            placeholder={t("common.optional")}
            readOnly={!revealed && !!storedMask}
            value={display}
            onChange={(event) => {
              const value = event.target.value;
              setDraft(value);
              if (value === "") commit(value);
            }}
            onBlur={(event) => commit(event.currentTarget.value)}
          />
          <button
            type="button"
            className="icon-btn ghost-inline keys-reveal-btn"
            title={t("common.show")}
            aria-label={t("common.show")}
            onClick={() => {
              setRevealed((current) => {
                const next = !current;
                if (next) {
                  void sendExtensionRequest("wallet.readIntegrationSecrets", {}).then((res) => {
                    if (!res.ok) return;
                    const key = (res.result as { openRouterApiKey?: string } | undefined)?.openRouterApiKey ?? "";
                    setDraft((existing) => (existing.trim() ? existing : key));
                  });
                }
                return next;
              });
            }}
          >
            <IconEye />
          </button>
          <button
            type="button"
            className="icon-btn ghost-inline keys-confirm-btn"
            title={t("common.confirm")}
            aria-label={t("common.confirm")}
            onClick={() => commit(inputRef.current?.value ?? draft)}
          >
            <IconCheck />
          </button>
        </div>
      </div>
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
