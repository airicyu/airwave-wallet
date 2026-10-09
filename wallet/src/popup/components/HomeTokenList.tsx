import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { isCombinedAccount } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import {
  friendlyErrorMessage,
  shouldUseRpcTransientToast,
} from "../../shared/friendly-error-message";
import { accountKind } from "../../shared/storage-keys";
import { NATIVE_SOL_ID, shortMint, type HomeTokenRow } from "../home/home-tokens";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { t as translate } from "../../shared/ui-i18n";
import { useT } from "../state/useT";
import type { State, View } from "../types";

let homeTokensGen = 0;

type Props = {
  wallet: State;
  currentView: View;
  onOpenDetail: (tokenId: string) => void;
};

export function HomeTokenList({ wallet, currentView, onOpenDetail }: Props): JSX.Element {
  const {
    homeTokenRows,
    setHomeTokenRows,
    expandedTokenRowIds,
    setExpandedTokenRowIds,
    homeAssetsForce,
    setHomeAssetsForce,
    bumpClosableScan,
    showToast,
    flowStack,
  } = usePopupContext();
  const flowPausedRef = useRef(flowStack.length > 0);
  flowPausedRef.current = flowStack.length > 0;
  const { locale, t } = useT();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const homeTokenRowsLenRef = useRef(homeTokenRows.length);
  homeTokenRowsLenRef.current = homeTokenRows.length;

  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
  const activeIsCombined = active != null && isCombinedAccount(active);

  const reportAssetsIssue = useCallback(
    (raw: string | null | undefined) => {
      if (!raw?.trim()) {
        setError(null);
        return;
      }
      const friendly = friendlyErrorMessage(raw, locale, "error.code.HOLDINGS_LOAD_FAILED");
      if (shouldUseRpcTransientToast(raw)) {
        showToast(friendly, "warn");
        setError(null);
        return;
      }
      setError(friendly);
    },
    [locale, showToast],
  );

  const load = useCallback(
    async (force = false) => {
      if (flowPausedRef.current) return;
      if (currentView !== "home-token" || !wallet.activeAccountId) return;
      setLoading((prev) => prev || homeTokenRowsLenRef.current === 0);
      const gen = ++homeTokensGen;
      try {
        const res = await sendExtensionRequest("wallet.getHomeTokens", force ? { force: true } : {});
        if (gen !== homeTokensGen) return;
        if (!res.ok) {
          reportAssetsIssue(res.error?.message ?? translate(locale, "error.code.HOLDINGS_LOAD_FAILED"));
          return;
        }
        const payload = res.result as { rows?: HomeTokenRow[]; error?: string };
        const next = payload.rows ?? [];
        setHomeTokenRows(next);
        reportAssetsIssue(payload.error ?? null);
        if (force) {
          await sendExtensionRequest("wallet.listClosableTokenAccounts", { force: true });
          bumpClosableScan();
        }
      } catch (e) {
        if (gen !== homeTokensGen) return;
        reportAssetsIssue(e instanceof Error ? e.message : translate(locale, "error.code.HOLDINGS_LOAD_FAILED"));
      } finally {
        if (gen === homeTokensGen) setLoading(false);
      }
    },
    [currentView, wallet.activeAccountId, setHomeTokenRows, bumpClosableScan, reportAssetsIssue],
  );

  useEffect(() => {
    void load(false);
  }, [load, wallet.activeAccountId, wallet.settings.rpcUrl, wallet.settings.defaultCuPrice]);

  useEffect(() => {
    if (!homeAssetsForce) return;
    setHomeAssetsForce(false);
    void load(true);
  }, [homeAssetsForce, load, setHomeAssetsForce]);

  if (loading && homeTokenRows.length === 0) {
    return (
      <>
        <ul id="home-tokens" className="token-list">
          <li className="muted">{t("common.loadingEllipsis")}</li>
        </ul>
        <p id="home-assets-error" className="error" hidden />
      </>
    );
  }

  return (
    <>
      <ul id="home-tokens" className="token-list">
        {homeTokenRows.map((row) => {
          const canExpand = activeIsCombined && row.members != null && row.members.length >= 1;
          const isExpanded = canExpand && expandedTokenRowIds.has(row.id);
          return (
            <TokenRow
              key={row.id}
              row={row}
              canExpand={canExpand}
              isExpanded={isExpanded}
              onOpenDetail={onOpenDetail}
              onToggleExpand={() =>
                setExpandedTokenRowIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(row.id)) next.delete(row.id);
                  else next.add(row.id);
                  return next;
                })
              }
            />
          );
        })}
      </ul>
      <p id="home-assets-error" className="error" hidden={!error}>
        {error ?? ""}
      </p>
    </>
  );
}

