import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy } from "./StrokeIcon";
import { useT } from "../state/useT";

const COPY_OK_MS = 1600;

export function CopyPkButton({
  id,
  publicKey,
}: {
  id: string;
  publicKey: string;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const { t } = useT();
  const label = copied ? t("copy.copied") : t("common.copy");
  return (
    <button
      type="button"
      className={`icon-btn ghost-inline${copied ? " copy-ok" : ""}`}
      id={id}
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        if (!publicKey) return;
        void (async () => {
          try {
            await navigator.clipboard.writeText(publicKey);
          } catch {
            return;
          }
          setCopied(true);
          if (timer.current != null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), COPY_OK_MS);
        })();
      }}
    >
      {copied ? <IconCheck /> : <IconCopy />}
    </button>
  );
}
