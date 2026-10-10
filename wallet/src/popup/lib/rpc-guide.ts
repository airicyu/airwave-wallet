import { isMainnetRpcReady } from "../../shared/storage-keys";
import type { State, View } from "../types";

export function shouldShowRpcGuide(state: State): boolean {
  return state.settings.rpcGuideDismissed !== true && !isMainnetRpcReady(state.settings.rpcByCluster.mainnet);
}

export function viewAfterAccountCreated(prevCount: number, state: State, fallback: View): View {
  if (prevCount === 0 && state.accounts.length >= 1 && shouldShowRpcGuide(state)) return "rpc-guide";
  return fallback;
}
