/**
 * Sign-message / sign-transaction page via the existing approval shell session.
 * Does not render connect consent; that is ConnectPage.
 */
import type { JSX } from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { mountApprovalShell } from "../approval/shell";
import { buildApprovalRootHtml } from "../popup/components/ApprovalHost";
import type { UiLocale } from "../shared/storage-keys";
import { STORAGE } from "../shared/storage-keys";
import { walletShellSurfaceFromHref } from "../shared/shell-constants";
import { DEFAULT_UI_LOCALE, parseUiLocale, t } from "../shared/ui-i18n";

export const SignFlowPage = memo(function SignFlowPage({
  requestId,
  onFinished,
}: {
  requestId: string;
  onFinished: () => void;
}): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;
  const [locale, setLocale] = useState<UiLocale>(DEFAULT_UI_LOCALE);

  useEffect(() => {
    void chrome.storage.local.get(STORAGE.settings).then((data) => {
      const raw = data[STORAGE.settings] as { locale?: unknown } | undefined;
      setLocale(parseUiLocale(raw?.locale));
    });
  }, []);

  const translate = useMemo(
    () => (key: Parameters<typeof t>[1], vars?: Record<string, string>) => t(locale, key, vars),
    [locale],
  );
  const approvalHtml = useMemo(() => buildApprovalRootHtml(translate), [translate]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !requestId) return;
    const host = walletShellSurfaceFromHref(window.location.href) === "sidebar" ? "sidebar" : "window";
    const dispose = mountApprovalShell(
      {
        requestId,
        host,
        elementIdPrefix: "appr-",
        callbacks: {
          onClose: () => finishedRef.current(),
        },
      },
      el,
    );
    return dispose;
  }, [requestId, locale]);

  return (
    <div className="flow-page">
      <div
        ref={rootRef}
        className="approval-root"
        dangerouslySetInnerHTML={{ __html: approvalHtml }}
      />
    </div>
  );
});
