import type { Dispatch, SetStateAction, JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { sendExtensionRequest } from "../../shared/ext-api";
import { getExposedPublicKey, isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import type { SeedPathKind } from "../../shared/seed-derive";
import type { AccountMeta } from "../../shared/storage-keys";
import { IconCopy, IconLock } from "../components/StrokeIcon";
import { SensitiveTextArea, SensitiveTextInput, WalletPasswordInput } from "../components/WalletPasswordInput";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { detectSecret } from "./import-secret";
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
import { createGenerateSeedDraft } from "./generate-seed-flow";

export function AddAccountChooser(): JSX.Element {
  const { navigateTo } = usePopupContext();
  return (
    <>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-generate-seed")}>
        建立助記詞錢包<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-generate")}>
        建立 Burner 錢包<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-import")}>
        匯入錢包<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-watch")}>
        建立觀察帳戶<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-combined")}>
        建立 Combined<span className="kind-chev" aria-hidden="true">›</span>
      </button>
    </>
  );
}

export function AddImportChooser(): JSX.Element {
  const { navigateTo } = usePopupContext();
  return (
    <>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-import-seed")}>
        助記詞<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-import-secret")}>
        密鑰<span className="kind-chev" aria-hidden="true">›</span>
      </button>
    </>
  );
}

export function ImportSecretScreen(): JSX.Element {
  const { clearError, refresh, navigateTo } = usePopupContext();
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [err, setErr] = useState("");
  const d = detectSecret(secret);
  const fmtClass = d.kind === "empty" ? "fmt" : d.ok ? "fmt ok" : "fmt bad";
  const fmtText =
    d.kind === "empty" ? "base58 或 [bytes]" : d.ok ? (d.kind === "bytes" ? "位元組陣列" : "base58") : "無法辨識";

  const onPrimary = useCallback(async () => {
    clearError();
    const detected = detectSecret(secret);
    if (!detected.ok) {
      setErr("無法辨識");
      return;
    }
    const res = await sendExtensionRequest("wallet.importAccount", {
      secret: secret.trim(),
      label: label.trim() || undefined,
    });
    if (!res.ok) {
      setErr(res.error?.message ?? "匯入失敗");
      return;
    }
    await refresh();
    navigateTo("accounts");
  }, [clearError, secret, label, refresh, navigateTo]);

  useRegisterDock({ label: "匯入", disabled: !d.ok, onPrimary });

  return (
    <>
      <div className="field">
        <label htmlFor="import-label">名稱</label>
        <input
          id="import-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="import-secret">密鑰</label>
        <SensitiveTextArea
          id="import-secret"
          className="mono-input"
          rows={4}
          placeholder={"base58 或 [193, 240, …]"}
          value={secret}
          onChange={(v) => {
            setSecret(v);
            setErr("");
          }}
        />
        <div id="import-secret-fmt" className={fmtClass}>
          <span className="fmt-dot" aria-hidden="true" />
          <span id="import-secret-fmt-text">{fmtText}</span>
        </div>
      </div>
      <p id="import-secret-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </>
  );
}

export function ImportSeedScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, setBackOverride, setTitleOverride } = usePopupContext();
  const [draft, setDraft] = useState<ImportSeedDraft>(emptyImportSeedDraft);

  useEffect(() => {
    if (draft.step === "pick") setTitleOverride("選帳戶");
    else setTitleOverride(null);
  }, [draft.step, setTitleOverride]);

  useEffect(() => {
    const handler = () => {
      if (draft.step !== "pick") return false;
      setDraft((prev) => importSeedBackToWords(prev));
      return true;
    };
    setBackOverride(handler);
    return () => setBackOverride(null);
  }, [draft.step, setBackOverride]);

  const runPreview = useCallback(async (snapshot: ImportSeedDraft) => {
    const startedGen = snapshot.previewGen + 1;
    setDraft((prev) => ({ ...prev, previewGen: startedGen, busy: true, err: "" }));
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
      setDraft((prev) => ({ ...prev, busy: false, err: res.error?.message ?? "匯入失敗" }));
      return;
    }
    await refresh();
    navigateTo("accounts");
  }, [clearError, draft, runPreview, refresh, navigateTo]);

  const filled = importSeedFilledCount(draft.words);
  const dock =
    draft.step === "pick"
      ? { label: "匯入", disabled: draft.busy || draft.selected == null, onPrimary }
      : { label: "下一步", disabled: draft.busy || !(filled === 12 || filled === 24), onPrimary };
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
                placeholder="word"
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
          {draft.err}
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
  const schemes: { id: SeedPathKind; label: string }[] = [
    { id: "phantom", label: "標準" },
    { id: "cli", label: "CLI／Ledger" },
    { id: "custom", label: "自訂" },
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
              setDraft((prev) => {
                const next = { ...prev, kind: s.id, selected: null };
                void runPreview(next);
                return next;
              });
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {draft.kind === "custom" ? (
        <div className="field">
          <label>路徑</label>
          <input
            id="import-seed-custom"
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={draft.customPath}
            onChange={(e) => setDraft((prev) => ({ ...prev, customPath: e.target.value }))}
            onBlur={() => void runPreview(draft)}
          />
        </div>
      ) : null}
      <p className="path-line" title={draft.pathPreview}>
        {draft.pathPreview}
      </p>
      <div className="seed-acct-list">
        {draft.preview.length === 0 && draft.busy ? (
          <p className="muted small">讀取中</p>
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
        {draft.err}
      </p>
    </div>
  );
}

export function GenerateSeedScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, wallet } = usePopupContext();
  const [draft, setDraft] = useState(createGenerateSeedDraft);

  const onPrimary = useCallback(async () => {
    if (!draft.words) return;
    clearError();
    setDraft((prev) => ({ ...prev, busy: true }));
    const label = draft.label.trim();
    const fallbackLabel = wallet ? `Account ${wallet.accounts.length + 1}` : undefined;
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: draft.words.join(" "),
      pathKind: "phantom",
      index: 0,
      label: label || fallbackLabel,
    });
    if (!res.ok) {
      setDraft((prev) => ({ ...prev, busy: false, err: res.error?.message ?? "失敗" }));
      return;
    }
    await refresh();
    navigateTo("add-account");
  }, [draft.words, draft.label, clearError, wallet, refresh, navigateTo]);

  useRegisterDock({
    label: "建立",
    disabled: draft.busy || draft.words == null,
    onPrimary,
  });

  return (
    <>
      <div className="field">
        <label htmlFor="generate-seed-label">名稱</label>
        <input
          id="generate-seed-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={draft.label}
          onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
        />
      </div>
      <p className="seed-backup-warn">離開後無法再顯示助記詞</p>
      <div className="seed-backup-toolbar">
        <button
          type="button"
          className="icon-btn sm-inline"
          id="btn-copy-seed-words"
          title="複製"
          aria-label="複製"
          onClick={() => {
            if (draft.words) void navigator.clipboard.writeText(draft.words.join(" "));
          }}
        >
          <IconCopy />
        </button>
      </div>
      <div id="generate-seed-grid" className="word-grid word-grid-ro">
        {(draft.words ?? []).map((w, i) => (
          <div key={i} className="word-ro">
            <span className="word-ro-n">{i + 1}</span>
            <span className="word-ro-w">{w}</span>
          </div>
        ))}
      </div>
      <div className="addr-row">
        <span id="generate-seed-pk" className="addr-row-pk" title={draft.pk ?? ""}>
          {draft.pk ? shortAddr(draft.pk) : ""}
        </span>
        <button
          type="button"
          className="icon-btn sm-inline"
          id="btn-copy-seed-pk"
          title="複製"
          aria-label="複製"
          onClick={() => {
            if (draft.pk) void navigator.clipboard.writeText(draft.pk);
          }}
        >
          <IconCopy />
        </button>
      </div>
      <p id="generate-seed-err" className="inline-err" aria-live="polite">
        {draft.err}
      </p>
    </>
  );
}

