/**
 * One UTXO row: a shortened hash, a copy control for the full hash, and the amount with its unit.
 * Does not select notes or navigate.
 */
import type { JSX } from "react";
import { CopyIconButton } from "../components/CopyPkButton";

export function shortUtxoId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export function UtxoReceipt({ id, amount, unit }: { id: string; amount: string; unit: string }): JSX.Element {
  return (
    <>
      <span className="privacy-note-id">
        <span>{shortUtxoId(id)}</span>
        <CopyIconButton text={id} size={14} stopPropagation className="icon-btn ghost-inline privacy-note-copy" />
      </span>
      <span>{unit ? `${amount} ${unit}` : amount}</span>
    </>
  );
}
