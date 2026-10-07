import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRegisterDock } from "../state/dock";
import { isCombinedAccount } from "../../shared/accounts";
import { getClosableOwnerTargets } from "../../shared/close-empty-owners";
import { sendExtensionRequest } from "../../shared/ext-api";
import { IconRecycle } from "../components/StrokeIcon";
import type { ClosableEntry, CloseEmptyCommitResult, CloseEmptyPlanResult } from "../../shared/close-empty-types";
import {
  countCloseEmptyTransactions,
  estimateCloseEmptyTxBytes,
} from "../../shared/close-empty-pack";
import { formatSolFromLamportsString } from "../../shared/format-lamports";
import { accountKind } from "../../shared/storage-keys";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import type { State, View } from "../types";

type ScanState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; entries: ClosableEntry[]; partial?: boolean }
  | { phase: "hidden" };

export function CloseEmptyRecycleButton({
  wallet,
  onOpen,
}: {
  wallet: State;
  onOpen: () => void;
}): JSX.Element | null {
  const { closableScanGen } = usePopupContext();
  const [scan, setScan] = useState<ScanState>({ phase: "idle" });

  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
  const hasSigners = useMemo(() => {
    if (!active) return false;
    if (accountKind(active) === "readOnly") return false;
    const secrets = undefined;
    return getClosableOwnerTargets(active, wallet.accounts, secrets).length > 0;
  }, [active, wallet.accounts]);

  const load = useCallback(
    async (force = false) => {
      if (!hasSigners || !wallet.activeAccountId) {
        setScan({ phase: "hidden" });
        return;
      }
      setScan({ phase: "loading" });
      const res = await sendExtensionRequest(
        "wallet.listClosableTokenAccounts",
        force ? { force: true } : {},
      );
      if (!res.ok) {
        if (res.error?.code === "RPC_ERROR") {
          setScan({ phase: "hidden" });
          return;
        }
        setScan({ phase: "ready", entries: [] });
        return;
      }
      const body = res.result as { entries?: ClosableEntry[]; partialScan?: boolean };
      setScan({
        phase: "ready",
        entries: body.entries ?? [],
        partial: body.partialScan === true,
      });
    },
    [hasSigners, wallet.activeAccountId],
  );

  useEffect(() => {
    void load(false);
  }, [load, wallet.activeAccountId, wallet.settings.rpcUrl, wallet.settings.cluster]);

  useEffect(() => {
    if (closableScanGen === 0) return;
    void load(false);
  }, [closableScanGen, load]);

  if (!hasSigners) return null;
  if (scan.phase === "idle" || scan.phase === "loading") return null;

  const count = scan.phase === "ready" ? scan.entries.length : 0;
  const dimmed = count === 0;
  const activeClass = dimmed ? "close-empty-btn dimmed" : "close-empty-btn active";

  return (
    <button
      type="button"
      className={`icon-btn ghost-inline ${activeClass}`}
      id="btn-close-empty"
      title="收回租金"
      aria-label="收回租金"
      disabled={dimmed}
      onClick={() => {
        if (!dimmed) onOpen();
      }}
    >
      <IconRecycle />
      {!dimmed ? <span className="close-empty-badge">{count}</span> : null}
    </button>
  );
}

