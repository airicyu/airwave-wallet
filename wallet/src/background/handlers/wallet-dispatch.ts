import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { handleGetHomeTokens } from "../home-tokens";
import { respond } from "../messaging";
import {
  handleAddCombinedSub,
  handleAddReadOnlyAccount,
  handleBeginSend,
  handleChangeVaultPassword,
  handleCreateCombinedAccount,
  handleCreateVault,
  handleDeleteAccount,
  handleDisconnectAllOrigins,
  handleDisconnectOrigin,
  handleExportAccountSecret,
  handleGenerateAccount,
  handleGenerateSeedAccount,
  handleGetState,
  handleImportAccount,
  handleImportSeedAccount,
  handleLock,
  handlePatchSettings,
  handlePreviewSeedAccounts,
  handleRemoveCombinedSub,
  handleRenameAccount,
  handleSetActiveAccount,
  handleSetCombinedMain,
  handleUnlock,
} from "../wallet";

export async function handleWalletCommand(req: ExtensionRequest): Promise<ExtensionResponse> {
  if (req.command === "wallet.getState") return handleGetState(req);
  if (req.command === "wallet.lock") return handleLock(req);
  if (req.command === "wallet.unlock") return handleUnlock(req);
  if (req.command === "wallet.changeVaultPassword") return handleChangeVaultPassword(req);
  if (req.command === "wallet.createVault") return handleCreateVault(req);
  if (req.command === "wallet.generateSeedAccount") return handleGenerateSeedAccount(req);
  if (req.command === "wallet.generateAccount") return handleGenerateAccount(req);
  if (req.command === "wallet.importAccount") return handleImportAccount(req);
  if (req.command === "wallet.previewSeedAccounts") return handlePreviewSeedAccounts(req);
  if (req.command === "wallet.importSeedAccount") return handleImportSeedAccount(req);
  if (req.command === "wallet.setActiveAccount") return handleSetActiveAccount(req);
  if (req.command === "wallet.renameAccount") return handleRenameAccount(req);
  if (req.command === "wallet.exportAccountSecret") return handleExportAccountSecret(req);
  if (req.command === "wallet.addReadOnlyAccount") return handleAddReadOnlyAccount(req);
  if (req.command === "wallet.createCombinedAccount") return handleCreateCombinedAccount(req);
  if (req.command === "wallet.addCombinedSub") return handleAddCombinedSub(req);
  if (req.command === "wallet.removeCombinedSub") return handleRemoveCombinedSub(req);
  if (req.command === "wallet.setCombinedMain") return handleSetCombinedMain(req);
  if (req.command === "wallet.deleteAccount") return handleDeleteAccount(req);
  if (req.command === "wallet.disconnectOrigin") return handleDisconnectOrigin(req);
  if (req.command === "wallet.disconnectAllOrigins") return handleDisconnectAllOrigins(req);
  if (req.command === "wallet.beginSend") return handleBeginSend(req);
  if (req.command === "wallet.getHomeTokens") return handleGetHomeTokens(req);
  if (req.command === "storage.patchSettings") return handlePatchSettings(req);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "UNKNOWN", message: "Unknown wallet command" },
  });
}
