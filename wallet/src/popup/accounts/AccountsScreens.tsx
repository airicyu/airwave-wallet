import type { JSX } from "react";
import {
  getExposedPublicKey,
  isCombinedAccount,
  isSigningOrWatch,
  parsePublicKeyBase58,
} from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/ext-api";
import type { CombinedAccountMeta } from "../../shared/storage-keys";
import { accountKind, type AccountMeta } from "../../shared/storage-keys";
import { IconCopy, IconEye, IconKebab, IconPlus, IconRename, IconTrash, IconX } from "../components/StrokeIcon";
import { addCombinedDraftParts, validCombinedMembers } from "./combined-logic";
import { WalletPasswordInput } from "../components/WalletPasswordInput";
import { bumpUi, clearError, navigateTo, refresh, session, showError } from "../lib/session";
import { shortAddr } from "../lib/format";
import type { State } from "../types";

export function AccountsList({ wallet }: { wallet: State }): JSX.Element {
  return (
    <>
      <div className="subpage-head compact">
        <h2>Accounts</h2>
        <button
          type="button"
          className="icon-btn primary"
          id="btn-go-add-account"
          title="Add account"
          aria-label="Add account"
          onClick={() => navigateTo("add-account")}
        >
          <IconPlus size={18} />
        </button>
      </div>
      <div id="accounts-list">
        {wallet.accounts.map((a) => (
          <AccountCard key={a.id} account={a} wallet={wallet} />
        ))}
      </div>
    </>
  );
}

function AccountCard({ account: a, wallet }: { account: AccountMeta; wallet: State }): JSX.Element {
  return (
    <div className={`account-card${a.id === wallet.activeAccountId ? " active" : ""}`}>
      <div
        className="account-card-main"
        onClick={async () => {
          clearError();
          const res = await sendExtensionRequest("wallet.setActiveAccount", { accountId: a.id });
          if (!res.ok) showError(res.error?.message ?? "切換失敗");
          else {
            await refresh();
            navigateTo("home-token");
          }
        }}
      >
        <div className="account-title-row">
          <span className="account-name">{a.label}</span>
          <button
            type="button"
            className="icon-btn ghost-inline"
            title="Rename account"
            aria-label="Rename account"
            onClick={(ev) => {
              ev.stopPropagation();
              session.renameLabel = a.label;
              navigateTo("account-rename", a.id);
            }}
          >
            <IconRename />
          </button>
          {a.id === wallet.activeAccountId ? (
            <span className="badge" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              Active
            </span>
          ) : null}
          {isCombinedAccount(a) ? <span className="badge">Combined</span> : null}
          {accountKind(a) === "readOnly" ? <span className="badge">Read-only</span> : null}
        </div>
        <div className="account-addr-row">
          <span className="addr">{shortAddr(getExposedPublicKey(a))}</span>
          <button
            type="button"
            className="icon-btn ghost-inline"
            title="Copy address"
            aria-label="Copy address"
            onClick={(ev) => {
              ev.stopPropagation();
              void navigator.clipboard.writeText(getExposedPublicKey(a));
            }}
          >
            <IconCopy />
          </button>
        </div>
      </div>
      <button
        type="button"
        className="icon-btn"
        title="Manage account"
        aria-label="Manage account"
        onClick={() => navigateTo("account-manage", a.id)}
      >
        <IconKebab />
      </button>
    </div>
  );
}

export function RenameScreen({ wallet }: { wallet: State }): JSX.Element {
  const acc = wallet.accounts.find((a) => a.id === session.focusAccountId);
  return (
    <>
      <p id="rename-addr-hint" className="muted addr-hint">
        {acc ? shortAddr(getExposedPublicKey(acc)) : ""}
      </p>
      <div className="field">
        <label htmlFor="rename-label">Account name</label>
        <input
          id="rename-label"
          type="text"
          placeholder="新名稱"
          value={session.renameLabel}
          onChange={(e) => {
            session.renameLabel = e.target.value;
            bumpUi();
          }}
        />
      </div>
      <button
        type="button"
        className="block-btn primary"
        id="btn-rename"
        onClick={async () => {
          clearError();
          if (!session.focusAccountId) return;
          const res = await sendExtensionRequest("wallet.renameAccount", {
            accountId: session.focusAccountId,
            label: session.renameLabel,
          });
          if (!res.ok) showError(res.error?.message ?? "重新命名失敗");
          else {
            await refresh();
            navigateTo("accounts");
          }
        }}
      >
        儲存名稱
      </button>
    </>
  );
}

