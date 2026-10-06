import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { hardenApiKeyInput } from "../lib/password-input";
import { IconCheck, IconEye, IconPlus, IconTrash } from "../components/StrokeIcon";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import type { Settings } from "../../shared/storage-keys";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import {
  apiKeysHubSummary,
  changePasswordCanSubmit,
  cloneRpcByCluster,
  confirmRpcUrl,
  MASKED_SECRET_DISPLAY,
  parseDefaultCuPriceInput,
  patchRpcByCluster,
  patchSettingsPartial,
  persistHeliusField,
  persistJupiterField,
  PUBLIC_RPC_BY_CLUSTER,
  rpcOptionKey,
  submitChangePassword,
  type Cluster,
  type SettingsIo,
} from "./settings-logic";

function useSettingsIo(): SettingsIo {
  const { refresh, showError } = usePopupContext();
  return { refresh, showError };
}

export function SettingsHub({ settings }: { settings: Settings }): JSX.Element {
  const { navigateTo } = usePopupContext();
  return (
    <ul className="settings-hub-list" id="settings-hub-list">
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-network")}>
          <span className="hub-label">網路</span>
          <span className="hub-summary" id="hub-summary-network">
            {settings.cluster === "mainnet" ? "Mainnet" : "Devnet"}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-rpc")}>
          <span className="hub-label">RPC</span>
          <span className="hub-summary hub-summary-ellipsis" id="hub-summary-rpc">
            {settings.rpcUrl}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-keys")}>
          <span className="hub-label">API keys</span>
          <span className="hub-summary" id="hub-summary-keys">
            {apiKeysHubSummary(settings)}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-cu-price")}>
          <span className="hub-label">Default CU price</span>
          <span className="hub-summary" id="hub-summary-cu-price">
            {String(settings.defaultCuPrice)}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-password")}>
          <span className="hub-label">錢包密碼</span>
          <span className="hub-summary">變更</span>
        </button>
      </li>
    </ul>
  );
}

