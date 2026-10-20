/**
 * Account list, add-account, and combined-member navigation screens.
 * Does not render the home token list or settings hub.
 */
import type { JSX } from "react";
import {
  AccountsList,
  CombinedCreateScreen,
  ManageScreen,
  RenameScreen,
  RevealScreen,
} from "./accounts/AccountsScreens";
import {
  AddAccountChooser,
  AddImportChooser,
  GenerateBurnerScreen,
  GenerateSeedScreen,
  ImportSecretScreen,
  ImportSeedScreen,
  WatchAccountScreen,
} from "./onboarding/OnboardingScreens";
import { screenEnterKey } from "./runtime";
import { CombinedSwitchScreen } from "./accounts/CombinedManage";
import {
  CombinedAddChoice,
  CombinedLocalScreen,
  CombinedPasteScreen,
  MemberRenameScreen,
} from "./accounts/combined-member-screens";
import { usePopupContext } from "./state/PopupContext";

export function AccountViews(): JSX.Element {
  const { wallet, currentView, navSeq } = usePopupContext();
  if (!wallet) return <></>;
  return (
    <>
          {currentView === "accounts" ? (
            <section id="screen-accounts" className="screen">
              <AccountsList wallet={wallet} />
            </section>
          ) : null}

          {currentView === "add-account" ? (
            <section id="screen-add-account" className="screen">
              <AddAccountChooser />
            </section>
          ) : null}

          {currentView === "add-import" ? (
            <section id="screen-add-import" className="screen">
              <AddImportChooser />
            </section>
          ) : null}

          {currentView === "add-import-secret" ? (
            <section id="screen-add-import-secret" className="screen">
              <ImportSecretScreen key={screenEnterKey("add-import-secret", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-import-seed" ? (
            <section id="screen-add-import-seed" className="screen">
              <ImportSeedScreen key={screenEnterKey("add-import-seed", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-generate-seed" ? (
            <section id="screen-add-generate-seed" className="screen">
              <GenerateSeedScreen key={screenEnterKey("add-generate-seed", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-generate" ? (
            <section id="screen-add-generate" className="screen">
              <GenerateBurnerScreen key={screenEnterKey("add-generate", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-watch" ? (
            <section id="screen-add-watch" className="screen">
              <WatchAccountScreen key={screenEnterKey("add-watch", navSeq)} />
            </section>
          ) : null}

          {currentView === "add-combined" ? (
            <section id="screen-add-combined" className="screen">
              <CombinedCreateScreen key={screenEnterKey("add-combined", navSeq)} wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-rename" ? (
            <section id="screen-account-rename" className="screen">
              <RenameScreen key={screenEnterKey("account-rename", navSeq)} wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-switch" ? (
            <section className="screen">
              <CombinedSwitchScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-manage" ? (
            <section id="screen-account-manage" className="screen">
              <ManageScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-manage-add" ? (
            <section className="screen">
              <CombinedAddChoice />
            </section>
          ) : null}

          {currentView === "account-manage-paste" ? (
            <section className="screen">
              <CombinedPasteScreen key={screenEnterKey("account-manage-paste", navSeq)} wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-manage-local" ? (
            <section className="screen">
              <CombinedLocalScreen wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-member-rename" ? (
            <section className="screen">
              <MemberRenameScreen key={screenEnterKey("account-member-rename", navSeq)} wallet={wallet} />
            </section>
          ) : null}

          {currentView === "account-reveal-key" ? (
            <section id="screen-account-reveal-key" className="screen">
              <RevealScreen wallet={wallet} />
            </section>
          ) : null}
    </>
  );
}