export function ManageScreen({ wallet }: { wallet: State }): JSX.Element {
  const acc = wallet.accounts.find((a) => a.id === session.focusAccountId);
  if (!acc) return <p className="muted">找不到帳戶</p>;
  const combined = isCombinedAccount(acc);
  const ro = !combined && accountKind(acc) === "readOnly";
  return (
    <>
      <p id="manage-name" className="manage-name">
        {acc.label}
      </p>
      <p id="manage-addr" className="manage-addr">
        {combined
          ? `${acc.subPubkeys.length} 個成員地址`
          : isSigningOrWatch(acc)
            ? acc.publicKeyBase58
            : ""}
      </p>
      <p id="manage-readOnly-badge" className="badge" hidden={!ro}>
        Read-only
      </p>
      <p id="manage-combined-badge" className="badge" hidden={!combined}>
        Combined
      </p>
      {combined ? <CombinedManagePanel acc={acc} wallet={wallet} /> : null}
      <div className="manage-actions">
        <button
          type="button"
          className="manage-action-row neutral"
          id="btn-go-reveal"
          hidden={combined || ro || !wallet.unlocked}
          onClick={() => navigateTo("account-reveal-key")}
        >
          <span>Reveal private key</span>
        </button>
        <button
          type="button"
          className="manage-action-row danger"
          id="btn-delete"
          onClick={async () => {
            clearError();
            if (!session.focusAccountId) return;
            if (!confirm("確定移除此錢包帳戶？")) return;
            const res = await sendExtensionRequest("wallet.deleteAccount", { accountId: session.focusAccountId });
            if (!res.ok) showError(res.error?.message ?? "刪除失敗");
            else {
              session.focusAccountId = null;
              await refresh();
              navigateTo("accounts");
            }
          }}
        >
          Remove wallet account
        </button>
      </div>
    </>
  );
}

