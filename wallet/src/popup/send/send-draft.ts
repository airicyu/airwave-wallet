/** In-memory send form draft so a full-screen address pick can return without dropping amount. */

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
