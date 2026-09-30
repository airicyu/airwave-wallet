import {
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardEvents,
  type StandardEventsFeature,
} from "@wallet-standard/features";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { bridgeRequest } from "./bridge-client";
import { PublicKey } from "@solana/web3.js";

const AIRWAVE_CHAINS = ["solana:mainnet", "solana:devnet"] as const;

let currentPublicKey: PublicKey | null = null;
let currentCluster: "devnet" | "mainnet" = "devnet";
const listeners = new Set<(e: { accounts: readonly WalletAccount[] }) => void>();

function activeChain(): (typeof AIRWAVE_CHAINS)[number] {
  return currentCluster === "mainnet" ? "solana:mainnet" : "solana:devnet";
}

function applyCluster(cluster: unknown): void {
  if (cluster === "mainnet" || cluster === "devnet") currentCluster = cluster;
}

function accountFromPublicKey(pk: PublicKey): WalletAccount {
  return {
    address: pk.toBase58(),
    publicKey: pk.toBytes(),
    chains: [activeChain()],
    features: [SolanaSignMessage, SolanaSignTransaction],
  };
}

function emitChange(): void {
  const accounts = currentPublicKey ? [accountFromPublicKey(currentPublicKey)] : [];
  for (const fn of listeners) fn({ accounts });
}

window.addEventListener("airwave-account-changed", ((ev: CustomEvent) => {
  const pk = ev.detail.publicKeyBase58 as string;
  applyCluster(ev.detail.cluster);
  currentPublicKey = new PublicKey(pk);
  emitChange();
}) as EventListener);

export const airwaveWallet: Wallet = {
  version: "1.0.0",
  name: "Airwave",
  icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  chains: [...AIRWAVE_CHAINS],
  get accounts(): readonly WalletAccount[] {
    return currentPublicKey ? [accountFromPublicKey(currentPublicKey)] : [];
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
        applyCluster(result.cluster);
        currentPublicKey = new PublicKey(result.publicKey);
        emitChange();
        return { accounts: [accountFromPublicKey(currentPublicKey)] };
      },
    } satisfies StandardConnectFeature[typeof StandardConnect],
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
  },
};
