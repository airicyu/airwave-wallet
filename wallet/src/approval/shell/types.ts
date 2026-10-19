import type { UiHost } from "../../shared/commands";

export type ApprovalShellCallbacks = {
  onClose: () => void;
  onWalletSendReject?: () => void;
  onWalletSendSuccessExit?: () => void;
};

export type ApprovalShellConfig = {
  requestId: string;
  host: UiHost;
  callbacks: ApprovalShellCallbacks;
};

/** DOM nodes the approval shell runtime wires; owned by the React shell root. */
export type ApprovalShellDomRefs = {
  viewUnlock: HTMLElement;
  viewGone: HTMLElement;
  goneTitle: HTMLElement;
  goneLead: HTMLElement;
  viewSign: HTMLElement;
  unlockPassword: HTMLInputElement;
  unlockError: HTMLElement;
  btnUnlock: HTMLElement;
  signOrigin: HTMLElement;
  signBody: HTMLElement;
  signError: HTMLElement;
  signPageTitle: HTMLElement;
  signAvatar: HTMLElement;
  signLabel: HTMLElement;
  signAddr: HTMLElement;
  btnCopyPk: HTMLElement;
  btnCopySite: HTMLButtonElement | null;
  signReject: HTMLButtonElement;
  signApprove: HTMLButtonElement;
  signDock: HTMLElement;
  btnCloseExpired: HTMLElement;
};
