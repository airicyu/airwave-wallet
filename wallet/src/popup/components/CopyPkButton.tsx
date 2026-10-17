/**
 * Icon copy control: writes text, then shows a check for a short moment.
 * Does not pick which string to copy; the caller passes it.
 */
import type { JSX, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy } from "./StrokeIcon";
import { useT } from "../state/useT";

const COPY_OK_MS = 1600;

export function CopyIconButton({
  text,
  idleLabel,
  className = "icon-btn ghost-inline",
  size = 16,
  id,
  stopPropagation = false,
}: {
  text: string;
  idleLabel?: string;
  className?: string;
  size?: number;
  id?: string;
  stopPropagation?: boolean;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const { t } = useT();
  const label = copied ? t("copy.copied") : (idleLabel ?? t("common.copy"));
  const onClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (stopPropagation) event.stopPropagation();
    if (!text) return;
    void (async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return;
      }
      setCopied(true);
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), COPY_OK_MS);
    })();
  };

  return (
    <button
      type="button"
      className={`${className}${copied ? " copy-ok" : ""}`}
      id={id}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {copied ? <IconCheck size={size} /> : <IconCopy size={size} />}
    </button>
  );
}

export function CopyPkButton({
  id,
  publicKey,
}: {
  id: string;
  publicKey: string;
}): JSX.Element {
  return <CopyIconButton id={id} text={publicKey} />;
}
