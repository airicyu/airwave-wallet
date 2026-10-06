import type { JSX } from "react";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { SeedPathKind } from "../../shared/seed-derive";
import { IconCopy } from "../components/StrokeIcon";
import { SensitiveTextArea, SensitiveTextInput, WalletPasswordInput } from "../components/WalletPasswordInput";
import { shortAddr } from "../lib/format";
import { bumpUi, clearError, navigateTo, refresh, session, showError } from "../lib/session";
import { detectSecret } from "./import-secret";
import {
  ensureImportSeedWordCapacity,
  importSeedTargetLength,
  requestSeedPreview,
} from "./import-seed-flow";

export function AddAccountChooser(): JSX.Element {
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
  const d = detectSecret(session.importSecret);
  const fmtClass = d.kind === "empty" ? "fmt" : d.ok ? "fmt ok" : "fmt bad";
  const fmtText =
    d.kind === "empty" ? "base58 或 [bytes]" : d.ok ? (d.kind === "bytes" ? "位元組陣列" : "base58") : "無法辨識";
  return (
    <>
      <div className="field">
        <label htmlFor="import-label">名稱</label>
        <input
          id="import-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={session.importLabel}
          onChange={(e) => {
            session.importLabel = e.target.value;
            bumpUi();
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="import-secret">密鑰</label>
        <SensitiveTextArea
          id="import-secret"
          className="mono-input"
          rows={4}
          placeholder={"base58 或 [193, 240, …]"}
          value={session.importSecret}
          onChange={(v) => {
            session.importSecret = v;
            session.importSecretErr = "";
            bumpUi();
          }}
        />
        <div id="import-secret-fmt" className={fmtClass}>
          <span className="fmt-dot" aria-hidden="true" />
          <span id="import-secret-fmt-text">{fmtText}</span>
        </div>
      </div>
      <p id="import-secret-err" className="inline-err" aria-live="polite">
        {session.importSecretErr}
      </p>
    </>
  );
}

export function ImportSeedScreen(): JSX.Element {
  if (session.importSeedStep === "pick") return <ImportSeedPick />;
  return <ImportSeedWords />;
}

function ImportSeedWords(): JSX.Element {
  ensureImportSeedWordCapacity();
  const n = session.importSeedWords.filter((w) => w.trim()).length;
  const target = importSeedTargetLength();
  const complete = n === 12 || n === 24;
  const pillClass = `count-pill${complete ? " ok" : n === 0 ? "" : " bad"}`;
  return (
    <div id="import-seed-root">
      <form className="seed-entry-form" autoComplete="off" noValidate onSubmit={(e) => e.preventDefault()}>
        <div className="word-toolbar">
          <span className={pillClass}>{`${n}／${target === 24 || n > 12 ? 24 : 12}`}</span>
        </div>
        <div className="word-grid">
          {session.importSeedWords.map((w, i) => (
            <label key={i} className="word-slot">
              <span className="word-n">{i + 1}</span>
              <SensitiveTextInput
                value={w}
                placeholder="word"
                onChange={(v) => {
                  session.importSeedWords[i] = v.replace(/\s+/g, "");
                  session.importSeedErr = "";
                  bumpUi();
                }}
              />
            </label>
          ))}
        </div>
        <p className="inline-err" id="import-seed-err">
          {session.importSeedErr}
        </p>
      </form>
    </div>
  );
}

function ImportSeedPick(): JSX.Element {
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
            className={`scheme-btn${session.importSeedKind === s.id ? " on" : ""}`}
            onClick={() => {
              session.importSeedKind = s.id;
              session.importSeedSelected = null;
              void requestSeedPreview();
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {session.importSeedKind === "custom" ? (
        <div className="field">
          <label>路徑</label>
          <input
            id="import-seed-custom"
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={session.importSeedCustomPath}
            onChange={(e) => {
              session.importSeedCustomPath = e.target.value;
              bumpUi();
            }}
            onBlur={() => void requestSeedPreview()}
          />
        </div>
      ) : null}
      <p className="path-line" title={session.importSeedPathPreview}>
        {session.importSeedPathPreview}
      </p>
      <div className="seed-acct-list">
        {session.importSeedPreview.length === 0 && session.importSeedBusy ? (
          <p className="muted small">讀取中</p>
        ) : (
          session.importSeedPreview.map((a) => (
            <button
              key={a.index}
              type="button"
              className={`seed-acct${session.importSeedSelected === a.index ? " on" : ""}`}
              onClick={() => {
                session.importSeedSelected = a.index;
                bumpUi();
              }}
            >
              <span className="seed-acct-idx">#{a.index}</span>
              <span className="seed-acct-pk">{shortAddr(a.publicKeyBase58)}</span>
            </button>
          ))
        )}
      </div>
      <p className="inline-err" id="import-seed-err">
        {session.importSeedErr}
      </p>
    </div>
  );
}

export function GenerateSeedScreen(): JSX.Element {
  return (
    <>
      <div className="field">
        <label htmlFor="generate-seed-label">名稱</label>
        <input
          id="generate-seed-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={session.generateSeedLabel}
          onChange={(e) => {
            session.generateSeedLabel = e.target.value;
            bumpUi();
          }}
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
            if (session.generateSeedWords) void navigator.clipboard.writeText(session.generateSeedWords.join(" "));
          }}
        >
          <IconCopy />
        </button>
      </div>
      <div id="generate-seed-grid" className="word-grid word-grid-ro">
        {(session.generateSeedWords ?? []).map((w, i) => (
          <div key={i} className="word-ro">
            <span className="word-ro-n">{i + 1}</span>
            <span className="word-ro-w">{w}</span>
          </div>
        ))}
      </div>
      <div className="addr-row">
        <span id="generate-seed-pk" className="addr-row-pk" title={session.generateSeedPk ?? ""}>
          {session.generateSeedPk ? shortAddr(session.generateSeedPk) : ""}
        </span>
        <button
          type="button"
          className="icon-btn sm-inline"
          id="btn-copy-seed-pk"
          title="複製"
          aria-label="複製"
          onClick={() => {
            if (session.generateSeedPk) void navigator.clipboard.writeText(session.generateSeedPk);
          }}
        >
          <IconCopy />
        </button>
      </div>
      <p id="generate-seed-err" className="inline-err" aria-live="polite">
        {session.generateSeedErr}
      </p>
    </>
  );
}

export function GenerateBurnerScreen(): JSX.Element {
  const done = session.generateSuccessPk != null;
  return (
    <>
      <div id="generate-form" hidden={done}>
        <div className="field">
          <label htmlFor="generate-label">名稱</label>
          <input
            id="generate-label"
            type="text"
            placeholder="選填"
            autoComplete="off"
            value={session.generateLabel}
            onChange={(e) => {
              session.generateLabel = e.target.value;
              bumpUi();
            }}
          />
        </div>
        <p id="generate-err" className="inline-err" aria-live="polite">
          {session.generateErr}
        </p>
      </div>
      <div id="generate-success" className="add-success" hidden={!done}>
        <div className="add-success-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 12.5 10 16.5 18 8" />
          </svg>
        </div>
        <p id="generate-success-pk" className="add-success-pk">
          {session.generateSuccessPk ? shortAddr(session.generateSuccessPk) : ""}
        </p>
      </div>
    </>
  );
}

export function WatchAccountScreen(): JSX.Element {
  return (
    <>
      <div className="field">
        <label htmlFor="watch-label">名稱</label>
        <input
          id="watch-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={session.watchLabel}
          onChange={(e) => {
            session.watchLabel = e.target.value;
            bumpUi();
          }}
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
          value={session.watchPk}
          onChange={(e) => {
            session.watchPk = e.target.value;
            session.watchErr = "";
            bumpUi();
          }}
        />
      </div>
      <p id="watch-err" className="inline-err" aria-live="polite">
        {session.watchErr}
      </p>
    </>
  );
}

export function AboutHub(): JSX.Element {
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

export async function submitSetup(): Promise<void> {
  clearError();
  const password = session.setupPassword;
  const password2 = session.setupPassword2;
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
    session.setupPassword = "";
    session.setupPassword2 = "";
    await refresh();
    navigateTo("add-account");
  }
}

export async function submitUnlock(): Promise<void> {
  clearError();
  const res = await sendExtensionRequest("wallet.unlock", { password: session.unlockPassword });
  if (!res.ok) showError(res.error?.message ?? "解鎖失敗");
  else {
    session.unlockPassword = "";
    await refresh();
  }
}

export function SetupScreen(): JSX.Element {
  return (
    <section id="setup" className="flow-screen">
      <h1>Airwave</h1>
      <WalletPasswordInput
        id="setup-password"
        placeholder="密碼"
        value={session.setupPassword}
        onChange={(v) => {
          session.setupPassword = v;
          bumpUi();
        }}
      />
      <WalletPasswordInput
        id="setup-password-2"
        placeholder="再次輸入"
        value={session.setupPassword2}
        onChange={(v) => {
          session.setupPassword2 = v;
          bumpUi();
        }}
      />
      <button id="btn-create" type="button" onClick={() => void submitSetup()}>
        開始
      </button>
    </section>
  );
}

export function LockedScreen(): JSX.Element {
  return (
    <section id="locked" className="unlock-screen">
      <h1>Airwave</h1>
      <p>錢包已鎖定</p>
      <WalletPasswordInput
        id="unlock-password"
        placeholder="密碼"
        value={session.unlockPassword}
        onChange={(v) => {
          session.unlockPassword = v;
          bumpUi();
        }}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            void submitUnlock();
          }
        }}
      />
      <button id="btn-unlock" className="primary-btn" type="button" onClick={() => void submitUnlock()}>
        解鎖
      </button>
    </section>
  );
}
