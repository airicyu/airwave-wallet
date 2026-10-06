import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { isCombinedAccount } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import { accountKind } from "../../shared/storage-keys";
import { NATIVE_SOL_ID, shortMint, type HomeTokenRow } from "../home/home-tokens";
import { shortAddr } from "../lib/format";
import { session } from "../lib/session";
import type { State, View } from "../types";

type Props = {
  wallet: State;
  currentView: View;
  onOpenDetail: (tokenId: string) => void;
  tick?: number;
};

export function HomeTokenList({ wallet, currentView, onOpenDetail, tick = 0 }: Props): JSX.Element {
  const [rows, setRows] = useState<HomeTokenRow[]>(() => session.lastSuccessfulTokenRows);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(session.expandedTokenRowIds));

  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
  const activeIsCombined = active != null && isCombinedAccount(active);

  const load = useCallback(
    async (force = false) => {
      if (currentView !== "home-token" || !wallet.activeAccountId) return;
      setLoading((prev) => prev || rows.length === 0);
      const gen = ++session.homeAssetsRequestGen;
      try {
        const res = await sendExtensionRequest("wallet.getHomeTokens", force ? { force: true } : {});
        if (gen !== session.homeAssetsRequestGen || session.currentView !== "home-token") return;
        if (!res.ok) {
          setError(res.error?.message ?? "無法載入持倉");
          return;
        }
        const payload = res.result as { rows?: HomeTokenRow[]; error?: string };
        const next = payload.rows ?? [];
        session.lastSuccessfulTokenRows = next;
        setRows(next);
        setError(payload.error ?? null);
      } catch (e) {
        if (gen !== session.homeAssetsRequestGen) return;
        setError(e instanceof Error ? e.message : "無法載入持倉");
      } finally {
        setLoading(false);
      }
    },
    [currentView, wallet.activeAccountId, rows.length],
  );

  useEffect(() => {
    void load(false);
  }, [load, wallet.activeAccountId, wallet.settings.rpcUrl, wallet.settings.defaultCuPrice]);

  useEffect(() => {
    if (!session.homeAssetsForce) return;
    session.homeAssetsForce = false;
    void load(true);
  }, [load, tick]);

  useEffect(() => {
    session.expandedTokenRowIds = expanded;
  }, [expanded]);

  if (loading && rows.length === 0) {
    return (
      <>
        <ul id="home-tokens" className="token-list">
          <li className="muted">載入中…</li>
        </ul>
        <p id="home-assets-error" className="error" hidden />
      </>
    );
  }

  return (
    <>
      <ul id="home-tokens" className="token-list">
        {rows.map((row) => {
          const canExpand = activeIsCombined && row.members != null && row.members.length >= 1;
          const isExpanded = canExpand && expanded.has(row.id);
          return (
            <TokenRow
              key={row.id}
              row={row}
              canExpand={canExpand}
              isExpanded={isExpanded}
              onOpenDetail={onOpenDetail}
              onToggleExpand={() =>
                setExpanded((prev) => {
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
              <span className="token-verified" title="Jupiter verified" aria-label="verified">
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
  const row = session.lastSuccessfulTokenRows.find((r) => r.id === tokenId);
  if (!row) {
    return (
      <div id="token-detail-root" className="token-detail">
        <p className="muted">找不到此代幣，請返回重試。</p>
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
            送出
          </button>
        ) : null}
      </div>
      <div className="token-detail-meta">
        <div className="token-detail-row">
          <span className="label">數量</span>
          <span>
            {row.uiAmountLabel} {row.symbol}
          </span>
        </div>
        <div className="token-detail-row">
          <span className="label">Mint</span>
          <span>{row.id === NATIVE_SOL_ID ? "原生" : shortMint(row.id)}</span>
        </div>
      </div>
    </div>
  );
}
