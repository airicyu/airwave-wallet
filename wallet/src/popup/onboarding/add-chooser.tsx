import type { JSX } from "react";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";

export function AddAccountChooser(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-generate-seed")}>
        {t("onboarding.createSeedWallet")}<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-generate")}>
        {t("onboarding.createBurner")}<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-import")}>
        {t("onboarding.importWallet")}<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-watch")}>
        {t("onboarding.createWatch")}<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-combined")}>
        {t("onboarding.createCombined")}<span className="kind-chev" aria-hidden="true">›</span>
      </button>
    </>
  );
}

export function AddImportChooser(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-import-seed")}>
        {t("onboarding.seedPhrase")}<span className="kind-chev" aria-hidden="true">›</span>
      </button>
      <button type="button" className="kind-btn" onClick={() => navigateTo("add-import-secret")}>
        {t("onboarding.secretKey")}<span className="kind-chev" aria-hidden="true">›</span>
      </button>
    </>
  );
}
