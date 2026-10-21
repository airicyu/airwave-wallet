/**
 * Add-member choice, multi-address paste, and local pick for a combined draft.
 * Does not call wallet.addCombinedSub. The draft is created on the create page.
 */
import { useState } from "react";
import type { JSX } from "react";
import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import type { State } from "../types";
import { appendCombinedMembers, keysFromPaste, useCombinedDraft } from "./combined-logic";

export function CombinedCreateAddChoice(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <div className="manage-actions">
      <button type="button" className="manage-action-row neutral" onClick={() => navigateTo("add-combined-paste")}>
        <span>{t("common.address")}</span>
      </button>
      <button type="button" className="manage-action-row neutral" onClick={() => navigateTo("add-combined-local")}>
        <span>{t("common.localAccounts")}</span>
      </button>
    </div>
  );
}

export function CombinedCreatePasteScreen(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  const draft = useCombinedDraft();
  const [value, setValue] = useState("");
  const adding = keysFromPaste(value, draft.members);
  useRegisterDock({
    label: t("common.confirm"),
    disabled: adding.length === 0,
    onPrimary: () => {
      appendCombinedMembers(value);
      navigateTo("add-combined");
    },
  });
  return (
    <div className="field">
      <label htmlFor="combined-create-paste">{t("common.address")}</label>
      <input
        id="combined-create-paste"
        className="mono"
        value={value}
        spellCheck={false}
        placeholder={t("onboarding.pasteMulti")}
        autoComplete="off"
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export function CombinedCreateLocalScreen({ wallet }: { wallet: State }): JSX.Element {
  const { t } = useT();
  const draft = useCombinedDraft();
  const locals = wallet.accounts.filter(isSigningOrWatch);
  return (
    <div className="pick-list">
      {locals.map((a) => {
        const pk = parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58;
        const inSet = draft.members.includes(pk);
        return (
          <button
            key={a.id}
            type="button"
            className="manage-action-row neutral"
            disabled={inSet}
            onClick={() => {
              if (!inSet) appendCombinedMembers(a.publicKeyBase58);
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