export function CloseEmptyPickScreen({
  wallet,
  initialEntries,
  onNext,
}: {
  wallet: State;
  initialEntries: ClosableEntry[];
  onNext: (selected: string[], plan: CloseEmptyPlanResult) => void;
}): JSX.Element {
  const { showError, closeEmptySelected, setCloseEmptySelected } = usePopupContext();
  const [entries] = useState(initialEntries);
  const selected = closeEmptySelected;
  const setSelected = setCloseEmptySelected;
  const [busy, setBusy] = useState(false);

  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
  const combined = active != null && isCombinedAccount(active);

  const allSelected = entries.length > 0 && entries.every((e) => selected.has(e.tokenAccount));
  const selectedList = entries.filter((e) => selected.has(e.tokenAccount));
  const txCount = countCloseEmptyTransactions(
    selectedList.map((e) => ({
      tokenAccount: e.tokenAccount,
      owner: e.owner,
      tokenProgram: e.tokenProgram,
    })),
    estimateCloseEmptyTxBytes,
  );

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(entries.map((e) => e.tokenAccount)));
  };

  const groups = useMemo(() => {
    if (!combined) return [{ label: null as string | null, items: entries }];
    const byOwner = new Map<string, ClosableEntry[]>();
    for (const e of entries) {
      const key = e.ownerAccountId;
      const list = byOwner.get(key) ?? [];
      list.push(e);
      byOwner.set(key, list);
    }
    return [...byOwner.values()].map((items) => ({
      label: `${items[0]?.ownerLabel ?? ""} ${shortAddr(items[0]?.owner ?? "")}`,
      items,
    }));
  }, [combined, entries]);

  const goNext = useCallback(async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      const res = await sendExtensionRequest("wallet.planCloseEmpty", {
        tokenAccounts: [...selected],
      });
      if (!res.ok) {
        showError(res.error?.message ?? "無法建立計畫");
        return;
      }
      onNext([...selected], res.result as CloseEmptyPlanResult);
    } finally {
      setBusy(false);
    }
  }, [busy, onNext, selected, showError]);

  useRegisterDock({
    label: "下一步",
    disabled: selected.size === 0 || busy,
    meta: `已選 ${selected.size} · ${txCount} 筆交易`,
    onPrimary: goNext,
  });

  return (
    <div className="close-empty-screen">
      <ul className="close-empty-list">
        <li className="close-empty-row select-all">
          <label>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>全選</span>
          </label>
        </li>
        {groups.map((g) => (
          <li key={g.label ?? "single"} className="close-empty-group">
            {g.label ? <div className="close-empty-group-label">{g.label}</div> : null}
            <ul>
              {g.items.map((e) => (
                <li key={e.tokenAccount} className="close-empty-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.has(e.tokenAccount)}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(e.tokenAccount)) next.delete(e.tokenAccount);
                          else next.add(e.tokenAccount);
                          return next;
                        });
                      }}
                    />
                    <span className="close-empty-symbol">{e.symbol}</span>
                    <span className="close-empty-addr">{shortAddr(e.tokenAccount)}</span>
                    <span className="close-empty-rent">
                      {formatSolFromLamportsString(e.rentLamports)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CloseEmptyConfirmScreen({
  wallet,
  plan,
  onConfirm,
  staleError,
}: {
  wallet: State;
  plan: CloseEmptyPlanResult;
  onConfirm: () => void;
  staleError: string | null;
}): JSX.Element {
  const locked = !wallet.unlocked;
  const feeUnknown = false;
  const canConfirm = !locked && !feeUnknown;

  useRegisterDock({
    label: "確認",
    disabled: !canConfirm,
    onPrimary: onConfirm,
  });

  return (
    <div className="close-empty-screen">
      {staleError ? <p className="error">{staleError}</p> : null}
      <div className="close-empty-confirm-hero">
        <div className="close-empty-confirm-main">
          {formatSolFromLamportsString(plan.reclaimLamports)}
        </div>
        <p className="muted">
          {plan.accountCount} 個帳戶 · {plan.txCount} 筆交易
        </p>
      </div>
      <div className="close-empty-fee-card">
        <div className="close-empty-fee-row">
          <span>手續費</span>
          <span>{formatSolFromLamportsString(plan.fee.totalLamports)}</span>
        </div>
        <div className="close-empty-fee-row">
          <span>簽名費</span>
          <span>{formatSolFromLamportsString(plan.fee.signatureLamports)}</span>
        </div>
        <div className="close-empty-fee-row">
          <span>優先費</span>
          <span>{formatSolFromLamportsString(plan.fee.priorityLamports)}</span>
        </div>
      </div>
      <div className="close-empty-tx-groups">
        {plan.txs.map((tx, i) => (
          <div key={i} className="close-empty-tx-group">
            <div className="close-empty-tx-title">交易 {i + 1}</div>
            <ul>
              {tx.accounts.map((a) => (
                <li key={a.tokenAccount}>
                  {a.symbol} · {shortAddr(a.tokenAccount)} · {formatSolFromLamportsString(a.rentLamports)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CloseEmptySendingScreen(): JSX.Element {
  return (
    <div className="close-empty-screen close-empty-sending">
      <p className="close-empty-sending-title">確認中</p>
      <p className="muted">等待這一波結束</p>
    </div>
  );
}

export function CloseEmptyResultScreen({
  result,
  onDone,
}: {
  result: CloseEmptyCommitResult;
  onDone: () => void;
}): JSX.Element {
  useRegisterDock({
    label: "完成",
    disabled: false,
    onPrimary: onDone,
  });

  return (
    <div className="close-empty-screen">
      <div className="close-empty-result-grid">
        <div>
          <div className="close-empty-result-num">{result.confirmedCount}</div>
          <div className="muted">已確認</div>
        </div>
        <div>
          <div className="close-empty-result-num">{result.failedCount}</div>
          <div className="muted">鏈上失敗</div>
        </div>
        <div>
          <div className="close-empty-result-num">{result.expiredCount}</div>
          <div className="muted">已過期</div>
        </div>
      </div>
      <p className="close-empty-confirm-main">
        {formatSolFromLamportsString(result.reclaimedLamports)}
      </p>
    </div>
  );
}

export function useCloseEmptyEntriesLoader(wallet: State): {
  entries: ClosableEntry[];
  reload: () => Promise<void>;
} {
  const [entries, setEntries] = useState<ClosableEntry[]>([]);
  const reload = useCallback(async () => {
    const res = await sendExtensionRequest("wallet.listClosableTokenAccounts", { force: true });
    if (res.ok) {
      const body = res.result as { entries?: ClosableEntry[] };
      setEntries(body.entries ?? []);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload, wallet.activeAccountId]);
  return { entries, reload };
}

export type CloseEmptyView = Extract<
  View,
  "close-empty-pick" | "close-empty-confirm" | "close-empty-sending" | "close-empty-result"
>;
