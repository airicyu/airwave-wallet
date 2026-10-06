import type { JSX, MouseEvent } from "react";
import { useEffect, useState } from "react";
import {
  activityWhen,
  isSolscanTxUrl,
  kindLabel,
  type HomeActivityRow,
} from "../../shared/home-activity";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { State, View } from "../types";
import { IconExternal } from "./StrokeIcon";

type Phase = "loading" | "empty" | "error" | "list";

type Props = {
  wallet: State;
  currentView: View;
};

function openSolscan(url: string, event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  if (!isSolscanTxUrl(url)) return;
  void chrome.tabs.create({ url });
}

export function HomeActivityList({ wallet, currentView }: Props): JSX.Element {
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<HomeActivityRow[]>([]);
  const activeId = wallet.activeAccountId ?? "";
  const cluster = wallet.settings.cluster;
  const rpcUrl = wallet.settings.rpcUrl;
  const heliusApiUrl = wallet.settings.heliusApiUrl;

  useEffect(() => {
    if (currentView !== "home-activity") return;
    let cancelled = false;
    setPhase("loading");
    setRows([]);
    void (async () => {
      try {
        const res = await sendExtensionRequest("wallet.getHomeActivity", {});
        if (cancelled) return;
        if (!res.ok) {
          setPhase("error");
          return;
        }
        const payload = res.result as { rows?: HomeActivityRow[]; error?: string };
        if (payload.error) {
          setRows([]);
          setPhase("error");
          return;
        }
        const next = payload.rows ?? [];
        setRows(next);
        setPhase(next.length === 0 ? "empty" : "list");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentView, activeId, cluster, rpcUrl, heliusApiUrl]);

  return (
    <section
      id="screen-home-activity"
      className={phase === "list" ? "screen" : "screen activity-screen"}
    >
      <h3 className="activity-head">活動</h3>
      {phase === "loading" ? <p className="activity-quiet">載入中</p> : null}
      {phase === "empty" ? <p className="activity-quiet">尚無交易</p> : null}
      {phase === "error" ? <p className="activity-quiet activity-quiet-err">活動暫時無法載入</p> : null}
      {phase === "list" ? (
        <ul className="activity-feed">
          {rows.map((row) => (
            <li key={row.signature} className="activity-row">
              <div className="activity-main">
                <div className="activity-top">
                  <span className="activity-kind">{kindLabel(row.kind)}</span>
                  {row.timestampSec != null ? (
                    <span className="activity-when">{activityWhen(row.timestampSec)}</span>
                  ) : null}
                </div>
                <ActivityDetail lead={row.lead} detail={row.detail} />
              </div>
              <a
                className="activity-ext"
                href={row.solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="在 Solscan 開啟"
                aria-label="在 Solscan 開啟"
                onClick={(event) => openSolscan(row.solscanUrl, event)}
              >
                <IconExternal />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ActivityDetail({
  lead,
  detail,
}: {
  lead: HomeActivityRow["lead"];
  detail: string;
}): JSX.Element {
  if (lead === "fail") {
    return (
      <div className="activity-detail">
        <span className="activity-fail">失敗</span>
        {detail ? ` · ${detail}` : null}
      </div>
    );
  }
  if (lead === "ok") {
    return <div className="activity-detail">成功{detail ? ` · ${detail}` : ""}</div>;
  }
  return <div className="activity-detail">{detail}</div>;
}
