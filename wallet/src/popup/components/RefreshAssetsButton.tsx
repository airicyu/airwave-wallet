/**
 * Home holdings refresh control: disable immediately, spin the icon once, then dim for the remaining cooldown.
 * Does not fetch balances (parent onRefresh does).
 */
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { IconRefresh } from "./StrokeIcon";
import { useT } from "../state/useT";

const COOLDOWN_MS = 3000;
const SPIN_MS = 650;

export function RefreshAssetsButton({
  activeAccountId,
  currentView,
  onRefresh,
}: {
  activeAccountId: string | null;
  currentView: string;
  onRefresh: () => void;
}): JSX.Element {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const spinTimer = useRef<number | null>(null);
  const coolTimer = useRef<number | null>(null);

  const clearTimers = () => {
    if (spinTimer.current != null) {
      window.clearTimeout(spinTimer.current);
      spinTimer.current = null;
    }
    if (coolTimer.current != null) {
      window.clearTimeout(coolTimer.current);
      coolTimer.current = null;
    }
    setBusy(false);
    setSpinning(false);
  };

  useEffect(() => {
    clearTimers();
  }, [activeAccountId, currentView]);

  useEffect(() => {
    return () => {
      if (spinTimer.current != null) window.clearTimeout(spinTimer.current);
      if (coolTimer.current != null) window.clearTimeout(coolTimer.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={`icon-btn ghost-inline${spinning ? " is-spinning" : ""}`}
      id="btn-refresh-assets"
      title={t("common.refresh")}
      aria-label={t("common.refresh")}
      disabled={busy}
      onClick={() => {
        onRefresh();
        setBusy(true);
        setSpinning(true);
        if (spinTimer.current != null) window.clearTimeout(spinTimer.current);
        if (coolTimer.current != null) window.clearTimeout(coolTimer.current);
        spinTimer.current = window.setTimeout(() => {
          spinTimer.current = null;
          setSpinning(false);
        }, SPIN_MS);
        coolTimer.current = window.setTimeout(() => {
          coolTimer.current = null;
          setBusy(false);
          setSpinning(false);
        }, COOLDOWN_MS);
      }}
    >
      <IconRefresh />
    </button>
  );
}
