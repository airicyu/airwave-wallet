/**
 * This file is the page inject entry. It registers the Airwave wallet with Wallet Standard and sends a debug ping so the service worker can wake. The wallet object and the bridge client live in their own files.
 */
import { registerWallet } from "@wallet-standard/wallet";
import { bridgeRequest } from "./bridge-client";
import { airwaveWallet } from "./wallet";

registerWallet(airwaveWallet);
void bridgeRequest("debug.ping", { text: "airwave" }).catch(() => {
  /* Ignore until the service worker is ready. */
});
