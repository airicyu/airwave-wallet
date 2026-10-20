/**
 * Popup seed-phrase import: word grid entry and account index pick after preview.
 * Does not persist the vault or handle secret-key import.
 */
import type { Dispatch, SetStateAction, JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendExtensionRequest } from "../../shared/protocol";
import type { SeedPathKind } from "../../shared/vault";
import { apiErrorMessage, displayStoredError } from "../../shared/i18n";
import { SensitiveTextInput } from "../components/WalletPasswordInput";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { viewAfterAccountCreated } from "../lib/rpc-guide";
import {
  emptyImportSeedDraft,
  importSeedBackToWords,
  importSeedFilledCount,
  importSeedTargetLength,
  mnemonicFromSlots,
  requestSeedPreview,
  withImportSeedCapacity,
  type ImportSeedDraft,
} from "./import-seed-flow";

export function ImportSeedScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, setBackOverride, setTitleOverride, wallet } = usePopupContext();
  const { t, locale } = useT();
  const [draft, setDraft] = useState<ImportSeedDraft>(emptyImportSeedDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    if (draft.step === "pick") setTitleOverride(t("nav.pickAccounts"));
    else setTitleOverride(null);
  }, [draft.step, setTitleOverride, t]);

  useEffect(() => {
    const handler = () => {
      if (draft.step !== "pick") return false;
      setDraft((prev) => importSeedBackToWords(prev));
      return true;
    };
    setBackOverride(handler);
    return () => setBackOverride(null);
  }, [draft.step, setBackOverride]);

  const runPreview = useCallback(async (partial: ImportSeedDraft) => {
    const snapshot = { ...draftRef.current, ...partial, previewGen: draftRef.current.previewGen };
    const startedGen = snapshot.previewGen + 1;
    const busyDraft: ImportSeedDraft = {
      ...snapshot,
      previewGen: startedGen,
      busy: true,
      err: "",
    };
    draftRef.current = busyDraft;
    setDraft(busyDraft);
    const { gen, next, outcome } = await requestSeedPreview({ ...snapshot, previewGen: snapshot.previewGen });
    setDraft((prev) => {
      if (prev.previewGen !== gen) return prev;
      return { ...prev, ...next };
    });
    return outcome;
  }, []);

  const onPrimary = useCallback(async () => {
    clearError();
    if (draft.step === "words") {
      const outcome = await runPreview(draft);
      if (outcome !== "ok") return;
      setDraft((prev) => ({ ...prev, selected: null, step: "pick", busy: false }));
      return;
    }
    if (draft.selected == null) return;
    setDraft((prev) => ({ ...prev, busy: true }));
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: mnemonicFromSlots(draft.words),
      pathKind: draft.kind,
      customPath: draft.kind === "custom" ? draft.customPath : undefined,
      index: draft.selected,
    });
    if (!res.ok) {
      setDraft((prev) => ({
        ...prev,
        busy: false,
        err: apiErrorMessage(locale, res.error, "error.importFailed"),
      }));
      return;
    }
    const prevCount = wallet?.accounts.length ?? 0;
    const state = await refresh();
    navigateTo(viewAfterAccountCreated(prevCount, state, "accounts"));
  }, [clearError, draft, runPreview, refresh, navigateTo, locale, wallet]);

  const filled = importSeedFilledCount(draft.words);
  const dock =
    draft.step === "pick"
      ? { label: t("common.import"), disabled: draft.busy || draft.selected == null, onPrimary }
      : { label: t("common.next"), disabled: draft.busy || !(filled === 12 || filled === 24), onPrimary };
  useRegisterDock(dock);

  if (draft.step === "pick") {
    return <ImportSeedPick draft={draft} setDraft={setDraft} runPreview={runPreview} />;
  }
  return <ImportSeedWords draft={draft} setDraft={setDraft} />;
}

function ImportSeedWords({
  draft,
  setDraft,
}: {
  draft: ImportSeedDraft;
  setDraft: Dispatch<SetStateAction<ImportSeedDraft>>;
}): JSX.Element {
  const { t, locale } = useT();
  const words = withImportSeedCapacity(draft.words);
  const n = importSeedFilledCount(words);
  const target = importSeedTargetLength(words);
  const complete = n === 12 || n === 24;
  const pillClass = `count-pill${complete ? " ok" : n === 0 ? "" : " bad"}`;
  return (
    <div id="import-seed-root">
      <form className="seed-entry-form" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="word-toolbar">
          <span className={pillClass}>{`${n}／${target === 24 || n > 12 ? 24 : 12}`}</span>
        </div>
        <div className="word-grid">
          {words.map((w, i) => (
            <label key={i} className="word-slot">
              <span className="word-n">{i + 1}</span>
              <SensitiveTextInput
                value={w}
                placeholder={t("onboarding.seedWordPlaceholder")}
                onChange={(v) => {
                  setDraft((prev) => {
                    const nextWords = withImportSeedCapacity(
                      prev.words.map((word, idx) => (idx === i ? v.replace(/\s+/g, "") : word)),
                    );
                    return { ...prev, words: nextWords, err: "" };
                  });
                }}
              />
            </label>
          ))}
        </div>
        <p className="inline-err" id="import-seed-err">
          {draft.err ? displayStoredError(locale, draft.err) : ""}
        </p>
      </form>
    </div>
  );
}

function ImportSeedPick({
  draft,
  setDraft,
  runPreview,
}: {
  draft: ImportSeedDraft;
  setDraft: Dispatch<SetStateAction<ImportSeedDraft>>;
  runPreview: (snapshot: ImportSeedDraft) => Promise<"ok" | "fail">;
}): JSX.Element {
  const { t, locale } = useT();
  const schemes: { id: SeedPathKind; label: string }[] = [
    { id: "phantom", label: t("onboarding.standardPath") },
    { id: "cli", label: t("onboarding.cliLedger") },
    { id: "custom", label: t("onboarding.customPath") },
  ];
  return (
    <div id="import-seed-root">
      <div className="scheme-grid">
        {schemes.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`scheme-btn${draft.kind === s.id ? " on" : ""}`}
            onClick={() => {
              void runPreview({ ...draft, kind: s.id, selected: null });
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {draft.kind === "custom" ? (
        <div className="field">
          <label>{t("common.path")}</label>
          <input
            id="import-seed-custom"
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={draft.customPath}
            onChange={(e) => setDraft((prev) => ({ ...prev, customPath: e.target.value }))}
            onBlur={(e) => void runPreview({ ...draft, customPath: e.currentTarget.value })}
          />
        </div>
      ) : null}
      <p className="path-line" title={draft.pathPreview}>
        {draft.pathPreview}
      </p>
      <div className="seed-acct-list">
        {draft.preview.length === 0 && draft.busy ? (
          <p className="muted small">{t("common.loading")}</p>
        ) : (
          draft.preview.map((a) => (
            <button
              key={a.index}
              type="button"
              className={`seed-acct${draft.selected === a.index ? " on" : ""}`}
              onClick={() => setDraft((prev) => ({ ...prev, selected: a.index }))}
            >
              <span className="seed-acct-idx">#{a.index}</span>
              <span className="seed-acct-pk">{shortAddr(a.publicKeyBase58)}</span>
            </button>
          ))
        )}
      </div>
      <p className="inline-err" id="import-seed-err">
        {draft.err ? displayStoredError(locale, draft.err) : ""}
      </p>
    </div>
  );
}
