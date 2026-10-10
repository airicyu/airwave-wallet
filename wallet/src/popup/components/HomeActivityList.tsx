/**
 * Renders home activity for the exposed address and appends older pages when a sentinel enters `.screen-body`.
 * Does not persist history or fetch from chrome.storage.
 */
import type { JSX, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  activityWhen,
  homeActivityLimit,
  isOrbTxUrl,
  kindLabel,
  type HomeActivityRow,
} from "../../shared/home-activity";
import { jsonRpcMissing } from "../../shared/storage-keys";
import { sendExtensionRequest } from "../../shared/ext-api";
import { MainnetRpcStop } from "./MainnetRpcStop";
import type { State, View } from "../types";
import { useT } from "../state/useT";
import { IconExternal } from "./StrokeIcon";

type Phase = "loading" | "empty" | "error" | "list";
type MoreBar = "off" | "loading" | "error";

type Props = {
  wallet: State;
  currentView: View;
};

function openOrb(url: string, event: MouseEvent<HTMLAnchorElement>): void {
  event.preventDefault();
  if (!isOrbTxUrl(url)) return;
  void chrome.tabs.create({ url });
}

function payloadRows(result: unknown): { rows: HomeActivityRow[]; error: boolean } {
  const payload = result as { rows?: HomeActivityRow[]; error?: string };
  if (payload.error) return { rows: [], error: true };
  return { rows: payload.rows ?? [], error: false };
}

