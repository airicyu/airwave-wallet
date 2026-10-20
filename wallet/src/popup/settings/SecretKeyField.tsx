/**
 * One settings secret row: idle shows reveal and pencil; edit shows confirm and discard.
 * Does not choose storage keys; the caller passes read and persist.
 */
import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { hardenApiKeyInput } from "../lib/password-input";
import { IconCheck, IconEye, IconRename, IconX } from "../components/StrokeIcon";
import { sendExtensionRequest } from "../../shared/protocol";
import { useT } from "../state/useT";
import { MASKED_SECRET_DISPLAY } from "./settings-logic";

const PRESS_MS = 140;

type SecretName = "heliusApiUrl" | "jupiterApiKey" | "openRouterApiKey";

async function readSecret(name: SecretName): Promise<string | null> {
  const res = await sendExtensionRequest("wallet.readIntegrationSecrets", {});
  if (!res.ok) return null;
  const bag = res.result as Partial<Record<SecretName, string>> | undefined;
  return bag?.[name] ?? "";
}

export function SecretKeyField({
  id,
  label,
  configured,
  secretName,
  claimedId,
  onClaim,
  onRelease,
  persist,
}: {
  id: string;
  label: string;
  configured: boolean;
  secretName: SecretName;
  claimedId: string | null;
  onClaim: (id: string) => void;
  onRelease: (id: string) => void;
  persist: (value: string) => Promise<boolean>;
}): JSX.Element {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "editing">("idle");
  const [revealed, setRevealed] = useState(false);
  const [plain, setPlain] = useState("");
  const [draft, setDraft] = useState("");
  const [pressed, setPressed] = useState<"commit" | "discard" | null>(null);
  const holdBlur = useRef(false);
  const ticket = useRef(0);
  const revealTicket = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (inputRef.current) hardenApiKeyInput(inputRef.current);
  }, []);

  const idle = (): void => {
    ticket.current += 1;
    revealTicket.current += 1;
    setPhase("idle");
    setRevealed(false);
    setDraft("");
    setPlain("");
    onRelease(id);
  };

  useEffect(() => {
    if (claimedId !== id && phase !== "idle") idle();
    // idle() releases this id; claimedId change is the only signal we need.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedId, id]);

  const beginEdit = (): void => {
    if (phase !== "idle") return;
    onClaim(id);
    setPhase("loading");
    setRevealed(false);
    const mine = ticket.current + 1;
    ticket.current = mine;
    revealTicket.current += 1;
    void readSecret(secretName).then((value) => {
      if (mine !== ticket.current) return;
      if (value == null) {
        setPhase("idle");
        onRelease(id);
        return;
      }
      setDraft(value);
      setPhase("editing");
      queueMicrotask(() => inputRef.current?.focus());
    });
  };

  const revealIdle = (): void => {
    if (revealed) {
      revealTicket.current += 1;
      setRevealed(false);
      setPlain("");
      return;
    }
    const mine = revealTicket.current + 1;
    revealTicket.current = mine;
    void readSecret(secretName).then((value) => {
      if (mine !== revealTicket.current) return;
      if (phaseRef.current !== "idle") return;
      if (value == null) return;
      setPlain(value);
      setRevealed(true);
    });
  };

  const finishPress = (kind: "commit" | "discard", run: () => void): void => {
    setPressed(kind);
    window.setTimeout(() => {
      setPressed(null);
      run();
    }, PRESS_MS);
  };

  const display =
    phase === "editing"
      ? draft
      : revealed
        ? plain
        : configured
          ? MASKED_SECRET_DISPLAY
          : "";

  return (
    <div className="field keys-field">
      <label htmlFor={id}>{label}</label>
      <div className={`keys-input-row${phase === "editing" ? " is-editing" : ""}`}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          placeholder={t("common.optional")}
          readOnly={phase !== "editing"}
          value={display}
          onChange={(e) => {
            if (phase === "editing") setDraft(e.target.value);
          }}
          onBlur={() => {
            if (holdBlur.current) return;
            if (phase === "editing") idle();
          }}
        />
        {phase === "idle" ? (
          <button
            type="button"
            className="icon-btn ghost-inline keys-reveal-btn"
            title={t("common.show")}
            aria-label={t("common.show")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={revealIdle}
          >
            <IconEye />
          </button>
        ) : null}
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
        ) : phase === "idle" ? (
          <button
            type="button"
            className="icon-btn ghost-inline keys-edit-btn"
            title={t("common.edit")}
            aria-label={t("common.edit")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={beginEdit}
          >
            <IconRename />
          </button>
        ) : null}
      </div>
    </div>
  );
}
