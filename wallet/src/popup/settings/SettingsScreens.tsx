/**
 * Popup settings hub and sub-screens (locale, network, RPC, API keys, CU, password).
 * Does not write chrome.storage; persistence goes through settings-logic commands.
 */
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck, IconChevronDown, IconPlus, IconTrash, IconX } from "../components/StrokeIcon";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import type { PublicSettings, UiLocale } from "../../shared/storage-keys";
import { DEFAULT_UI_LOCALE, LOCALE_ENDONYM, t, UI_LOCALES } from "../../shared/ui-i18n";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import {
  changePasswordCanSubmit,
  cloneRpcByCluster,
  confirmRpcUrl,
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
import { SecretKeyField } from "./SecretKeyField";

function useSettingsIo(): SettingsIo {
  const { refresh, showError, wallet } = usePopupContext();
  const locale = wallet ? wallet.settings.locale : DEFAULT_UI_LOCALE;
  return { refresh, showError, locale };
}

function IdleAutoLockSection({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale, t } = useT();
  const [minutesDraft, setMinutesDraft] = useState(String(settings.idleAutoLockMinutes));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMinutesDraft(String(settings.idleAutoLockMinutes));
  }, [settings.idleAutoLockMinutes]);

  const commitMinutes = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1440) {
        setMinutesDraft(String(settings.idleAutoLockMinutes));
        return;
      }
      if (parsed === settings.idleAutoLockMinutes) return;
      void patchSettingsPartial({ idleAutoLockMinutes: parsed }, io, locale);
    },
    [io, locale, settings.idleAutoLockMinutes],
  );

  const bumpMinutes = (delta: number): void => {
    const parsed = Number.parseInt(minutesDraft, 10);
    const base = Number.isInteger(parsed) ? parsed : settings.idleAutoLockMinutes;
    const next = Math.min(1440, Math.max(1, base + delta));
    if (next === settings.idleAutoLockMinutes) {
      setMinutesDraft(String(next));
      return;
    }
    setMinutesDraft(String(next));
    void patchSettingsPartial({ idleAutoLockMinutes: next }, io, locale);
  };

  return (
    <section className="idle-lock-config-card" aria-labelledby="idle-lock-config-card-title">
      <h2 className="idle-lock-config-card-title" id="idle-lock-config-card-title">
        {t("settings.idleAutoLock.enable")}
      </h2>
      <div className="idle-lock-config-body">
        <div className="idle-lock-config-row">
          <span className="hub-label">{t("settings.txAiAnalysis.enable")}</span>
          <button
            type="button"
            className="tx-ai-switch"
            role="switch"
            aria-checked={settings.idleAutoLockEnabled}
            onClick={() => {
              void patchSettingsPartial(
                { idleAutoLockEnabled: !settings.idleAutoLockEnabled },
                io,
                locale,
              );
            }}
          />
        </div>
        <div className="idle-lock-config-row idle-lock-config-duration-row">
          <label className="hub-label" htmlFor="settings-idle-lock-minutes">
            {t("settings.idleAutoLock.lockAfter")}
          </label>
          <div className="idle-lock-minutes-stepper">
            <input
              id="settings-idle-lock-minutes"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={minutesDraft}
              onChange={(e) => {
                const v = e.target.value;
                setMinutesDraft(v);
                if (debounceRef.current) clearTimeout(debounceRef.current);
                debounceRef.current = setTimeout(() => commitMinutes(v), 400);
              }}
              onBlur={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                commitMinutes(minutesDraft);
              }}
            />
            <div className="idle-lock-minutes-spin" role="group" aria-label={t("settings.idleAutoLock.lockAfter")}>
              <button
                type="button"
                className="idle-lock-minutes-step"
                title={t("settings.idleAutoLock.increase")}
                aria-label={t("settings.idleAutoLock.increase")}
                onClick={() => bumpMinutes(1)}
              >
                <span className="idle-lock-minutes-chevron-up" aria-hidden="true">
                  <IconChevronDown size={14} />
                </span>
              </button>
              <button
                type="button"
                className="idle-lock-minutes-step"
                title={t("settings.idleAutoLock.decrease")}
                aria-label={t("settings.idleAutoLock.decrease")}
                onClick={() => bumpMinutes(-1)}
              >
                <IconChevronDown size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function txAiHubOnOff(settings: PublicSettings, locale: UiLocale): string {
  return settings.txAiAnalysisEnabled
    ? t(locale, "settings.txAiAnalysis.enable")
    : t(locale, "settings.txAiAnalysis.off");
}

export function WalletLockSettingsScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <div className="wallet-lock-settings">
      <IdleAutoLockSection settings={settings} />
      <ul className="settings-hub-list">
        <li>
          <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-password")}>
            <span className="hub-label">{t("settings.hub.walletLockPassword")}</span>
            <span className="hub-summary">{t("settings.hub.changePassword")}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

