/**
 * Combined-account manage page: main-wallet card and member reorder sheet.
 * Does not add members or rename them (see combined-member-screens).
 */
import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import { setMemberRenamePk } from "./combined-member-screens";
import { parsePublicKeyBase58 } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { accountKind, type CombinedAccountMeta } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { AccountKindMark } from "../components/AccountKindMark";
import { CopyIconButton } from "../components/CopyPkButton";
import { IconPlus, IconRename, IconTrash } from "../components/StrokeIcon";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import type { State } from "../types";
import { localCombinedMember, useMemberSheetDrag } from "./member-sheet-drag";

export function CombinedManagePanel({
  acc,
  wallet,
  editing = true,
}: {
  acc: CombinedAccountMeta;
  wallet: State;
  editing?: boolean;
}): JSX.Element {
  const { clearError, showError, refresh, navigateTo } = usePopupContext();
  const { t, locale } = useT();
  const [order, setOrder] = useState(acc.subPubkeys);

  useEffect(() => {
    setOrder(acc.subPubkeys);
  }, [acc.subPubkeys]);

  const persist = useCallback(
    async (next: string[]) => {
      const res = await sendExtensionRequest("wallet.reorderCombinedSubs", {
        combinedId: acc.id,
        subPubkeys: next,
      });
      if (!res.ok) {
        showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
        setOrder(acc.subPubkeys);
      } else await refresh();
    },
    [acc.id, acc.subPubkeys, locale, refresh, showError],
  );

  const { dragging, dropLine, skipClickRef, startDrag } = useMemberSheetDrag("#member-sheet", order, (next) => {
    setOrder(next);
    void persist(next);
  });

  const setMain = (pk: string) => {
    if (pk === (parsePublicKeyBase58(acc.mainPubkey) ?? acc.mainPubkey)) return;
    void (async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.setCombinedMain", {
        combinedId: acc.id,
        mainPubkey: pk,
      });
      if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
      else await refresh();
    })();
  };

  const main = parsePublicKeyBase58(acc.mainPubkey) ?? acc.mainPubkey;
  const mainLocal = localCombinedMember(wallet, main);
  const mainName = mainLocal?.label ?? acc.memberNames?.[main] ?? "";

  return (
    <div className="combined-manage">
      <section className="main-wallet">
        <span className="main-wallet-label">{t("common.currentWallet")}</span>
        <div className="main-wallet-card">
          {mainName ? <div className="account-name">{mainName}</div> : null}
          <div className="account-addr-row">
            <span className="addr">{shortAddr(main)}</span>
            <CopyIconButton text={main} idleLabel={t("accounts.copyAddress")} />
          </div>
        </div>
      </section>
      <section className={`member-sheet${dragging ? " is-reordering" : ""}`} id="member-sheet">
        <div className="member-sheet-head">
          <h3>{t("accounts.members")}</h3>
          {editing ? (
          <button
            type="button"
            className="icon-btn accent-fill"
            title={t("common.add")}
            aria-label={t("common.add")}
            onClick={() => navigateTo("account-manage-add")}
          >
            <IconPlus size={18} />
          </button>
          ) : null}
        </div>
        {order.map((pk) => {
          const local = localCombinedMember(wallet, pk);
          const name = local?.label ?? acc.memberNames?.[pk] ?? "";
          const signing = local != null && accountKind(local) === "signing";
          const edge = dropLine?.pk === pk ? dropLine.edge : null;
          return (
            <div
              key={pk}
              className={`member-line${dragging === pk ? " is-dragging" : ""}`}
              data-pk={pk}
              onPointerDown={(ev) => startDrag(pk, ev)}
              onClick={(ev) => {
                if (skipClickRef.current) {
                  skipClickRef.current = false;
                  return;
                }
                const hit = ev.target as HTMLElement;
                if (hit.closest("button, .account-grip")) return;
                setMain(pk);
              }}
            >
              {edge === "before" ? <div className="account-drop-line" /> : null}
              <span className="account-grip" aria-hidden="true" />
              <button
                type="button"
                className={`main-pick${pk === main ? " on" : ""}`}
                aria-pressed={pk === main}
                aria-label={t("common.setAsCurrentWallet")}
                onClick={() => setMain(pk)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden="true">
                  <path d="M5 12.5l4.2 4.2L19 7" />
                </svg>
              </button>
              <span className="member-kind-slot">
                {signing ? <AccountKindMark kind="signing" size={16} label={t("accounts.kindSigning")} /> : null}
              </span>
              <div className="member-copy">
                <div className="account-name">{name}</div>
                <div className="account-addr-row">
                  <span className="addr">{shortAddr(pk)}</span>
                  <CopyIconButton text={pk} idleLabel={t("accounts.copyAddress")} />
                </div>
              </div>
              {editing && !local ? (
                <button
                  type="button"
                  className="icon-btn member-rename"
                  title={t("accounts.renameAccount")}
                  aria-label={t("accounts.renameAccount")}
                  onClick={() => {
                    setMemberRenamePk(pk);
                    navigateTo("account-member-rename");
                  }}
                >
                  <IconRename />
                </button>
              ) : null}
              {editing ? (
              <button
                type="button"
                className="icon-btn trash-solid"
                title={t("common.delete")}
                aria-label={t("common.delete")}
                disabled={order.length <= 1}
                onClick={() => {
                  void (async () => {
                    clearError();
                    if (!confirm(t("accounts.removeMemberConfirm"))) return;
                    const res = await sendExtensionRequest("wallet.removeCombinedSub", {
                      combinedId: acc.id,
                      publicKeyBase58: pk,
                    });
                    if (!res.ok) showError(apiErrorMessage(locale, res.error, "error.genericFailed"));
                    else await refresh();
                  })();
                }}
              >
                <IconTrash />
              </button>
              ) : null}
              {edge === "after" ? <div className="account-drop-line" /> : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export function CombinedSwitchScreen({ wallet }: { wallet: State }): JSX.Element {
  const { focusAccountId } = usePopupContext();
  const { t } = useT();
  const acc = wallet.accounts.find((a) => a.id === focusAccountId);
  if (!acc || !("subPubkeys" in acc)) return <p className="muted">{t("error.accountNotFound")}</p>;
  return <CombinedManagePanel acc={acc} wallet={wallet} editing={false} />;
}
