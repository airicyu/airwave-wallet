/**
 * One plaintext API base URL row: idle shows the stored value and a pencil; edit confirms or discards.
 * Does not mask the value or read integration secrets.
 */
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconRename, IconX } from "../components/StrokeIcon";
import { useT } from "../state/useT";

const PRESS_MS = 140;

export function ApiUrlField({
  id,
  label,
  value,
  placeholder,
  claimedId,
  onClaim,
  onRelease,
  persist,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  claimedId: string | null;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  persist: (value: string) => Promise<boolean>;
}): JSX.Element {
  const { t } = useT();
  const [phase, setPhase] = useState<"idle" | "editing">("idle");
  const [draft, setDraft] = useState(value);
  const [pressed, setPressed] = useState<"commit" | "discard" | null>(null);
  const holdBlur = useRef(false);

  const idle = (): void => {
    setPhase("idle");
    setDraft(value);
    onRelease(id);
  };

  useEffect(() => {
    if (phase === "idle") setDraft(value);
  }, [phase, value]);

  useEffect(() => {
    if (claimedId !== id && phase !== "idle") idle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedId, id]);

  const finishPress = (kind: "commit" | "discard", run: () => void): void => {
    setPressed(kind);
    window.setTimeout(() => {
      setPressed(null);
      run();
    }, PRESS_MS);
  };

  return (
    <div className="field keys-field">
      <label htmlFor={id}>{label}</label>
      <div className={`keys-input-row${phase === "editing" ? " is-editing" : ""}`}>
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          readOnly={phase !== "editing"}
          value={phase === "editing" ? draft : value}
          onChange={(e) => {
            if (phase === "editing") setDraft(e.target.value);
          }}
          onBlur={() => {
            if (holdBlur.current) return;
            if (phase === "editing") idle();
          }}
        />
        {phase === "editing" ? (
          <>
            <button
              type="button"
              className={`icon-btn ghost-inline keys-confirm-btn${pressed === "commit" ? " is-pressed" : ""}`}
              title={t("common.confirm")}
              aria-label={t("common.confirm")}
              onMouseDown={(e) => {
                e.preventDefault();
                holdBlur.current = true;
              }}
              onClick={() => {
                finishPress("commit", () => {
                  holdBlur.current = false;
                  void persist(draft).then((ok) => {
                    holdBlur.current = false;
                    if (ok) idle();
                  }, () => {
                    holdBlur.current = false;
                  });
                });
              }}
            >
              <IconCheck />
            </button>
            <button
              type="button"
              className={`icon-btn ghost-inline keys-discard-btn${pressed === "discard" ? " is-pressed" : ""}`}
              title={t("common.discard")}
              aria-label={t("common.discard")}
              onMouseDown={(e) => {
                e.preventDefault();
                holdBlur.current = true;
              }}
              onClick={() => {
                finishPress("discard", () => {
                  holdBlur.current = false;
                  idle();
                });
              }}
            >
              <IconX />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="icon-btn ghost-inline keys-edit-btn"
            title={t("common.edit")}
            aria-label={t("common.edit")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onClaim(id);
              setDraft(value);
              setPhase("editing");
            }}
          >
            <IconRename />
          </button>
        )}
      </div>
    </div>
  );
}
