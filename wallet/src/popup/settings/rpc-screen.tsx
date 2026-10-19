/**
 * Popup RPC settings: per-cluster URL list, active selection, and inline editors.
 * Does not change network cluster or API key screens.
 */
import type { JSX } from "react";
import { useState } from "react";
import type { PublicSettings } from "../../shared/storage-keys";
import { IconCheck, IconPlus, IconTrash, IconX } from "../components/StrokeIcon";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import {
  cloneRpcByCluster,
  confirmRpcUrl,
  patchRpcByCluster,
  PUBLIC_RPC_BY_CLUSTER,
  rpcOptionKey,
  useSettingsIo,
  type Cluster,
  type SettingsIo,
} from "./settings-logic";

export function RpcScreen({ settings }: { settings: PublicSettings }): JSX.Element {
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
  settings: PublicSettings;
  editKey: string | null;
  editDraft: string;
  setEditKey: (k: string | null) => void;
  setEditDraft: (d: string) => void;
}): JSX.Element {
  const io = useSettingsIo();
  const { wallet, showError } = usePopupContext();
  const { locale, t } = useT();
  const cfg = settings.rpcByCluster[cluster];
  const rows: { url: string; isPublic: boolean }[] = [
    ...(cluster === "devnet" ? [{ url: PUBLIC_RPC_BY_CLUSTER.devnet, isPublic: true }] : []),
    ...cfg.urls.map((url) => ({ url, isPublic: false })),
  ];
  return (
    <div className="rpc-cluster-card" data-rpc-cluster-card={cluster}>
      <div className="rpc-cluster-head">
        <h3>{cluster === "mainnet" ? "Mainnet" : "Devnet"}</h3>
        <span className="rpc-cluster-badge" id={`rpc-badge-${cluster}`} hidden={settings.cluster !== cluster}>
          {t("settings.rpc.current")}
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
                      void patchRpcByCluster(next, io, locale);
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
                    <span className="rpc-badge">{t("settings.rpc.builtin")}</span>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn ghost-inline rpc-icon-btn danger"
                      title={t("common.delete")}
                      aria-label={t("common.delete")}
                      onClick={(ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        const next = cloneRpcByCluster(settings.rpcByCluster);
                        const urls = next[cluster].urls.filter((u) => u !== url);
                        const active = next[cluster].active === url ? "" : next[cluster].active;
                        next[cluster] = { urls, active };
                        if (editKey === key) setEditKey(null);
                        void patchRpcByCluster(next, io, locale);
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
            title={t("common.add")}
            aria-label={t("common.add")}
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
  const { locale, t } = useT();
  const confirm = () => {
    if (!walletNeeded) return;
    const result = confirmRpcUrl({
      cluster,
      url,
      isNew,
      draft,
      wallet: walletNeeded,
      locale,
    });
    if (!result.ok) {
      showError(t(result.error));
      return;
    }
    void patchRpcByCluster(result.next, io, locale).then(() => onSaved(result.nextUrl));
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
        <>
          <button
            type="button"
            className="icon-btn ghost-inline rpc-icon-btn"
            title={t("common.confirm")}
            aria-label={t("common.confirm")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => confirm()}
          >
            <IconCheck />
          </button>
          {isNew ? (
            <button
              type="button"
              className="icon-btn ghost-inline rpc-icon-btn danger"
              title={t("common.discard")}
              aria-label={t("common.discard")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClose}
            >
              <IconX />
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
