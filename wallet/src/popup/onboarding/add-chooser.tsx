import type { JSX } from "react";
import {
  IconDownload,
  IconEye,
  IconFlame,
  IconLayers,
  IconPin,
} from "../components/StrokeIcon";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";

export function AddAccountChooser(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <div className="chooser-list">
      <button type="button" className="chooser-row" onClick={() => navigateTo("add-generate-seed")}>
        <span className="chooser-ico"><IconPin size={20} /></span>
        <span>
          <span className="chooser-title">{t("onboarding.createSeedWallet")}</span>
          <span className="chooser-sub">{t("onboarding.chooser.seed")}</span>
        </span>
      </button>
      <button type="button" className="chooser-row" onClick={() => navigateTo("add-generate")}>
        <span className="chooser-ico"><IconFlame size={20} /></span>
        <span>
          <span className="chooser-title">{t("onboarding.createBurner")}</span>
          <span className="chooser-sub">{t("onboarding.chooser.burner")}</span>
        </span>
      </button>
      <button type="button" className="chooser-row" onClick={() => navigateTo("add-import")}>
        <span className="chooser-ico"><IconDownload size={20} /></span>
        <span>
          <span className="chooser-title">{t("onboarding.importWallet")}</span>
          <span className="chooser-sub">{t("onboarding.chooser.import")}</span>
        </span>
      </button>
      <button type="button" className="chooser-row" onClick={() => navigateTo("add-watch")}>
        <span className="chooser-ico"><IconEye size={20} /></span>
        <span>
          <span className="chooser-title">{t("onboarding.createWatch")}</span>
          <span className="chooser-sub">{t("onboarding.chooser.watch")}</span>
        </span>
      </button>
      <button type="button" className="chooser-row" onClick={() => navigateTo("add-combined")}>
        <span className="chooser-ico"><IconLayers size={20} /></span>
        <span>
          <span className="chooser-title">{t("onboarding.createCombined")}</span>
          <span className="chooser-sub">{t("onboarding.chooser.combined")}</span>
        </span>
      </button>
    </div>
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