export function NetworkScreen({ settings }: { settings: Settings }): JSX.Element {
  const io = useSettingsIo();
  return (
    <div className="network-pick-list" role="radiogroup" aria-label="目前網路">
      {(["devnet", "mainnet"] as const).map((cluster) => (
        <label key={cluster} className="network-pick-row">
          <input
            type="radio"
            name="settings-cluster"
            value={cluster}
            checked={settings.cluster === cluster}
            onChange={() => {
              if (cluster === settings.cluster) return;
              void patchSettingsPartial({ cluster }, io);
            }}
          />
          <span className="network-pick-meta">
            <span className="network-pick-title">{cluster === "mainnet" ? "Mainnet" : "Devnet"}</span>
            <span className="network-pick-sum">
              {cluster === "mainnet" ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com"}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function RpcScreen({ settings }: { settings: Settings }): JSX.Element {
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  return (
    <>
      <RpcClusterCard
        cluster="devnet"
        settings={settings}
        editKey={editKey}
        editDraft={editDraft}
        setEditKey={setEditKey}
        setEditDraft={setEditDraft}
      />
      <RpcClusterCard
        cluster="mainnet"
        settings={settings}
        editKey={editKey}
        editDraft={editDraft}
        setEditKey={setEditKey}
        setEditDraft={setEditDraft}
      />
    </>
  );
}

function RpcClusterCard({
  cluster,
  settings,
  editKey,
  editDraft,
  setEditKey,
  setEditDraft,
}: {
  cluster: Cluster;
  settings: Settings;
  editKey: string | null;
  editDraft: string;
  setEditKey: (k: string | null) => void;
  setEditDraft: (d: string) => void;
}): JSX.Element {
  const io = useSettingsIo();
  const { wallet, showError } = usePopupContext();
  const cfg = settings.rpcByCluster[cluster];
  const rows: { url: string; isPublic: boolean }[] = [
    { url: PUBLIC_RPC_BY_CLUSTER[cluster], isPublic: true },
    ...cfg.urls.map((url) => ({ url, isPublic: false })),
  ];
  return (
    <div className="rpc-cluster-card" data-rpc-cluster-card={cluster}>
      <div className="rpc-cluster-head">
        <h3>{cluster === "mainnet" ? "Mainnet" : "Devnet"}</h3>
        <span className="rpc-cluster-badge" id={`rpc-badge-${cluster}`} hidden={settings.cluster !== cluster}>
          目前
        </span>
      </div>
      <div className="settings-card">
        <div className="rpc-list" data-rpc-list={cluster}>
          {rows.map(({ url, isPublic }) => {
            const key = rpcOptionKey(cluster, isPublic, url);
            const selected = isPublic ? cfg.active === "" : cfg.active === url;
            const editing = editKey === key;
            return (
              <div key={key}>
                <div className={selected ? "rpc-row selected" : "rpc-row"}>
                  <input
                    type="radio"
                    name={`rpc-active-${cluster}`}
                    checked={selected}
                    onChange={() => {
                      const next = cloneRpcByCluster(settings.rpcByCluster);
                      next[cluster] = { ...next[cluster], active: isPublic ? "" : url };
                      void patchRpcByCluster(next, io);
                    }}
                  />
                  <button
                    type="button"
                    className="rpc-url-text"
                    onClick={() => {
                      setEditKey(editKey === key ? null : key);
                      setEditDraft(url);
                    }}
                  >
                    {url}
                  </button>
                  {isPublic ? (
                    <span className="rpc-badge">內建</span>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn ghost-inline rpc-icon-btn danger"
                      title="刪除"
                      aria-label="刪除"
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        const next = cloneRpcByCluster(settings.rpcByCluster);
                        const urls = next[cluster].urls.filter((u) => u !== url);
                        const active = next[cluster].active === url ? "" : next[cluster].active;
                        next[cluster] = { urls, active };
                        if (editKey === key) setEditKey(null);
                        void patchRpcByCluster(next, io);
                      }}
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
                {editing ? (
                  <RpcEditor
                    cluster={cluster}
                    url={url}
                    isPublic={isPublic}
                    isNew={false}
                    draft={editDraft}
                    setDraft={setEditDraft}
                    onClose={() => setEditKey(null)}
                    onSaved={(nextUrl) => setEditKey(rpcOptionKey(cluster, false, nextUrl))}
                    walletNeeded={wallet}
                    showError={showError}
                    io={io}
                  />
                ) : null}
              </div>
            );
          })}
          {editKey === `${cluster}:new` ? (
            <RpcEditor
              cluster={cluster}
              url=""
              isPublic={false}
              isNew
              draft={editDraft}
              setDraft={setEditDraft}
              onClose={() => setEditKey(null)}
              onSaved={(nextUrl) => setEditKey(rpcOptionKey(cluster, false, nextUrl))}
              walletNeeded={wallet}
              showError={showError}
              io={io}
            />
          ) : null}
        </div>
        <div className="rpc-add-bar">
          <button
            type="button"
            className="icon-btn ghost-inline rpc-icon-btn btn-rpc-add"
            title="加入"
            aria-label="加入"
            onClick={() => {
              setEditKey(`${cluster}:new`);
              setEditDraft("");
            }}
          >
            <IconPlus />
          </button>
        </div>
      </div>
    </div>
  );
}

function RpcEditor({
  cluster,
  url,
  isPublic,
  isNew,
  draft,
  setDraft,
  onClose,
  onSaved,
  walletNeeded,
  showError,
  io,
}: {
  cluster: Cluster;
  url: string;
  isPublic: boolean;
  isNew: boolean;
  draft: string;
  setDraft: (d: string) => void;
  onClose: () => void;
  onSaved: (nextUrl: string) => void;
  walletNeeded: ReturnType<typeof usePopupContext>["wallet"];
  showError: (msg: string) => void;
  io: SettingsIo;
}): JSX.Element {
  const confirm = () => {
    if (!walletNeeded) return;
    const result = confirmRpcUrl({
      cluster,
      url,
      isNew,
      draft,
      wallet: walletNeeded,
    });
    if (!result.ok) {
      showError(result.error);
      return;
    }
    void patchRpcByCluster(result.next, io).then(() => onSaved(result.nextUrl));
  };
  return (
    <div className="rpc-edit">
      <input
        type="text"
        value={draft}
        readOnly={isPublic}
        autoComplete="off"
        placeholder="https://"
        autoFocus={!isPublic}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            if (!isPublic) confirm();
          }
          if (ev.key === "Escape") onClose();
        }}
      />
      {!isPublic ? (
        <button
          type="button"
          className="icon-btn ghost-inline rpc-icon-btn"
          title="確認"
          aria-label="確認"
          onClick={() => confirm()}
        >
          <IconCheck />
        </button>
      ) : null}
    </div>
  );
}

function KeysField({
  id,
  label,
  revealed,
  stored,
  draft,
  onReveal,
  onDraft,
  onPersist,
}: {
  id: string;
  label: string;
  revealed: boolean;
  stored: string;
  draft: string;
  onReveal: () => void;
  onDraft: (v: string) => void;
  onPersist: () => void;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) hardenApiKeyInput(inputRef.current);
  }, []);
  const display = !revealed && stored ? MASKED_SECRET_DISPLAY : draft;
  return (
    <div className="field keys-field">
      <label htmlFor={id}>{label}</label>
      <div className="keys-input-row">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          placeholder="選填"
          readOnly={!revealed && !!stored}
          value={display}
          onChange={(e) => {
            onDraft(e.target.value);
            if (e.target.value === "") void onPersist();
          }}
          onBlur={() => void onPersist()}
        />
        <button
          type="button"
          className="icon-btn ghost-inline keys-reveal-btn"
          title="顯示"
          aria-label="顯示"
          onClick={onReveal}
        >
          <IconEye />
        </button>
        <button
          type="button"
          className="icon-btn ghost-inline keys-confirm-btn"
          title="確認"
          aria-label="確認"
          onClick={() => void onPersist()}
        >
          <IconCheck />
        </button>
      </div>
    </div>
  );
}

