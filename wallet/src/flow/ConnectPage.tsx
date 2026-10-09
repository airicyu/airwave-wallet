/**
 * Full connect consent page (title, origin, reject/approve dock).
 * Shows the vault unlock form first when locked; does not render sign review.
 */
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconBack } from "../popup/components/StrokeIcon";
import type { PendingRecord } from "../shared/commands";
import { sendExtensionRequest } from "../shared/ext-api";
import { SESSION_UNLOCKED, STORAGE } from "../shared/storage-keys";
import { apiErrorMessage, DEFAULT_UI_LOCALE, parseUiLocale, t } from "../shared/ui-i18n";
import type { UiLocale } from "../shared/storage-keys";
import { UnlockForm } from "./UnlockForm";

export function ConnectPage({
  requestId,
  onFinished,
}: {
  requestId: string;
  onFinished: () => void;
}): JSX.Element {
  const [locale, setLocale] = useState<UiLocale>(DEFAULT_UI_LOCALE);
  const [origin, setOrigin] = useState("");
  const [error, setError] = useState("");
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const reconnectWhileLocked = useRef(false);
  const autoApproveStarted = useRef(false);

  useEffect(() => {
    void chrome.storage.local.get(STORAGE.settings).then((data) => {
      const raw = data[STORAGE.settings] as { locale?: unknown } | undefined;
      setLocale(parseUiLocale(raw?.locale));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pendingRes, stateRes] = await Promise.all([
        sendExtensionRequest("ui.getPending", { requestId }),
        sendExtensionRequest("wallet.getState", {}),
      ]);
      if (cancelled) return;
      if (!pendingRes.ok) {
        setGone(true);
        return;
      }
      const pending = pendingRes.result as PendingRecord;
      if (pending.kind !== "connect") {
        setGone(true);
        return;
      }
      reconnectWhileLocked.current = pending.reconnectWhileLocked === true;
      setOrigin(pending.origin);
      const state = stateRes.ok ? (stateRes.result as { unlocked?: boolean }) : null;
      setUnlocked(state?.unlocked === true);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "session") return;
      if (!(SESSION_UNLOCKED in changes)) return;
      setUnlocked(Boolean(changes[SESSION_UNLOCKED].newValue));
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const settle = useCallback(
    async (decision: "approve" | "reject") => {
      if (busy) return;
      setBusy(true);
      setError("");
      const res = await sendExtensionRequest("ui.resolvePending", { requestId, decision });
      if (!res.ok) {
        if (res.error?.code === "NOT_FOUND") {
          setGone(true);
          return;
        }
        setBusy(false);
        setError(apiErrorMessage(locale, res.error, "error.genericFailed"));
        return;
      }
      onFinished();
    },
    [busy, locale, onFinished, requestId],
  );

  useEffect(() => {
    if (!ready || !unlocked || gone || !reconnectWhileLocked.current) return;
    if (autoApproveStarted.current) return;
    autoApproveStarted.current = true;
    void settle("approve");
  }, [gone, ready, settle, unlocked]);

  if (gone) {
    return (
      <div className="flow-page">
        <section className="expired-screen">
          <h1>{t(locale, "approval.expired")}</h1>
          <p>{t(locale, "approval.goneGeneric")}</p>
          <button type="button" className="primary-btn" onClick={() => onFinished()}>
            {t(locale, "common.return")}
          </button>
        </section>
      </div>
    );
  }

  if (!ready) {
    return <div className="flow-page" />;
  }

  if (!unlocked) {
    return (
      <div className="flow-page">
        <header className="top-bar">
          <div className="bar-subpage">
            <button
              type="button"
              className="icon-btn"
              title={t(locale, "menu.back")}
              aria-label={t(locale, "menu.back")}
              disabled={busy}
              onClick={() => void settle("reject")}
            >
              <IconBack />
            </button>
            <div className="bar-subpage-title">{t(locale, "page.connect")}</div>
          </div>
        </header>
        <UnlockForm locale={locale} onUnlocked={() => setUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="flow-page">
      <header className="top-bar">
        <div className="bar-subpage">
          <button
            type="button"
            className="icon-btn"
            title={t(locale, "menu.back")}
            aria-label={t(locale, "menu.back")}
            disabled={busy}
            onClick={() => void settle("reject")}
          >
            <IconBack />
          </button>
          <div className="bar-subpage-title">{t(locale, "page.connect")}</div>
        </div>
      </header>
      <div className="flow-page-body">
        <p className="muted">{origin}</p>
        <p>{t(locale, "approval.connectLead")}</p>
        {error ? <p className="inline-error">{error}</p> : null}
      </div>
      <footer className="approval-dock">
        <button
          type="button"
          className="ghost-btn"
          disabled={busy}
          onClick={() => void settle("reject")}
        >
          {t(locale, "approval.reject")}
        </button>
        <button
          type="button"
          className="primary-btn"
          disabled={busy}
          onClick={() => void settle("approve")}
        >
          {t(locale, busy ? "approval.approving" : "approval.approve")}
        </button>
      </footer>
    </div>
  );
}
