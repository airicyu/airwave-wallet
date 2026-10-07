import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { IconRefresh } from "./StrokeIcon";

const COOLDOWN_MS = 3000;

export function RefreshAssetsButton({
  activeAccountId,
  currentView,
  onRefresh,
}: {
  activeAccountId: string | null;
  currentView: string;
  onRefresh: () => void;
}): JSX.Element {
  const [cooling, setCooling] = useState(false);
  const timer = useRef<number | null>(null);

  const clearCooling = () => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setCooling(false);
  };

  useEffect(() => {
    clearCooling();
  }, [activeAccountId, currentView]);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={`icon-btn ghost-inline refresh-cd${cooling ? " is-cooling" : ""}`}
      id="btn-refresh-assets"
      title="重新整理"
      aria-label="重新整理"
      disabled={cooling}
      onClick={() => {
        onRefresh();
        setCooling(true);
        if (timer.current != null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          timer.current = null;
          setCooling(false);
        }, COOLDOWN_MS);
      }}
    >
      <svg className="refresh-cd-arc" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" />
      </svg>
      <IconRefresh />
    </button>
  );
}
