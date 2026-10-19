/**
 * Popup screen to generate a new seed phrase draft, show backup UI, and import index 0.
 * Does not handle burner key generation or post-create RPC guide routing beyond navigation.
 */
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { ACCOUNT_LABEL_MAX } from "../../shared/account-label";
import { sendExtensionRequest } from "../../shared/ext-api";
import { displayStoredError, apiErrorMessage } from "../../shared/ui-i18n";
import { CopyIconButton } from "../components/CopyPkButton";
import { DiceRerollButton } from "../components/DiceRerollButton";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { viewAfterAccountCreated } from "../lib/rpc-guide";
import { createGenerateSeedDraft, rollGenerateSeedDraft, type GenerateSeedDraft } from "./generate-seed-flow";

export function GenerateSeedScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, wallet } = usePopupContext();
  const { t, locale } = useT();
  const [draft, setDraft] = useState<GenerateSeedDraft>(() => ({
    words: null,
    pk: null,
    busy: false,
    label: "",
    err: "",
  }));
  const [rolling, setRolling] = useState(true);
  useEffect(() => {
    let cancel = false;
    void createGenerateSeedDraft().then((next) => {
      if (cancel) return;
      setDraft(next);
      setRolling(false);
    });
    return () => {
      cancel = true;
    };
  }, []);

  const onReroll = useCallback(() => {
    if (draft.busy || rolling) return;
    setRolling(true);
    void rollGenerateSeedDraft(draft).then((next) => {
      setDraft((prev) => ({ ...next, label: prev.label }));
      setRolling(false);
    });
  }, [draft, rolling]);

  const onPrimary = useCallback(async () => {
    if (!draft.words || !draft.pk || rolling) return;
    const mnemonic = draft.words.join(" ");
    clearError();
    setDraft((prev) => ({ ...prev, busy: true }));
    const label = draft.label.trim();
    const fallbackLabel = wallet ? `Account ${wallet.accounts.length + 1}` : undefined;
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic,
      pathKind: "phantom",
      index: 0,
      label: label || fallbackLabel,
    });
    if (!res.ok) {
      setDraft((prev) => ({
        ...prev,
        busy: false,
        err: apiErrorMessage(locale, res.error, "error.genericFailed"),
      }));
      return;
    }
    const prevCount = wallet?.accounts.length ?? 0;
    const state = await refresh();
    navigateTo(viewAfterAccountCreated(prevCount, state, "add-account"));
  }, [draft.words, draft.pk, draft.label, rolling, clearError, wallet, refresh, navigateTo, locale]);

  useRegisterDock({
    label: t("common.create"),
    disabled: draft.busy || rolling || draft.words == null || draft.pk == null,
    onPrimary,
  });

  return (
    <div className="generate-seed-screen">
      <div className="field">
        <label htmlFor="generate-seed-label">{t("common.name")}</label>
        <input
          id="generate-seed-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("common.optional")}
          autoComplete="off"
          value={draft.label}
          onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
        />
      </div>
      <p className="seed-backup-warn">{t("onboarding.seedBackupWarn")}</p>
      <div className="draft-toolbar">
        <DiceRerollButton label={t("onboarding.regenerateDraft")} disabled={draft.busy || rolling} onClick={onReroll} />
      </div>
      <div id="generate-seed-grid" className="word-grid word-grid-ro">
        {(draft.words ?? []).map((w, i) => (
          <div key={i} className="word-ro">
            <span className="word-ro-n">{i + 1}</span>
            <span className="word-ro-w">{w}</span>
          </div>
        ))}
      </div>
      <p className="pk-label">{t("onboarding.solanaPubkey")}</p>
      <div className="addr-row">
        <span id="generate-seed-pk" className="addr-row-pk" title={draft.pk ?? ""}>
          {draft.pk ? shortAddr(draft.pk) : ""}
        </span>
        <CopyIconButton
          id="btn-copy-seed-pk"
          className="icon-btn sm-inline"
          text={draft.pk ?? ""}
        />
      </div>
      <p id="generate-seed-err" className="inline-err" aria-live="polite">
        {draft.err ? displayStoredError(locale, draft.err) : ""}
      </p>
    </div>
  );
}
