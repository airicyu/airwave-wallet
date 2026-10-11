import { registerWallet } from "@wallet-standard/wallet";
import { bridgeRequest } from "./bridge-client";
import { airwaveWallet } from "./wallet";

registerWallet(airwaveWallet);
void bridgeRequest("debug.ping", { text: "airwave" }).catch(() => {
  /* Ignore until the service worker is ready. */
});