function CombinedManagePanel({
  acc,
  wallet,
}: {
  acc: CombinedAccountMeta;
  wallet: State;
}): JSX.Element {
  const inCombined = new Set(acc.subPubkeys.map((pk) => parsePublicKeyBase58(pk) ?? pk));
  return (
    <div id="manage-combined-panel">
      <p className="muted small">目前錢包地址</p>
      <p id="manage-combined-main" className="manage-addr">
        {shortAddr(acc.mainPubkey)}
      </p>
      <p className="sec-head">本機帳戶</p>
      <div id="manage-combined-pick-list" className="combined-pick-list">
        {wallet.accounts.filter(isSigningOrWatch).map((a) => {
          const pk = parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58;
          const already = inCombined.has(pk);
          return (
            <label key={a.id} className="combined-pick-row">
              <input
                type="checkbox"
                checked={already}
                disabled={already && acc.subPubkeys.length <= 1}
                onChange={async (e) => {
                  clearError();
                  const res = e.target.checked
                    ? await sendExtensionRequest("wallet.addCombinedSub", {
                        combinedId: acc.id,
                        publicKeyBase58: a.publicKeyBase58,
                      })
                    : await sendExtensionRequest("wallet.removeCombinedSub", {
                        combinedId: acc.id,
                        publicKeyBase58: a.publicKeyBase58,
                      });
                  if (!res.ok) showError(res.error?.message ?? (e.target.checked ? "加入失敗" : "移除失敗"));
                  else await refresh();
                }}
              />
              <span className="pick-name">{a.label}</span>
              <span className="pick-addr">{shortAddr(a.publicKeyBase58)}</span>
            </label>
          );
        })}
      </div>
      <div className="field">
        <label htmlFor="manage-add-sub-pk">地址</label>
        <div className="add-line">
          <input
            id="manage-add-sub-pk"
            type="text"
            spellCheck={false}
            placeholder="地址，或貼上"
            autoComplete="off"
            value={session.manageAddSubPk}
            onChange={(e) => {
              session.manageAddSubPk = e.target.value;
              bumpUi();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitManagePaste();
              }
            }}
          />
          <button
            type="button"
            className="icon-btn sm-inline"
            id="btn-combined-add-sub"
            title="加入"
            aria-label="加入"
            onClick={() => void submitManagePaste()}
          >
            <IconPlus size={14} />
          </button>
        </div>
      </div>
      <ul id="manage-combined-subs" className="combined-subs-list">
        {acc.subPubkeys.map((pk) => {
          const isMain = pk === acc.mainPubkey;
          return (
            <li key={pk} className="combined-sub-row">
              {`${shortAddr(pk)}${isMain ? " · 目前錢包" : ""}`}
              <div className="combined-sub-actions">
                {!isMain ? (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={async () => {
                      clearError();
                      const res = await sendExtensionRequest("wallet.setCombinedMain", {
                        combinedId: acc.id,
                        mainPubkey: pk,
                      });
                      if (!res.ok) showError(res.error?.message ?? "切換失敗");
                      else await refresh();
                    }}
                  >
                    設為目前錢包
                  </button>
                ) : null}
                <button
                  type="button"
                  className="icon-btn sm-inline ghost-inline"
                  title="刪除"
                  aria-label="刪除"
                  disabled={acc.subPubkeys.length <= 1}
                  onClick={async () => {
                    clearError();
                    const res = await sendExtensionRequest("wallet.removeCombinedSub", {
                      combinedId: acc.id,
                      publicKeyBase58: pk,
                    });
                    if (!res.ok) showError(res.error?.message ?? "移除失敗");
                    else await refresh();
                  }}
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

async function submitManagePaste(): Promise<void> {
  clearError();
  if (!session.focusAccountId) return;
  const publicKeyBase58 = session.manageAddSubPk.trim();
  if (!publicKeyBase58) return;
  const res = await sendExtensionRequest("wallet.addCombinedSub", {
    combinedId: session.focusAccountId,
    publicKeyBase58,
  });
  if (!res.ok) showError(res.error?.message ?? "加入失敗");
  else {
    session.manageAddSubPk = "";
    await refresh();
  }
}

export function RevealScreen({ wallet }: { wallet: State }): JSX.Element {
  const acc = wallet.accounts.find((a) => a.id === session.focusAccountId);
  const revealed = session.revealedSecretInMemory;
  return (
    <>
      <p id="reveal-hint" className="muted">
        {acc && isSigningOrWatch(acc) ? `${acc.label} · ${shortAddr(acc.publicKeyBase58)}` : ""}
      </p>
      <div id="reveal-mask-block" hidden={!!revealed}>
        <div className="secret-card">
          <div className="secret-mask">••••••••••••••••</div>
        </div>
        <div className="field">
          <label htmlFor="reveal-password">錢包密碼</label>
          <WalletPasswordInput
            id="reveal-password"
            value={session.revealPassword}
            onChange={(v) => {
              session.revealPassword = v;
              bumpUi();
            }}
          />
        </div>
        <button
          type="button"
          className="icon-btn primary"
          id="btn-reveal-submit"
          title="Reveal private key"
          aria-label="Reveal private key"
          onClick={async () => {
            clearError();
            if (!session.focusAccountId) return;
            const res = await sendExtensionRequest("wallet.exportAccountSecret", {
              accountId: session.focusAccountId,
              password: session.revealPassword,
            });
            if (!res.ok) {
              showError(res.error?.message ?? "無法匯出");
              return;
            }
            const { secretBase58 } = res.result as { secretBase58: string };
            session.revealedSecretInMemory = secretBase58;
            session.revealPassword = "";
            bumpUi();
          }}
        >
          <IconEye size={18} />
        </button>
      </div>
      <div id="reveal-secret-block" hidden={!revealed}>
        <div className="secret-card">
          <div className="secret-value-row">
            <div className="secret-value" id="reveal-secret-text">
              {revealed ?? ""}
            </div>
            <button
              type="button"
              className="icon-btn primary ghost-inline"
              id="btn-copy-secret"
              title="Copy private key"
              aria-label="Copy private key"
              onClick={() => {
                if (session.revealedSecretInMemory) {
                  void navigator.clipboard.writeText(session.revealedSecretInMemory);
                }
              }}
            >
              <IconCopy size={18} />
            </button>
          </div>
        </div>
        <p className="muted small">請勿分享或截圖保存私鑰。</p>
      </div>
    </>
  );
}

export function ConnectedSites({ wallet }: { wallet: State }): JSX.Element {
  return (
    <>
      <ul id="connected-list" className="connected-list">
        {wallet.connections.map((c) => (
          <li key={c.origin} className="connected-row">
            <span>{c.origin}</span>
            <button
              type="button"
              className="icon-btn"
              title="Disconnect"
              aria-label="Disconnect"
              onClick={async () => {
                clearError();
                const res = await sendExtensionRequest("wallet.disconnectOrigin", { origin: c.origin });
                if (!res.ok) showError(res.error?.message ?? "斷開失敗");
                else await refresh();
              }}
            >
              <IconX />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="block-btn"
        id="btn-disconnect-all"
        onClick={async () => {
          clearError();
          const res = await sendExtensionRequest("wallet.disconnectAllOrigins");
          if (!res.ok) showError(res.error?.message ?? "斷開失敗");
          else await refresh();
        }}
      >
        全部斷開
      </button>
    </>
  );
}

export function CombinedCreateScreen({ wallet }: { wallet: State }): JSX.Element {
  const valid = validCombinedMembers();
  const currentMain =
    session.combinedCreate.currentMain && valid.includes(session.combinedCreate.currentMain)
      ? session.combinedCreate.currentMain
      : (valid[0] ?? "");
  return (
    <>
      <div className="field">
        <label htmlFor="combined-label">名稱</label>
        <input
          id="combined-label"
          type="text"
          placeholder="選填"
          autoComplete="off"
          value={session.combinedLabel}
          onChange={(e) => {
            session.combinedLabel = e.target.value;
            bumpUi();
          }}
        />
      </div>
      <div className="field">
        <label className="field-label">成員</label>
        <div id="combined-chip-list" className="chip-list">
          {session.combinedCreate.draftChips.map((pk, i) => (
            <span key={`${pk}-${i}`} className={`addr-chip${pk === currentMain ? " main" : ""}`}>
              <button
                type="button"
                className="chip-pick"
                title={pk}
                onClick={() => {
                  if (parsePublicKeyBase58(pk)) session.combinedCreate.currentMain = pk;
                  bumpUi();
                }}
              >
                {shortAddr(pk)}
              </button>
              {pk === currentMain ? <span className="addr-tag">目前</span> : null}
              <button
                type="button"
                className="icon-btn sm-inline ghost-inline"
                title="刪除"
                aria-label="刪除"
                onClick={() => {
                  session.combinedCreate.draftChips.splice(i, 1);
                  bumpUi();
                }}
              >
                <StrokeX />
              </button>
            </span>
          ))}
        </div>
        <div className="add-line">
          <input
            id="combined-draft"
            type="text"
            spellCheck={false}
            placeholder="地址，或貼上多行"
            autoComplete="off"
            value={session.combinedDraft}
            onChange={(e) => {
              session.combinedDraft = e.target.value;
              bumpUi();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCombinedDraftParts(session.combinedDraft);
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (/[\n,]/.test(text)) {
                e.preventDefault();
                addCombinedDraftParts(text);
              }
            }}
          />
          <button
            type="button"
            className="icon-btn sm-inline"
            id="btn-combined-add-chip"
            title="加入"
            aria-label="加入"
            onClick={() => addCombinedDraftParts(session.combinedDraft)}
          >
            <IconPlus size={14} />
          </button>
        </div>
      </div>
      <p className="sec-head">本機帳戶</p>
      <div id="combined-pick-list" className="combined-pick-list">
        {wallet.accounts.filter(isSigningOrWatch).map((a) => (
          <label key={a.id} className="combined-pick-row">
            <input
              type="checkbox"
              checked={session.combinedCreate.pickedPks.has(a.publicKeyBase58)}
              onChange={(e) => {
                if (e.target.checked) session.combinedCreate.pickedPks.add(a.publicKeyBase58);
                else session.combinedCreate.pickedPks.delete(a.publicKeyBase58);
                bumpUi();
              }}
            />
            <span className="pick-name">{a.label}</span>
            <span className="pick-addr">{shortAddr(a.publicKeyBase58)}</span>
          </label>
        ))}
      </div>
      <div id="combined-member-rows">
        {valid.map((pk) => (
          <div key={pk} className="combined-member-row">
            <span className="mono">{shortAddr(pk)}</span>
            {pk === currentMain ? <span className="addr-tag">目前錢包</span> : null}
          </div>
        ))}
      </div>
      <p id="combined-err" className="inline-err" aria-live="polite">
        {session.combinedErr}
      </p>
    </>
  );
}

function StrokeX(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}
