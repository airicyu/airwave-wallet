/**
 * React approval shell root: unlock, expired, and sign views wired to approval-shell-runtime.
 * Does not load pending from storage or resolve requests itself.
 */
import type { JSX } from "react";
import { memo, useEffect, useLayoutEffect, useRef } from "react";
import { bindApprovalShell } from "./shell/runtime";
import type { ApprovalShellCallbacks, ApprovalShellConfig, ApprovalShellDomRefs } from "./shell/types";
import { ApprovalExpired } from "./components/ApprovalExpired";
import { ApprovalSign } from "./components/ApprovalSign";
import { ApprovalUnlock } from "./components/ApprovalUnlock";
import { STORAGE, type Settings } from "../shared/protocol";
import { DEFAULT_UI_LOCALE, parseUiLocale, t } from "../shared/i18n";
import type { UiHost } from "../shared/protocol";

export type ApprovalShellProps = {
  requestId: string;
  host: UiHost;
  callbacks: ApprovalShellCallbacks;
  /** When true (stacked flow under another layer), do not bind the shared shell runtime. */
  paused?: boolean;
};

function useShellTranslate(): (key: Parameters<typeof t>[1], vars?: Record<string, string>) => string {
  const localeRef = useRef(DEFAULT_UI_LOCALE);

  useEffect(() => {
    void chrome.storage.local.get(STORAGE.settings).then((data) => {
      const settings = data[STORAGE.settings] as Settings | undefined;
      localeRef.current = parseUiLocale(settings?.locale);
    });
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local" || !(STORAGE.settings in changes)) return;
      const settings = changes[STORAGE.settings].newValue as Settings | undefined;
      localeRef.current = parseUiLocale(settings?.locale);
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return useRef((key: Parameters<typeof t>[1], vars?: Record<string, string>) =>
    t(localeRef.current, key, vars),
  ).current;
}

export const ApprovalShell = memo(function ApprovalShell({
  requestId,
  host,
  callbacks,
  paused = false,
}: ApprovalShellProps): JSX.Element {
  const translate = useShellTranslate();
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const unlockSectionRef = useRef<HTMLElement>(null);
  const unlockPasswordRef = useRef<HTMLInputElement>(null);
  const unlockErrorRef = useRef<HTMLParagraphElement>(null);
  const unlockBtnRef = useRef<HTMLButtonElement>(null);

  const goneSectionRef = useRef<HTMLElement>(null);
  const goneTitleRef = useRef<HTMLHeadingElement>(null);
  const goneLeadRef = useRef<HTMLParagraphElement>(null);
  const closeExpiredRef = useRef<HTMLButtonElement>(null);

  const signShellRef = useRef<HTMLDivElement>(null);
  const signOriginRef = useRef<HTMLElement>(null);
  const signPageTitleRef = useRef<HTMLHeadingElement>(null);
  const signBodyRef = useRef<HTMLDivElement>(null);
  const signErrorRef = useRef<HTMLParagraphElement>(null);
  const signAvatarRef = useRef<HTMLElement>(null);
  const signLabelRef = useRef<HTMLElement>(null);
  const signAddrRef = useRef<HTMLElement>(null);
  const copyPkRef = useRef<HTMLButtonElement>(null);
  const copySiteRef = useRef<HTMLButtonElement>(null);
  const signRejectRef = useRef<HTMLButtonElement>(null);
  const signApproveRef = useRef<HTMLButtonElement>(null);
  const signDockRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const refs: ApprovalShellDomRefs | null = (() => {
      if (
        !unlockSectionRef.current ||
        !goneSectionRef.current ||
        !goneTitleRef.current ||
        !goneLeadRef.current ||
        !signShellRef.current ||
        !unlockPasswordRef.current ||
        !unlockErrorRef.current ||
        !unlockBtnRef.current ||
        !signOriginRef.current ||
        !signBodyRef.current ||
        !signErrorRef.current ||
        !signPageTitleRef.current ||
        !signAvatarRef.current ||
        !signLabelRef.current ||
        !signAddrRef.current ||
        !copyPkRef.current ||
        !copySiteRef.current ||
        !signRejectRef.current ||
        !signApproveRef.current ||
        !signDockRef.current ||
        !closeExpiredRef.current
      ) {
        return null;
      }
      return {
        viewUnlock: unlockSectionRef.current,
        viewGone: goneSectionRef.current,
        goneTitle: goneTitleRef.current,
        goneLead: goneLeadRef.current,
        viewSign: signShellRef.current,
        unlockPassword: unlockPasswordRef.current,
        unlockError: unlockErrorRef.current,
        btnUnlock: unlockBtnRef.current,
        signOrigin: signOriginRef.current,
        signBody: signBodyRef.current,
        signError: signErrorRef.current,
        signPageTitle: signPageTitleRef.current,
        signAvatar: signAvatarRef.current,
        signLabel: signLabelRef.current,
        signAddr: signAddrRef.current,
        btnCopyPk: copyPkRef.current,
        btnCopySite: copySiteRef.current,
        signReject: signRejectRef.current,
        signApprove: signApproveRef.current,
        signDock: signDockRef.current,
        btnCloseExpired: closeExpiredRef.current,
      };
    })();

    if (!refs || paused) return;

    const config: ApprovalShellConfig = {
      requestId,
      host,
      callbacks: {
        onClose: () => callbacksRef.current.onClose(),
        onWalletSendReject: () => callbacksRef.current.onWalletSendReject?.(),
        onWalletSendSuccessExit: () => callbacksRef.current.onWalletSendSuccessExit?.(),
      },
    };

    return bindApprovalShell(refs, config);
  }, [requestId, host, paused]);

  return (
    <div id="approval-root" className="approval-root">
      <ApprovalUnlock
        t={translate}
        refs={{
          sectionRef: unlockSectionRef,
          passwordRef: unlockPasswordRef,
          errorRef: unlockErrorRef,
          unlockBtnRef: unlockBtnRef,
        }}
      />
      <ApprovalExpired
        t={translate}
        refs={{
          sectionRef: goneSectionRef,
          titleRef: goneTitleRef,
          leadRef: goneLeadRef,
          closeBtnRef: closeExpiredRef,
        }}
      />
      <ApprovalSign t={translate} refs={{
        shellRef: signShellRef,
        originRef: signOriginRef,
        pageTitleRef: signPageTitleRef,
        bodyRef: signBodyRef,
        errorRef: signErrorRef,
        avatarRef: signAvatarRef,
        labelRef: signLabelRef,
        addrRef: signAddrRef,
        copyPkRef: copyPkRef,
        copySiteRef: copySiteRef,
        rejectRef: signRejectRef,
        approveRef: signApproveRef,
        dockRef: signDockRef,
      }} />
    </div>
  );
});
