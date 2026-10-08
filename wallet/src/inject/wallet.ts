/**
 * Wallet Standard Solana provider in the page, delegating connect and signing to the extension bridge.
 * Does not access extension APIs or hold decrypted private keys in the page.
 */
import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardDisconnect,
  type StandardDisconnectFeature,
  StandardEvents,
  type StandardEventsFeature,
} from "@wallet-standard/features";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import bs58 from "bs58";
import { bridgeRequest } from "./bridge-client";

const AIRWAVE_CHAINS = ["solana:mainnet", "solana:devnet"] as const;

let currentPublicKeyBase58: string | null = null;
let currentPublicKeyBytes: Uint8Array | null = null;
let currentCluster: "devnet" | "mainnet" = "devnet";
const listeners = new Set<(e: { accounts: readonly WalletAccount[] }) => void>();

function activeChain(): (typeof AIRWAVE_CHAINS)[number] {
  return currentCluster === "mainnet" ? "solana:mainnet" : "solana:devnet";
}

function applyCluster(cluster: unknown): void {
  if (cluster === "mainnet" || cluster === "devnet") currentCluster = cluster;
}

function parsePublicKeyBase58(raw: string): { base58: string; bytes: Uint8Array } | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  try {
    const bytes = bs58.decode(trimmed);
    if (bytes.length !== 32) return null;
    return { base58: trimmed, bytes };
  } catch {
    return null;
  }
}

function setCurrentPublicKey(base58: string | null): void {
  if (!base58) {
    currentPublicKeyBase58 = null;
    currentPublicKeyBytes = null;
    return;
  }
  const parsed = parsePublicKeyBase58(base58);
  if (!parsed) {
    currentPublicKeyBase58 = null;
    currentPublicKeyBytes = null;
    return;
  }
  currentPublicKeyBase58 = parsed.base58;
  currentPublicKeyBytes = parsed.bytes;
}

function accountFromPublicKey(): WalletAccount {
  return {
    address: currentPublicKeyBase58!,
    publicKey: currentPublicKeyBytes!,
    chains: [activeChain()],
    features: [SolanaSignMessage, SolanaSignTransaction, SolanaSignAndSendTransaction],
  };
}

function emitChange(): void {
  const accounts = currentPublicKeyBase58 ? [accountFromPublicKey()] : [];
  for (const fn of listeners) fn({ accounts });
}

window.addEventListener("airwave-account-changed", ((ev: CustomEvent) => {
  const pk = ev.detail.publicKeyBase58 as string;
  applyCluster(ev.detail.cluster);
  setCurrentPublicKey(pk);
  emitChange();
}) as EventListener);

window.addEventListener("airwave-disconnected", () => {
  setCurrentPublicKey(null);
  emitChange();
});

export const airwaveWallet: Wallet = {
  version: "1.0.0",
  name: "Airwave",
  icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  chains: [...AIRWAVE_CHAINS],
  get accounts(): readonly WalletAccount[] {
    return currentPublicKeyBase58 ? [accountFromPublicKey()] : [];
  },
  features: {
    [StandardConnect]: {
      version: "1.0.0",
      connect: async (input) => {
        const result = (await bridgeRequest("dapp.connect", {
          silent: input?.silent === true,
        })) as {
          publicKey: string;
          cluster?: "devnet" | "mainnet";
        };
        const prevPk = currentPublicKeyBase58;
        const prevCluster = currentCluster;
        applyCluster(result.cluster);
        setCurrentPublicKey(result.publicKey);
        const nextPk = currentPublicKeyBase58;
        if (prevPk !== nextPk || prevCluster !== currentCluster) emitChange();
        return { accounts: currentPublicKeyBase58 ? [accountFromPublicKey()] : [] };
      },
    } satisfies StandardConnectFeature[typeof StandardConnect],
    [StandardDisconnect]: {
      version: "1.0.0",
      disconnect: async () => {
        await bridgeRequest("dapp.disconnect", {});
        setCurrentPublicKey(null);
        emitChange();
      },
    } satisfies StandardDisconnectFeature[typeof StandardDisconnect],
    [StandardEvents]: {
      version: "1.0.0",
      on: (event, listener) => {
        if (event === "change") {
          listeners.add(listener as (e: { accounts: readonly WalletAccount[] }) => void);
          return () =>
            listeners.delete(listener as (e: { accounts: readonly WalletAccount[] }) => void);
        }
        return () => {};
      },
    } satisfies StandardEventsFeature[typeof StandardEvents],
    [SolanaSignMessage]: {
      version: "1.0.0",
      signMessage: async (...inputs) => {
        const outputs = [];
        for (const input of inputs) {
          const result = (await bridgeRequest("dapp.signMessage", {
            message: Array.from(input.message),
          })) as { signature: number[] };
          outputs.push({
            signedMessage: input.message,
            signature: Uint8Array.from(result.signature),
          });
        }
        return outputs;
      },
    } satisfies SolanaSignMessageFeature[typeof SolanaSignMessage],
    [SolanaSignTransaction]: {
      version: "1.0.0",
      supportedTransactionVersions: [0, "legacy"] as const,
      signTransaction: async (...inputs) => {
        const outputs = [];
        for (const input of inputs) {
          const result = (await bridgeRequest("dapp.signTransaction", {
            transaction: Array.from(input.transaction),
          })) as { signedTransaction: number[] };
          outputs.push({
            signedTransaction: Uint8Array.from(result.signedTransaction),
          });
        }
        return outputs;
      },
    } satisfies SolanaSignTransactionFeature[typeof SolanaSignTransaction],
    [SolanaSignAndSendTransaction]: {
      version: "1.0.0",
      supportedTransactionVersions: [0, "legacy"] as const,
      signAndSendTransaction: async (...inputs) => {
        const outputs = [];
        for (const input of inputs) {
          const result = (await bridgeRequest("dapp.signAndSendTransaction", {
            transaction: Array.from(input.transaction),
            chain: input.chain,
          })) as { signature: number[] };
          outputs.push({
            signature: Uint8Array.from(result.signature),
          });
        }
        return outputs;
      },
    } satisfies SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction],
  },
};