export function GenerateBurnerScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, setBackOverride } = usePopupContext();
  const [label, setLabel] = useState("");
  const [err, setErr] = useState("");
  const [successPk, setSuccessPk] = useState<string | null>(null);
  const done = successPk != null;

  useEffect(() => {
    const handler = () => {
      if (!successPk) return false;
      setSuccessPk(null);
      return true;
    };
    setBackOverride(handler);
    return () => setBackOverride(null);
  }, [successPk, setBackOverride]);

  const onPrimary = useCallback(async () => {
    if (successPk) {
      setSuccessPk(null);
      navigateTo("add-account");
      return;
    }
    clearError();
    const res = await sendExtensionRequest("wallet.generateAccount", {
      label: label.trim() || undefined,
    });
    if (!res.ok) {
      setErr(res.error?.message ?? "失敗");
      return;
    }
    const { account } = res.result as { account: AccountMeta };
    const pk = isSigningOrWatch(account) ? account.publicKeyBase58 : getExposedPublicKey(account);
    setSuccessPk(pk);
    await refresh();
  }, [successPk, label, clearError, navigateTo, refresh]);

  useRegisterDock({
    label: done ? "完成" : "產生",
    disabled: false,
    onPrimary,
  });

  if (done) {
    return (
      <div id="generate-success" className="add-success">
        <div className="add-success-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 12.5 10 16.5 18 8" />
          </svg>
        </div>
        <p id="generate-success-pk" className="add-success-pk">
          {successPk ? shortAddr(successPk) : ""}
        </p>
      </div>
    );
  }

  return (
    <div id="generate-form">
      <div className="field">
        <label htmlFor="generate-label">名稱</label>
        <input
          id="generate-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <p id="generate-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </div>
  );
}

