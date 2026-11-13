/**
 * Add-member choice, multi-address paste, local pick, and member rename for a combined account.
 * Local and paste rows stay staged until Confirm calls wallet.addCombinedSub for each new key.
 * Does not reorder members (see CombinedManage).
 */
import { useState } from "react";
import type { JSX } from "react";
import { ACCOUNT_LABEL_MAX } from "../../../shared/accounts";
import { isSigningOrWatch, parsePublicKeyBase58 } from "../../../shared/accounts";
import { sendExtensionRequest } from "../../../shared/protocol";
import { apiErrorMessage } from "../../../shared/i18n";
import { shortAddr } from "../../lib/format";
import { usePopupContext } from "../../state/PopupContext";
import { useRegisterDock } from "../../state/dock";
import { useT } from "../../state/useT";
import type { State } from "../../types";
import { keysFromPaste } from "./combined-logic";

let memberRenamePk = "";

export function setMemberRenamePk(pk: string): void {
  memberRenamePk = pk;
}

export function CombinedAddChoice(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <div className="manage-actions">
      <button type="button" className="manage-action-row neutral" onClick={() => navigateTo("account-manage-paste")}>
        <span>{t("common.address")}</span>
      </button>
      <button type="button" className="manage-action-row neutral" onClick={() => navigateTo("account-manage-local")}>
        <span>{t("common.localAccounts")}</span>
      </button>
    </div>
  );
}

async function addSubs(
  combinedId: string,
  keys: string[],
  locale: Parameters<typeof apiErrorMessage>[0],
  showError: (msg: string) => void,
): Promise<boolean> {
  for (const publicKeyBase58 of keys) {
    const res = await sendExtensionRequest("wallet.addCombinedSub", {
      combinedId,
      publicKeyBase58,
    });
    if (!res.ok) {
      showError(apiErrorMessage(locale, res.error, "error.addFailed"));
      return false;
    }
  }
  return true;
}

export function CombinedPasteScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [value, setValue] = useState("");
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const members =
    acc && "subPubkeys" in acc ? acc.subPubkeys.map((pk) => parsePublicKeyBase58(pk) ?? pk) : [];
  const adding = keysFromPaste(value, members);
  useRegisterDock({
    label: t("common.confirm"),
    disabled: adding.length === 0,
    onPrimary: async () => {
      if (!focusAccountId) return;
      const ok = await addSubs(focusAccountId, adding, locale, showError);
      await refresh();
      if (ok) navigateTo("account-combined-manage");
    },
  });
  return (
    <div className="field">
      <label htmlFor="member-paste">{t("common.address")}</label>
      <textarea
        id="member-paste"
        className="mono combined-paste"
        rows={6}
        value={value}
        spellCheck={false}
        placeholder={t("onboarding.pasteMulti")}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
      />
      {acc ? null : <p className="muted">{t("error.accountNotFound")}</p>}
    </div>
  );
}

export function CombinedLocalScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [picked, setPicked] = useState<string[]>([]);
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const members = new Set(
    acc && "subPubkeys" in acc ? acc.subPubkeys.map((pk) => parsePublicKeyBase58(pk) ?? pk) : [],
  );
  const locals = wallet.accounts.filter(isSigningOrWatch);
  useRegisterDock({
    label: t("common.confirm"),
    disabled: picked.length === 0,
    onPrimary: async () => {
      if (!focusAccountId) return;
      const ok = await addSubs(focusAccountId, picked, locale, showError);
      await refresh();
      if (ok) navigateTo("account-combined-manage");
    },
  });
  return (
    <>
      <p className="combined-pick-hint">{t("accounts.pickLocalToAdd")}</p>
      <div className="combined-pick-list">
        {locals.map((a) => {
          const pk = parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58;
          const inSet = members.has(pk);
          const on = picked.includes(pk);
          return (
            <label key={a.id} className={`combined-pick-row${on ? " on" : ""}`}>
              <input
                type="checkbox"
                checked={on}
                disabled={inSet}
                onChange={() => {
                  if (inSet) return;
                  setPicked((prev) => (prev.includes(pk) ? prev.filter((item) => item !== pk) : [...prev, pk]));
                }}
              />
              <span className="pick-name">
                {a.label}
                {inSet ? ` · ${t("accounts.alreadyIn")}` : ""}
              </span>
              <span className="pick-addr">{shortAddr(pk)}</span>
            </label>
          );
        })}
      </div>
    </>
  );
}

export function MemberRenameScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const pk = memberRenamePk;
  const stored =
    acc && "memberNames" in acc ? acc.memberNames?.[pk] ?? "" : "";
  const [name, setName] = useState(stored);
  useRegisterDock({
    label: t("common.confirm"),
    disabled: false,
    onPrimary: async () => {
      if (!focusAccountId || !pk) return;
      const res = await sendExtensionRequest("wallet.setCombinedMemberName", {
        combinedId: focusAccountId,
        publicKeyBase58: pk,
        name,
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.renameFailed"));
      else {
        await refresh();
        navigateTo("account-combined-manage");
      }
    },
  });
  return (
    <>
      <p className="muted addr-hint">{shortAddr(pk)}</p>
      <div className="field">
        <label htmlFor="member-name">{t("common.name")}</label>
        <input
          id="member-name"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </>
  );
}