export function SettingsHub({ settings }: { settings: PublicSettings }): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t, locale } = useT();
  return (
    <ul className="settings-hub-list" id="settings-hub-list">
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-locale")}>
          <span className="hub-label">{t("settings.hub.language")}</span>
          <span className="hub-summary" id="hub-summary-locale">
            {LOCALE_ENDONYM[settings.locale]}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-rpc")}>
          <span className="hub-label">{t("settings.hub.rpc")}</span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-keys")}>
          <span className="hub-label">{t("settings.hub.apiKeys")}</span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-tx-ai")}>
          <span className="hub-label">{t("settings.hub.txAi")}</span>
          <span className="hub-summary" id="hub-summary-tx-ai">
            {txAiHubOnOff(settings, locale)}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-cu-price")}>
          <span className="hub-label">{t("settings.hub.cuPrice")}</span>
          <span className="hub-summary" id="hub-summary-cu-price">
            {String(settings.defaultCuPrice)}
          </span>
        </button>
      </li>
      <li>
        <button type="button" className="settings-hub-row" onClick={() => navigateTo("settings-wallet-lock")}>
          <span className="hub-label">{t("settings.hub.walletLock")}</span>
        </button>
      </li>
    </ul>
  );
}

export function LocaleScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale, t } = useT();
  return (
    <div className="network-pick-list" role="radiogroup" aria-label={t("settings.locale.title")}>
      {UI_LOCALES.map((loc) => (
        <label key={loc} className="network-pick-row">
          <input
            type="radio"
            name="settings-locale"
            value={loc}
            checked={settings.locale === loc}
            onChange={() => {
              if (loc === settings.locale) return;
              void patchSettingsPartial({ locale: loc as UiLocale }, io, locale);
            }}
          />
          <span className="network-pick-meta">
            <span className="network-pick-title">{LOCALE_ENDONYM[loc]}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

export function NetworkScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale, t } = useT();
  return (
    <div className="network-pick-list" role="radiogroup" aria-label={t("settings.network.aria")}>
      {(["devnet", "mainnet"] as const).map((cluster) => (
        <label key={cluster} className="network-pick-row">
          <input
            type="radio"
            name="settings-cluster"
            value={cluster}
            checked={settings.cluster === cluster}
            onChange={() => {
              if (cluster === settings.cluster) return;
              void patchSettingsPartial({ cluster }, io, locale);
            }}
          />
          <span className="network-pick-meta">
            <span className="network-pick-title">{cluster === "mainnet" ? "Mainnet" : "Devnet"}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

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

export function KeysScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const { wallet } = usePopupContext();
  const io = useSettingsIo();
  const { locale } = useT();
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const release = (rowId: string): void => {
    setClaimedId((current) => (current === rowId ? null : current));
  };

  return (
    <>
      <SecretKeyField
        id="helius-api-url"
        label="Helius API URL"
        configured={settings.heliusConfigured}
        secretName="heliusApiUrl"
        claimedId={claimedId}
        onClaim={setClaimedId}
        onRelease={release}
        persist={(value) => {
          if (!wallet) return Promise.resolve(false);
          return persistHeliusField({ draft: value, io, locale });
        }}
      />
      <SecretKeyField
        id="jupiter-api-key"
        label="Jupiter API key"
        configured={settings.jupiterConfigured}
        secretName="jupiterApiKey"
        claimedId={claimedId}
        onClaim={setClaimedId}
        onRelease={release}
        persist={(value) => {
          if (!wallet) return Promise.resolve(false);
          return persistJupiterField({ draft: value, io, locale });
        }}
      />
    </>
  );
}

export function CuPriceScreen({ settings }: { settings: PublicSettings }): JSX.Element {
  const io = useSettingsIo();
  const { locale } = useT();
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
      void patchSettingsPartial({ defaultCuPrice: parsed }, io, locale);
    },
    [io, locale, settings.defaultCuPrice],
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
  const { locale, t } = useT();
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
      locale,
      io,
    });
    if (!result.ok) {
      if (result.err) setErr(t(result.err));
      return;
    }
    navigateTo("settings-wallet-lock");
  }, [clearError, current, next, confirm, io, locale, navigateTo, t]);

  useRegisterDock({
    label: t("settings.password.change"),
    disabled: !changePasswordCanSubmit(current, next, confirm),
    onPrimary,
  });

  return (
    <>
      <div className="field">
        <label htmlFor="change-pwd-current">{t("settings.password.current")}</label>
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
        <label htmlFor="change-pwd-new">{t("settings.password.new")}</label>
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
        <label htmlFor="change-pwd-confirm">{t("settings.password.confirmNew")}</label>
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