function TokenRow({
  row,
  canExpand,
  isExpanded,
  onOpenDetail,
  onToggleExpand,
}: {
  row: HomeTokenRow;
  canExpand: boolean;
  isExpanded: boolean;
  onOpenDetail: (id: string) => void;
  onToggleExpand: () => void;
}): JSX.Element {
  const { t } = useT();
  return (
    <>
      <li
        className="token-card"
        tabIndex={0}
        role="button"
        onClick={() => onOpenDetail(row.id)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            onOpenDetail(row.id);
          }
        }}
      >
        <TokenIcon row={row} />
        <div className="token-main">
          <div className="token-name-row">
            <div className="token-sym">{row.name || row.symbol}</div>
            {row.isVerified ? (
              <span className="token-verified" title={t("token.verified")} aria-label={t("token.verified")}>
                ✓
              </span>
            ) : null}
          </div>
          <div className="token-qty">
            {row.uiAmountLabel} {row.symbol}
          </div>
        </div>
        <div className="token-right">
          <div className="token-usd">{row.usdLabel}</div>
          {canExpand ? (
            <button
              type="button"
              className="token-expand-btn"
              aria-expanded={isExpanded}
              onClick={(ev) => {
                ev.stopPropagation();
                onToggleExpand();
              }}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : null}
        </div>
      </li>
      {canExpand && isExpanded && row.members ? (
        <li className="token-members">
          <ul>
            {row.members.map((m) => (
              <li key={m.pubkey} className="token-member-row">
                {shortAddr(m.pubkey)} · {m.uiAmountLabel} {row.symbol} · {Math.round(m.percent)}%
              </li>
            ))}
          </ul>
        </li>
      ) : null}
    </>
  );
}

function TokenIcon({ row }: { row: HomeTokenRow }): JSX.Element {
  const [failed, setFailed] = useState(false);
  if (row.iconUrl && !failed) {
    return (
      <div className="token-icon" aria-hidden="true">
        <img src={row.iconUrl} alt="" onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className="token-icon" aria-hidden="true">
      {row.iconLetter}
    </div>
  );
}

export function TokenDetailView({
  wallet,
  tokenId,
  onSend,
}: {
  wallet: State;
  tokenId: string;
  onSend: () => void;
}): JSX.Element {
  const { homeTokenRows } = usePopupContext();
  const { t } = useT();
  const row = homeTokenRows.find((r) => r.id === tokenId);
  if (!row) {
    return (
      <div id="token-detail-root" className="token-detail">
        <p className="muted">{t("error.tokenNotFound")}</p>
      </div>
    );
  }
  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
  const canSend = wallet.unlocked && active != null && accountKind(active) === "signing";

  return (
    <div id="token-detail-root" className="token-detail">
      <div className="token-detail-hero">
        <TokenIcon row={row} />
        <h3 className="token-detail-name">{row.name || row.symbol}</h3>
        {canSend ? (
          <button type="button" className="token-detail-send-btn" onClick={onSend}>
            {t("send.action")}
          </button>
        ) : null}
      </div>
      <div className="token-detail-meta">
        <div className="token-detail-row">
          <span className="label">{t("send.amount")}</span>
          <span>
            {row.uiAmountLabel} {row.symbol}
          </span>
        </div>
        <div className="token-detail-row">
          <span className="label">{t("token.mint")}</span>
          <span>{row.id === NATIVE_SOL_ID ? t("token.native") : shortMint(row.id)}</span>
        </div>
      </div>
    </div>
  );
}
