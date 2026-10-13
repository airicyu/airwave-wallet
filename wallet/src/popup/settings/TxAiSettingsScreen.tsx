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
  DECISIONS_PRESETS,
  REPORT_PRESETS,
  decisionsModelLabelKey,
  isLegalOpenRouterModelId,
} from "../../shared/tx-ai";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import {
  MASKED_SECRET_DISPLAY,
  patchSettingsPartial,
  persistOpenRouterField,
  type SettingsIo,
} from "./settings-logic";

const MODEL_OTHER = "__other__";

function useSettingsIo(): SettingsIo {
  const { refresh, showError, wallet } = usePopupContext();
  const locale = wallet?.settings.locale ?? "zh-Hant";
  return { refresh, showError, locale };
}

function ModelPickerField({
  id,
  label,
  presets,
  storedModel,
  otherLabel,
  presetLabel,
  onPatch,
}: {
  id: string;
  label: string;
  presets: readonly string[];
  storedModel: string;
  otherLabel: string;
  presetLabel: (model: string) => string;
  onPatch: (model: string) => void;
}): JSX.Element {
  const { t } = useT();
  const presetSet = presets as readonly string[];
  const storedIsPreset = presetSet.includes(storedModel);
  const [selectOverride, setSelectOverride] = useState<string | null>(null);
  const selectValue = selectOverride ?? (storedIsPreset ? storedModel : MODEL_OTHER);
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const draftValue = customDraft ?? (storedIsPreset ? "" : storedModel);
  const showCustom = selectValue === MODEL_OTHER;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="tx-ai-model-select"
        value={selectValue}
        onChange={(event) => {
          const value = event.target.value;
          if (value === MODEL_OTHER) {
            setSelectOverride(MODEL_OTHER);
            setCustomDraft(storedIsPreset ? "" : storedModel);
            return;
          }
          setSelectOverride(null);
          setCustomDraft(null);
          onPatch(value);
        }}
      >
        {presets.map((model) => (
          <option key={model} value={model}>
            {presetLabel(model)}
          </option>
        ))}
        <option value={MODEL_OTHER}>{otherLabel}</option>
      </select>
      {showCustom ? (
        <div className="rpc-edit tx-ai-model-custom">
          <input
            type="text"
            value={draftValue}
            autoComplete="off"
            onChange={(event) => setCustomDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const trimmed = draftValue.trim();
              if (!isLegalOpenRouterModelId(trimmed)) return;
              setSelectOverride(null);
              setCustomDraft(null);
              onPatch(trimmed);
            }}
          />
          <button
            type="button"
            className="icon-btn ghost-inline rpc-icon-btn"
            title={t("common.confirm")}
            aria-label={t("common.confirm")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const trimmed = draftValue.trim();
              if (!isLegalOpenRouterModelId(trimmed)) return;
              setSelectOverride(null);
              setCustomDraft(null);
              onPatch(trimmed);
            }}
          >
            <IconCheck />
          </button>
        </div>
      ) : null}
    </div>
  );
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
      <ModelPickerField
        id="openrouter-report-model"
        label={t("settings.openRouter.model")}
        presets={REPORT_PRESETS}
        storedModel={settings.openRouterModel}
        otherLabel={t("settings.openRouter.model.other")}
        presetLabel={(model) => model}
        onPatch={(model) => {
          void patchSettingsPartial({ openRouterModel: model }, io, locale);
        }}
      />
      <ModelPickerField
        id="openrouter-decisions-model"
        label={t("settings.openRouter.decisionsModel")}
        presets={DECISIONS_PRESETS}
        storedModel={settings.openRouterDecisionsModel}
        otherLabel={t("settings.openRouter.decisionsModel.other")}
        presetLabel={(model) => t(decisionsModelLabelKey(model))}
        onPatch={(model) => {
          void patchSettingsPartial({ openRouterDecisionsModel: model }, io, locale);
        }}
      />
    </>
  );
}
