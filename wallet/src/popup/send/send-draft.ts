/**
 * In-memory draft for the public send form: amount and recipient.
 * Opening the address book and returning must not drop the amount. Leaving the send flow clears the draft.
 */

export type SendDraft = {
  amount: string;
  recipient: string;
  label: string;
};

let draft: SendDraft = { amount: "", recipient: "", label: "" };

export function readSendDraft(): SendDraft {
  return draft;
}

export function patchSendDraft(partial: Partial<SendDraft>): void {
  draft = { ...draft, ...partial };
}

export function clearSendDraft(): void {
  draft = { amount: "", recipient: "", label: "" };
}
