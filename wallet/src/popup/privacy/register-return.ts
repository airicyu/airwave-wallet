/**
 * Remembers which screen started registration, so reject and success return there.
 * The private-balance tab is local state, so a return from approval asks Home to open that tab again.
 */
let source: "tab" | "shield" | null = null;
let openPrivate = false;

export function markRegisterFrom(next: "tab" | "shield"): void {
  source = next;
}

export function consumeRegisterFrom(): "tab" | "shield" | null {
  const value = source;
  source = null;
  return value;
}

export function returnToPrivateTab(): void {
  openPrivate = true;
}

export function takePrivateTab(): boolean {
  const value = openPrivate;
  openPrivate = false;
  return value;
}