export function WatchAccountScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, showError } = usePopupContext();
  const [label, setLabel] = useState("");
  const [pk, setPk] = useState("");
  const [err, setErr] = useState("");
  const parseOk = parsePublicKeyBase58(pk) != null;

  const onPrimary = useCallback(async () => {
    clearError();
    const publicKeyBase58 = pk.trim();
    const name = label.trim();
    if (!parsePublicKeyBase58(publicKeyBase58)) {
      setErr("地址無效");
      return;
    }
    const res = await sendExtensionRequest("wallet.addReadOnlyAccount", {
      publicKeyBase58,
      label: name || undefined,
    });
    if (!res.ok) showError(res.error?.message ?? "新增失敗");
    else {
      await refresh();
      navigateTo("accounts");
    }
  }, [clearError, pk, label, showError, refresh, navigateTo]);

  useRegisterDock({ label: "建立", disabled: !parseOk, onPrimary });

  return (
    <>
      <div className="field">
        <label htmlFor="watch-label">名稱</label>
        <input
          id="watch-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="watch-pk">地址</label>
        <input
          id="watch-pk"
          type="text"
          spellCheck={false}
          placeholder="Solana 公鑰"
          autoComplete="off"
          value={pk}
          onChange={(e) => {
            setPk(e.target.value);
            setErr("");
          }}
        />
      </div>
      <p id="watch-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </>
  );
}

export function AboutHub(): JSX.Element {
  const { navigateTo } = usePopupContext();
  return (
    <>
      <div className="about-version">
        <span className="hub-label">版本</span>
        <span className="about-version-value" id="about-version">
          {chrome.runtime.getManifest().version}
        </span>
      </div>
      <ul className="settings-hub-list">
        <li>
          <button type="button" className="settings-hub-row" onClick={() => navigateTo("about-disclaimer")}>
            <span className="hub-label">免責聲明</span>
            <span className="kind-chev" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
        <li>
          <button type="button" className="settings-hub-row" onClick={() => navigateTo("about-terms")}>
            <span className="hub-label">使用條款</span>
            <span className="kind-chev" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
      </ul>
    </>
  );
}

export function SetupScreen(): JSX.Element {
  const { clearError, showError, refresh, navigateTo } = usePopupContext();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  return (
    <section id="setup" className="flow-screen">
      <h1>Airwave</h1>
      <WalletPasswordInput id="setup-password" placeholder="密碼" value={password} onChange={setPassword} />
      <WalletPasswordInput id="setup-password-2" placeholder="再次輸入" value={password2} onChange={setPassword2} />
      <button
        id="btn-create"
        type="button"
        onClick={async () => {
          clearError();
          if (!password || password.length < 8) {
            showError("密碼至少 8 字");
            return;
          }
          if (password !== password2) {
            showError("密碼不一致");
            return;
          }
          const res = await sendExtensionRequest("wallet.createVault", { password, empty: true });
          if (!res.ok) showError(res.error?.message ?? "建立失敗");
          else {
            await refresh();
            navigateTo("add-account");
          }
        }}
      >
        開始
      </button>
    </section>
  );
}

export function LockedScreen(): JSX.Element {
  const { clearError, showError, refresh } = usePopupContext();
  const [password, setPassword] = useState("");

  const submit = async () => {
    clearError();
    const res = await sendExtensionRequest("wallet.unlock", { password });
    if (!res.ok) showError(res.error?.message ?? "解鎖失敗");
    else {
      await refresh();
    }
  };

  return (
    <section id="locked" className="unlock-screen">
      <div className="unlock-mark" aria-hidden="true">
        <IconLock size={22} />
      </div>
      <h1>Airwave</h1>
      <p className="unlock-lead">錢包已鎖定</p>
      <div className="unlock-form">
        <WalletPasswordInput
          id="unlock-password"
          placeholder="密碼"
          value={password}
          onChange={setPassword}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              void submit();
            }
          }}
        />
        <button id="btn-unlock" className="primary-btn" type="button" onClick={() => void submit()}>
          解鎖
        </button>
      </div>
    </section>
  );
}
