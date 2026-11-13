/**
 * Keeps the private Send form across the approval screen.
 * Does not store keys or the transaction.
 */
let fromSend = false;
let amountDraft = "";
let recipientDraft = "";
let autoDraft = true;
let openDraft = false;
let selectedDraft: string[] = [];
let labelDraft = "";
let pickFromPrivate = false;

export function markPrivateSendApproval(): void {
  fromSend = true;
}

export function consumePrivateSendApproval(): boolean {
  const value = fromSend;
  fromSend = false;
  return value;
}

export function readPrivateSendDraft(): {
  amount: string;
  recipient: string;
  auto: boolean;
  open: boolean;
  selected: string[];
  label: string;
} {
  return {
    amount: amountDraft,
    recipient: recipientDraft,
    auto: autoDraft,
    open: openDraft,
    selected: selectedDraft,
    label: labelDraft,
  };
}

export function clearPrivateSendDraft(): void {
  amountDraft = "";
  recipientDraft = "";
  labelDraft = "";
  autoDraft = true;
  openDraft = false;
  selectedDraft = [];
}

export function writePrivateSendDraft(next: {
  amount?: string;
  recipient?: string;
  auto?: boolean;
  open?: boolean;
  selected?: string[];
  label?: string;
}): void {
  if (next.amount != null) amountDraft = next.amount;
  if (next.recipient != null) recipientDraft = next.recipient;
  if (next.auto != null) autoDraft = next.auto;
  if (next.open != null) openDraft = next.open;
  if (next.selected != null) selectedDraft = next.selected;
  if (next.label != null) labelDraft = next.label;
}

export function markPrivateSendPick(): void {
  pickFromPrivate = true;
}

export function consumePrivateSendPick(): boolean {
  const value = pickFromPrivate;
  pickFromPrivate = false;
  return value;
}
