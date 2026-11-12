/**
 * Remembers Shield's amount, where Back returns, and that approval came from Shield.
 * Does not store the transaction.
 */
let fromShield = false;
let amountDraft = "";
let backView: "home-token" | "private-detail" | "token-detail" | "shield-pick" = "home-token";

export function markShieldApproval(): void {
  fromShield = true;
}

export function consumeShieldApproval(): boolean {
  const value = fromShield;
  fromShield = false;
  return value;
}

export function readShieldAmount(): string {
  return amountDraft;
}

export function writeShieldAmount(amount: string): void {
  amountDraft = amount;
}

export function clearShieldAmount(): void {
  amountDraft = "";
}

export function setShieldBack(view: typeof backView): void {
  backView = view;
}

export function readShieldBack(): typeof backView {
  return backView;
}
