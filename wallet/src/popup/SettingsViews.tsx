/**
 * Settings, about, legal documents, and connected sites inside the popup shell.
 * Does not render the home screen or account list.
 */
import type { JSX } from "react";
import disclaimerMd from "../../../docs/legal/disclaimer.md?raw";
import termsMd from "../../../docs/legal/terms-of-use.md?raw";
import privacyMd from "../../../docs/legal/privacy-policy.md?raw";
import { ConnectedSites } from "./accounts/AccountsScreens";
import { LegalDoc } from "./components/LegalDoc";
import { AboutHub } from "./onboarding/OnboardingScreens";
import { RpcGuideScreen } from "./onboarding/RpcGuideScreen";
import {
  ChangePasswordScreen,
  CuPriceScreen,
  KeysScreen,
  LocaleScreen,
  NetworkScreen,
  RpcScreen,
  SettingsHub,
  WalletLockSettingsScreen,
} from "./settings/SettingsScreens";
import { TxAiSettingsScreen } from "./settings/TxAiSettingsScreen";
import { usePopupContext } from "./state/PopupContext";

export function SettingsViews(): JSX.Element {
  const { wallet, currentView } = usePopupContext();
  if (!wallet) return <></>;
  return (
    <>
          {currentView === "rpc-guide" ? <RpcGuideScreen /> : null}
          {currentView === "settings" ? (
            <section id="screen-settings" className="screen">
              <SettingsHub settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-locale" ? (
            <section id="screen-settings-locale" className="screen">
              <LocaleScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-network" ? (
            <section id="screen-settings-network" className="screen">
              <NetworkScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-rpc" ? (
            <section id="screen-settings-rpc" className="screen">
              <RpcScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-keys" ? (
            <section id="screen-settings-keys" className="screen">
              <KeysScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-tx-ai" ? (
            <section id="screen-settings-tx-ai" className="screen">
              <TxAiSettingsScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-cu-price" ? (
            <section id="screen-settings-cu-price" className="screen">
              <CuPriceScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-wallet-lock" ? (
            <section id="screen-settings-wallet-lock" className="screen">
              <WalletLockSettingsScreen settings={wallet.settings} />
            </section>
          ) : null}

          {currentView === "settings-password" ? (
            <section id="screen-settings-password" className="screen">
              <ChangePasswordScreen />
            </section>
          ) : null}

          {currentView === "about" ? (
            <section id="screen-about" className="screen">
              <AboutHub />
            </section>
          ) : null}

          {currentView === "about-disclaimer" ? (
            <section id="screen-about-disclaimer" className="screen">
              <article id="legal-disclaimer" className="legal-doc">
                <LegalDoc markdown={disclaimerMd} />
              </article>
            </section>
          ) : null}

          {currentView === "about-terms" ? (
            <section id="screen-about-terms" className="screen">
              <article id="legal-terms" className="legal-doc">
                <LegalDoc markdown={termsMd} />
              </article>
            </section>
          ) : null}

          {currentView === "about-privacy" ? (
            <section id="screen-about-privacy" className="screen">
              <article id="legal-privacy" className="legal-doc">
                <LegalDoc markdown={privacyMd} />
              </article>
            </section>
          ) : null}

          {currentView === "connected-sites" ? (
            <section id="screen-connected-sites" className="screen">
              <ConnectedSites wallet={wallet} />
            </section>
          ) : null}
    </>
  );
}
