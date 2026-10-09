import type { JSX, MouseEvent } from "react";
import { useEffect, useState } from "react";
import {
  activityWhen,
  isOrbTxUrl,
  kindLabel,
  type HomeActivityRow,
} from "../../shared/home-activity";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { State, View } from "../types";
import { useT } from "../state/useT";
import { IconExternal } from "./StrokeIcon";

type Phase = "loading" | "empty" | "error" | "list";

type Props = {
  wallet: State;
  currentView: View;
};

function openOrb(url: string, event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  if (!isOrbTxUrl(url)) return;
  void chrome.tabs.create({ url });
}

export function HomeActivityList({ wallet, currentView }: Props): JSX.Element {
  const { locale, t } = useT();
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<HomeActivityRow[]>([]);
  const activeId = wallet.activeAccountId ?? "";
  const cluster = wallet.settings.cluster;
  const rpcUrl = wallet.settings.rpcUrl;
  const heliusConfigured = wallet.settings.heliusConfigured;

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
  }, [currentView, activeId, cluster, rpcUrl, heliusConfigured]);

  return (
    <section
      id="screen-home-activity"
      className={phase === "list" ? "screen" : "screen activity-screen"}
    >
      <h3 className="activity-head">{t("common.activity")}</h3>
      {phase === "loading" ? <p className="activity-quiet">{t("common.loading")}</p> : null}
      {phase === "empty" ? <p className="activity-quiet">{t("activity.empty")}</p> : null}
      {phase === "error" ? <p className="activity-quiet activity-quiet-err">{t("error.activityLoad")}</p> : null}
      {phase === "list" ? (
        <ul className="activity-feed">
          {rows.map((row) => (
            <li key={row.signature} className="activity-row">
              <div className="activity-main">
                <div className="activity-top">
                  <span className="activity-kind">{kindLabel(row.kind, locale)}</span>
                  {row.timestampSec != null ? (
                    <span className="activity-when">{activityWhen(row.timestampSec, locale)}</span>
                  ) : null}
                </div>
                <ActivityDetail lead={row.lead} detail={row.detail} t={t} />
              </div>
              <a
                className="activity-ext"
                href={row.orbUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t("activity.openOrb")}
                aria-label={t("activity.openOrb")}
                onClick={(event) => openOrb(row.orbUrl, event)}
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
  t,
}: {
  lead: HomeActivityRow["lead"];
  detail: string;
  t: (key: import("../../shared/ui-messages").MessageKey, vars?: Record<string, string>) => string;
}): JSX.Element {
  if (lead === "fail") {
    return (
      <div className="activity-detail">
        <span className="activity-fail">{t("activity.fail")}</span>
        {detail ? ` · ${detail}` : null}
      </div>
    );
  }
  if (lead === "ok") {
    return (
      <div className="activity-detail">
        {t("activity.success")}
        {detail ? ` · ${detail}` : ""}
      </div>
    );
  }
  return <div className="activity-detail">{detail}</div>;
}
