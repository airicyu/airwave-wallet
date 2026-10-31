/**
 * Grip drag that reorders combined-member rows, and the local account shown on each row.
 * Does not persist the new order.
 */
import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import type { SigningOrWatchMeta } from "../../shared/protocol";
import type { State } from "../types";

const DRAG_PX = 6;

type MemberDropLine = { pk: string; edge: "before" | "after" };

export function localCombinedMember(wallet: State, pk: string): SigningOrWatchMeta | undefined {
  return wallet.accounts.find(
    (a): a is SigningOrWatchMeta =>
      isSigningOrWatch(a) && (parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58) === pk,
  );
}

function reorderMembers(ids: readonly string[], dragPk: string, line: MemberDropLine): string[] | null {
  if (line.pk === dragPk) return null;
  const next = ids.filter((pk) => pk !== dragPk);
  let idx = next.indexOf(line.pk);
  if (idx < 0) return null;
  if (line.edge === "after") idx += 1;
  next.splice(idx, 0, dragPk);
  return next;
}

export function useMemberSheetDrag(
  sheetSelector: string,
  members: readonly string[],
  onReorder: (next: string[]) => void,
): {
  dragging: string | null;
  dropLine: MemberDropLine | null;
  skipClickRef: { current: boolean };
  startDrag: (pk: string, ev: ReactPointerEvent) => void;
} {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropLine, setDropLine] = useState<MemberDropLine | null>(null);
  const dropLineRef = useRef(dropLine);
  dropLineRef.current = dropLine;
  const dragRef = useRef<{ pk: string; startY: number; live: boolean } | null>(null);
  const skipClickRef = useRef(false);
  const membersRef = useRef(members);
  membersRef.current = members;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const onMove = useCallback(
    (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (!drag.live && Math.abs(ev.clientY - drag.startY) < DRAG_PX) return;
      if (!drag.live) {
        drag.live = true;
        skipClickRef.current = true;
        setDragging(drag.pk);
        window.getSelection()?.removeAllRanges();
      }
      ev.preventDefault();
      const rows = Array.from(document.querySelectorAll<HTMLElement>(`${sheetSelector} .member-line`));
      let line: MemberDropLine | null = null;
      for (const row of rows) {
        const pk = row.dataset.pk;
        if (!pk) continue;
        const r = row.getBoundingClientRect();
        if (ev.clientY < r.bottom && ev.clientY >= r.top) {
          line = { pk, edge: ev.clientY < r.top + r.height / 2 ? "before" : "after" };
          break;
        }
      }
      setDropLine(line);
    },
    [sheetSelector],
  );

  const onUp = useCallback(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(null);
    const line = dropLineRef.current;
    setDropLine(null);
    if (!drag?.live || !line) return;
    const next = reorderMembers(membersRef.current, drag.pk, line);
    if (next) onReorderRef.current(next);
  }, [onMove]);

  const startDrag = (pk: string, ev: ReactPointerEvent) => {
    if (!(ev.target as HTMLElement).closest(".account-grip")) return;
    ev.preventDefault();
    window.getSelection()?.removeAllRanges();
    dragRef.current = { pk, startY: ev.clientY, live: false };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
  };

  return { dragging, dropLine, skipClickRef, startDrag };
}
