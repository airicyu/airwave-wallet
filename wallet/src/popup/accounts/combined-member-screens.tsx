/**
 * Add-member choice, paste, local pick, and member rename for a combined account.
 * Does not reorder members (see CombinedManage).
 */
import { useState } from "react";
import type { JSX } from "react";
import { ACCOUNT_LABEL_MAX } from "../../shared/accounts";
import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { State } from "../types";

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

export function CombinedPasteScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [value, setValue] = useState("");
  useRegisterDock({
    label: t("common.confirm"),
    disabled: !parsePublicKeyBase58(value.trim()),
    onPrimary: async () => {
      if (!focusAccountId) return;
      const res = await sendExtensionRequest("wallet.addCombinedSub", {
        combinedId: focusAccountId,
        publicKeyBase58: value.trim(),
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.addFailed"));
      else {
        await refresh();
        navigateTo("account-manage");
      }
    },
  });
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  return (
    <div className="field">
      <label htmlFor="member-paste">{t("common.address")}</label>
      <input
        id="member-paste"
        className="mono"
        value={value}
        spellCheck={false}
        onChange={(e) => setValue(e.target.value)}
      />
      {acc ? null : <p className="muted">{t("error.accountNotFound")}</p>}
    </div>
  );
}

export function CombinedLocalScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId, showError, refresh } = usePopupContext();
  const { t, locale } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  const members = new Set(
    acc && "subPubkeys" in acc ? acc.subPubkeys.map((pk) => parsePublicKeyBase58(pk) ?? pk) : [],
  );
  const locals = wallet.accounts.filter(isSigningOrWatch);
  return (
    <div className="pick-list">
      {locals.map((a) => {
        const pk = parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58;
        const inSet = members.has(pk);
        return (
          <button
            key={a.id}
            type="button"
            className="manage-action-row neutral"
            disabled={inSet}
            onClick={() => {
              void (async () => {
                if (!focusAccountId || inSet) return;
                const res = await sendExtensionRequest("wallet.addCombinedSub", {
                  combinedId: focusAccountId,
                  publicKeyBase58: a.publicKeyBase58,
                });
                if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.addFailed"));
                else await refresh();
              })();
            }}
          >
            <span>
              {a.label} · {shortAddr(pk)}
              {inSet ? ` · ${t("accounts.alreadyIn")}` : ""}
            </span>
          </button>
        );
      })}
    </div>
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
        navigateTo("account-manage");
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
