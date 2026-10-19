import type { JSX } from "react";
import { BrandMark } from "../components/BrandMark";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";

export function AboutHub(): JSX.Element {
  const { navigateTo } = usePopupContext();
  const { t } = useT();
  return (
    <>
      <BrandMark size="sm" />
      <div className="about-version">
        <span className="hub-label">{t("common.version")}</span>
        <span className="about-version-value" id="about-version">
          {chrome.runtime.getManifest().version}
        </span>
      </div>
      <ul className="settings-hub-list">
        <li>
          <button type="button" className="settings-hub-row" onClick={() => navigateTo("about-disclaimer")}>
            <span className="hub-label">{t("about.disclaimer")}</span>
            <span className="kind-chev" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
        <li>
          <button type="button" className="settings-hub-row" onClick={() => navigateTo("about-terms")}>
            <span className="hub-label">{t("about.terms")}</span>
            <span className="kind-chev" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
        <li>
          <button type="button" className="settings-hub-row" onClick={() => navigateTo("about-privacy")}>
            <span className="hub-label">{t("about.privacy")}</span>
            <span className="kind-chev" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
      </ul>
    </>
  );
}
