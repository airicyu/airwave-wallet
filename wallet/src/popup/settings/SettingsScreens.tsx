import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { hardenApiKeyInput } from "../lib/password-input";
import { bumpUi, navigateTo, session } from "../lib/session";
import { IconCheck, IconEye, IconPlus, IconTrash } from "../components/StrokeIcon";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import type { Settings } from "../../shared/storage-keys";
import {
  apiKeysHubSummary,
  cloneRpcByCluster,
  commitDefaultCuPriceFromDraft,
  confirmRpcUrl,
  MASKED_SECRET_DISPLAY,
  patchRpcByCluster,
  patchSettingsPartial,
  persistHeliusField,
  persistJupiterField,
  PUBLIC_RPC_BY_CLUSTER,
  rpcOptionKey,
  type Cluster,
} from "./settings-logic";

export function SettingsHub({ settings }: { settings: Settings }): JSX.Element {
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
              void patchSettingsPartial({ cluster });
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
  return (
    <>
      <RpcClusterCard cluster="devnet" settings={settings} />
      <RpcClusterCard cluster="mainnet" settings={settings} />
    </>
  );
}

function RpcClusterCard({ cluster, settings }: { cluster: Cluster; settings: Settings }): JSX.Element {
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
            const editing = session.rpcEditKey === key;
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
                      void patchRpcByCluster(next);
                    }}
                  />
                  <button
                    type="button"
                    className="rpc-url-text"
                    onClick={() => {
                      session.rpcEditKey = session.rpcEditKey === key ? null : key;
                      session.rpcEditDraft = url;
                      bumpUi();
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
                        if (session.rpcEditKey === key) session.rpcEditKey = null;
                        void patchRpcByCluster(next);
                      }}
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
                {editing ? <RpcEditor cluster={cluster} url={url} isPublic={isPublic} isNew={false} /> : null}
              </div>
            );
          })}
          {session.rpcEditKey === `${cluster}:new` ? (
            <RpcEditor cluster={cluster} url="" isPublic={false} isNew />
          ) : null}
        </div>
        <div className="rpc-add-bar">
          <button
            type="button"
            className="icon-btn ghost-inline rpc-icon-btn btn-rpc-add"
            title="加入"
            aria-label="加入"
            onClick={() => {
              session.rpcEditKey = `${cluster}:new`;
              session.rpcEditDraft = "";
              bumpUi();
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
}: {
  cluster: Cluster;
  url: string;
  isPublic: boolean;
  isNew: boolean;
}): JSX.Element {
  return (
    <div className="rpc-edit">
      <input
        type="text"
        value={session.rpcEditDraft}
        readOnly={isPublic}
        autoComplete="off"
        placeholder="https://"
        autoFocus={!isPublic}
        onChange={(e) => {
          session.rpcEditDraft = e.target.value;
          bumpUi();
        }}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            if (!isPublic) confirmRpcUrl(cluster, url, isNew);
          }
          if (ev.key === "Escape") {
            session.rpcEditKey = null;
            bumpUi();
          }
        }}
      />
      {!isPublic ? (
        <button
          type="button"
          className="icon-btn ghost-inline rpc-icon-btn"
          title="確認"
          aria-label="確認"
          onClick={() => confirmRpcUrl(cluster, url, isNew)}
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
  const heliusDraft = session.keysHeliusRevealed ? session.heliusDraft || settings.heliusApiUrl : session.heliusDraft;
  const jupiterDraft = session.keysJupiterRevealed ? session.jupiterDraft || settings.jupiterApiKey : session.jupiterDraft;
  return (
    <>
      <KeysField
        id="helius-api-url"
        label="Helius API URL"
        revealed={session.keysHeliusRevealed}
        stored={settings.heliusApiUrl}
        draft={heliusDraft}
        onReveal={() => {
          session.keysHeliusRevealed = !session.keysHeliusRevealed;
          if (session.keysHeliusRevealed) session.heliusDraft = settings.heliusApiUrl;
          bumpUi();
        }}
        onDraft={(v) => {
          session.heliusDraft = v;
          bumpUi();
        }}
        onPersist={() => persistHeliusField()}
      />
      <KeysField
        id="jupiter-api-key"
        label="Jupiter API key"
        revealed={session.keysJupiterRevealed}
        stored={settings.jupiterApiKey}
        draft={jupiterDraft}
        onReveal={() => {
          session.keysJupiterRevealed = !session.keysJupiterRevealed;
          if (session.keysJupiterRevealed) session.jupiterDraft = settings.jupiterApiKey;
          bumpUi();
        }}
        onDraft={(v) => {
          session.jupiterDraft = v;
          bumpUi();
        }}
        onPersist={() => persistJupiterField()}
      />
    </>
  );
}

export function CuPriceScreen({ settings }: { settings: Settings }): JSX.Element {
  const value = session.cuPriceDraft || String(settings.defaultCuPrice);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        value={value}
        onChange={(e) => {
          session.cuPriceDraft = e.target.value;
          bumpUi();
          if (debounceRef.current != null) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            debounceRef.current = null;
            commitDefaultCuPriceFromDraft();
          }, 500);
        }}
        onBlur={() => {
          if (debounceRef.current != null) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          commitDefaultCuPriceFromDraft();
        }}
      />
    </div>
  );
}

export function ChangePasswordScreen(): JSX.Element {
  return (
    <>
      <div className="field">
        <label htmlFor="change-pwd-current">目前密碼</label>
        <WalletPasswordInput
          id="change-pwd-current"
          value={session.changePwdCurrent}
          onChange={(v) => {
            session.changePwdCurrent = v;
            session.changePwdErr = "";
            bumpUi();
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="change-pwd-new">新密碼</label>
        <WalletPasswordInput
          id="change-pwd-new"
          value={session.changePwdNew}
          onChange={(v) => {
            session.changePwdNew = v;
            session.changePwdErr = "";
            bumpUi();
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="change-pwd-confirm">再次輸入新密碼</label>
        <WalletPasswordInput
          id="change-pwd-confirm"
          value={session.changePwdConfirm}
          onChange={(v) => {
            session.changePwdConfirm = v;
            session.changePwdErr = "";
            bumpUi();
          }}
        />
      </div>
      <p id="change-pwd-err" className="inline-err">
        {session.changePwdErr}
      </p>
    </>
  );
}
