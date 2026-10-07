import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy } from "./StrokeIcon";

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

  const label = copied ? "已複製" : "複製";
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