export function KeysScreen({ settings }: { settings: Settings }): JSX.Element {
  const { wallet } = usePopupContext();
  const io = useSettingsIo();
  const [heliusRevealed, setHeliusRevealed] = useState(false);
  const [jupiterRevealed, setJupiterRevealed] = useState(false);
  const [heliusDraft, setHeliusDraft] = useState("");
  const [jupiterDraft, setJupiterDraft] = useState("");
  const heliusShown = heliusRevealed ? heliusDraft || settings.heliusApiUrl : heliusDraft;
  const jupiterShown = jupiterRevealed ? jupiterDraft || settings.jupiterApiKey : jupiterDraft;

  return (
    <>
      <KeysField
        id="helius-api-url"
        label="Helius API URL"
        revealed={heliusRevealed}
        stored={settings.heliusApiUrl}
        draft={heliusShown}
        onReveal={() => {
          setHeliusRevealed((v) => {
            const next = !v;
            if (next) setHeliusDraft(settings.heliusApiUrl);
            return next;
          });
        }}
        onDraft={setHeliusDraft}
        onPersist={() => {
          if (!wallet) return;
          void persistHeliusField({ wallet, revealed: heliusRevealed, draft: heliusDraft, io });
        }}
      />
      <KeysField
        id="jupiter-api-key"
        label="Jupiter API key"
        revealed={jupiterRevealed}
        stored={settings.jupiterApiKey}
        draft={jupiterShown}
        onReveal={() => {
          setJupiterRevealed((v) => {
            const next = !v;
            if (next) setJupiterDraft(settings.jupiterApiKey);
            return next;
          });
        }}
        onDraft={setJupiterDraft}
        onPersist={() => {
          if (!wallet) return;
          void persistJupiterField({ wallet, revealed: jupiterRevealed, draft: jupiterDraft, io });
        }}
      />
    </>
  );
}

export function CuPriceScreen({ settings }: { settings: Settings }): JSX.Element {
  const io = useSettingsIo();
  const [draft, setDraft] = useState(String(settings.defaultCuPrice));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(
    (raw: string) => {
      const parsed = parseDefaultCuPriceInput(raw);
      if (parsed == null) {
        setDraft(String(settings.defaultCuPrice));
        return;
      }
      if (parsed === settings.defaultCuPrice) return;
      void patchSettingsPartial({ defaultCuPrice: parsed }, io);
    },
    [io, settings.defaultCuPrice],
  );

  return (
    <div className="field">
      <label htmlFor="settings-default-cu-price">micro-lamports / CU</label>
      <input
        id="settings-default-cu-price"
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        autoComplete="off"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (debounceRef.current != null) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            commit(v);
          }, 500);
        }}
        onBlur={() => {
          if (debounceRef.current != null) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          commit(draft);
        }}
      />
    </div>
  );
}

export function ChangePasswordScreen(): JSX.Element {
  const io = useSettingsIo();
  const { clearError, navigateTo } = usePopupContext();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  const onPrimary = useCallback(async () => {
    clearError();
    const result = await submitChangePassword({
      currentPassword: current,
      newPassword: next,
      confirm,
      io,
    });
    if (!result.ok) {
      if (result.err) setErr(result.err);
      return;
    }
    navigateTo("settings");
  }, [clearError, current, next, confirm, io, navigateTo]);

  useRegisterDock({
    label: "變更密碼",
    disabled: !changePasswordCanSubmit(current, next, confirm),
    onPrimary,
  });

  return (
    <>
      <div className="field">
        <label htmlFor="change-pwd-current">目前密碼</label>
        <WalletPasswordInput
          id="change-pwd-current"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            setErr("");
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="change-pwd-new">新密碼</label>
        <WalletPasswordInput
          id="change-pwd-new"
          value={next}
          onChange={(v) => {
            setNext(v);
            setErr("");
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="change-pwd-confirm">再次輸入新密碼</label>
        <WalletPasswordInput
          id="change-pwd-confirm"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            setErr("");
          }}
        />
      </div>
      <p id="change-pwd-err" className="inline-err">
        {err}
      </p>
    </>
  );
}
