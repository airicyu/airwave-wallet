/**
 * Settings screen for transaction AI: toggle, OpenRouter key, and the two model menus.
 * Does not start an assess or read the vault.
 */
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { hardenApiKeyInput } from "../lib/password-input";
import { IconCheck, IconEye } from "../components/StrokeIcon";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { PublicSettings } from "../../shared/storage-keys";
import {
  DECISIONS_MODELS,
  REPORT_MODELS,
  decisionsModelLabelKey,
  reportModelLabelKey,
} from "../../shared/tx-ai";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import {
  MASKED_SECRET_DISPLAY,
  patchSettingsPartial,
  persistOpenRouterField,
  type SettingsIo,
} from "./settings-logic";

function useSettingsIo(): SettingsIo {
  const { refresh, showError, wallet } = usePopupContext();
  const locale = wallet?.settings.locale ?? "zh-Hant";
  return { refresh, showError, locale };
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
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => commit(inputRef.current?.value ?? draft)}
          >
            <IconCheck />
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="openrouter-report-model">{t("settings.openRouter.model")}</label>
        <select
          id="openrouter-report-model"
          value={settings.openRouterModel}
          onChange={(event) => {
            void patchSettingsPartial({ openRouterModel: event.target.value }, io, locale);
          }}
        >
          {REPORT_MODELS.map((model) => (
            <option key={model} value={model}>
              {t(reportModelLabelKey(model))}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="openrouter-decisions-model">{t("settings.openRouter.decisionsModel")}</label>
        <select
          id="openrouter-decisions-model"
          value={settings.openRouterDecisionsModel}
          onChange={(event) => {
            void patchSettingsPartial({ openRouterDecisionsModel: event.target.value }, io, locale);
          }}
        >
          {DECISIONS_MODELS.map((model) => (
            <option key={model} value={model}>
              {t(decisionsModelLabelKey(model))}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