export function HomeActivityList({ wallet, currentView }: Props): JSX.Element {
  const { locale, t } = useT();
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<HomeActivityRow[]>([]);
  const [moreBar, setMoreBar] = useState<MoreBar>("off");
  const activeId = wallet.activeAccountId ?? "";
  const cluster = wallet.settings.cluster;
  const rpcUrl = wallet.settings.rpcUrl;
  const heliusConfigured = wallet.settings.heliusConfigured;
  const activityNeedsRpc = jsonRpcMissing(wallet.settings) && !heliusConfigured;

  const genRef = useRef(0);
  const rowsRef = useRef<HomeActivityRow[]>([]);
  const hasMoreRef = useRef(false);
  const inFlightRef = useRef(false);
  const needLeaveRef = useRef(false);
  const phaseRef = useRef<Phase>("loading");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  rowsRef.current = rows;
  phaseRef.current = phase;

  const loadOlder = useCallback(() => {
    if (phaseRef.current !== "list") return;
    if (!hasMoreRef.current || inFlightRef.current || needLeaveRef.current) return;
    const existing = rowsRef.current;
    const cursor = existing[existing.length - 1]?.signature;
    if (!cursor) return;
    const gen = genRef.current;
    inFlightRef.current = true;
    setMoreBar("loading");
    void (async () => {
      try {
        const res = await sendExtensionRequest("wallet.getHomeActivity", { before: cursor });
        if (gen !== genRef.current) return;
        if (!res.ok) {
          hasMoreRef.current = true;
          needLeaveRef.current = true;
          setMoreBar("error");
          return;
        }
        const parsed = payloadRows(res.result);
        if (parsed.error) {
          hasMoreRef.current = true;
          needLeaveRef.current = true;
          setMoreBar("error");
          return;
        }
        const page = parsed.rows;
        const seen = new Set(existing.map((row) => row.signature));
        const extra = page.filter((row) => !seen.has(row.signature));
        const pageLen = page.length;
        if (pageLen === homeActivityLimit() && extra.length === 0) {
          hasMoreRef.current = false;
        } else {
          hasMoreRef.current = pageLen === homeActivityLimit();
        }
        setRows([...existing, ...extra]);
        setMoreBar("off");
        queueMicrotask(() => {
          if (gen !== genRef.current) return;
          if (needLeaveRef.current || !hasMoreRef.current) return;
          const sent = sentinelRef.current;
          const root = sectionRef.current?.closest(".screen-body");
          if (!sent || !(root instanceof Element)) return;
          const sr = sent.getBoundingClientRect();
          const rr = root.getBoundingClientRect();
          if (sr.top < rr.bottom && sr.bottom > rr.top) loadOlder();
        });
      } catch {
        if (gen !== genRef.current) return;
        hasMoreRef.current = true;
        needLeaveRef.current = true;
        setMoreBar("error");
      } finally {
        if (gen === genRef.current) inFlightRef.current = false;
      }
    })();
  }, []);

  useEffect(() => {
    if (currentView !== "home-activity") return;
    if (activityNeedsRpc) return;
    genRef.current += 1;
    const gen = genRef.current;
    inFlightRef.current = false;
    needLeaveRef.current = false;
    hasMoreRef.current = false;
    setMoreBar("off");
    setPhase("loading");
    setRows([]);
    void (async () => {
      try {
        const res = await sendExtensionRequest("wallet.getHomeActivity", {});
        if (gen !== genRef.current) return;
        if (!res.ok) {
          setPhase("error");
          return;
        }
        const parsed = payloadRows(res.result);
        if (parsed.error) {
          setRows([]);
          setPhase("error");
          return;
        }
        setRows(parsed.rows);
        hasMoreRef.current = parsed.rows.length === homeActivityLimit();
        setPhase(parsed.rows.length === 0 ? "empty" : "list");
      } catch {
        if (gen === genRef.current) setPhase("error");
      }
    })();
    return () => {
      genRef.current += 1;
    };
  }, [currentView, activeId, cluster, rpcUrl, heliusConfigured, activityNeedsRpc]);

  useEffect(() => {
    if (phase !== "list") return;
    const sentinel = sentinelRef.current;
    const root = sectionRef.current?.closest(".screen-body");
    if (!sentinel || !(root instanceof Element)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries[0];
        if (!hit) return;
        if (!hit.isIntersecting) {
          needLeaveRef.current = false;
          return;
        }
        loadOlder();
      },
      { root, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [phase, loadOlder]);

  return (
    <section
      ref={sectionRef}
      id="screen-home-activity"
      className={phase === "list" && !activityNeedsRpc ? "screen" : "screen activity-screen"}
    >
      <h3 className="activity-head">{t("common.activity")}</h3>
      {activityNeedsRpc ? <MainnetRpcStop /> : null}
      {!activityNeedsRpc && phase === "loading" ? <p className="activity-quiet">{t("common.loading")}</p> : null}
      {!activityNeedsRpc && phase === "empty" ? <p className="activity-quiet">{t("activity.empty")}</p> : null}
      {!activityNeedsRpc && phase === "error" ? (
        <p className="activity-quiet activity-quiet-err">{t("error.activityLoad")}</p>
      ) : null}
      {!activityNeedsRpc && phase === "list" ? (
        <>
          <ul className="activity-feed">
            {rows.map((row) => (
              <li key={row.signature} className="activity-row">
                <ActivityIcons icons={row.icons ?? []} />
                <div className="activity-main">
                  <div className="activity-top">
                    <span className="activity-kind">{kindLabel(row.kind, locale)}</span>
                    {row.timestampSec != null ? (
                      <span className="activity-when">{activityWhen(row.timestampSec)}</span>
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
          {moreBar === "loading" ? (
            <div
              className="activity-more-spin"
              aria-busy="true"
              aria-label={t("activity.loadingOlder")}
            />
          ) : null}
          {moreBar === "error" ? (
            <p className="activity-more-err">{t("error.activityOlderLoad")}</p>
          ) : null}
          <div ref={sentinelRef} className="activity-sentinel" aria-hidden="true" />
        </>
      ) : null}
    </section>
  );
}

function ActivityIcons({ icons }: { icons: HomeActivityRow["icons"] }): JSX.Element | null {
  if (!icons.length) return null;
  return (
    <div className="activity-icons" aria-hidden="true">
      {icons.map((icon) => (
        <ActivityIconImg key={icon.mint} iconUrl={icon.iconUrl} />
      ))}
    </div>
  );
}

function ActivityIconImg({ iconUrl }: { iconUrl: string }): JSX.Element | null {
  const [failed, setFailed] = useState(false);
  if (!iconUrl.startsWith("https:") || failed) return null;
  return <img className="activity-icon" src={iconUrl} alt="" onError={() => setFailed(true)} />;
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
