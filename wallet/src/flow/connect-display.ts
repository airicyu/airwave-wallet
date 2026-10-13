export function connectHostLabel(origin: string): string {
  try {
    const host = new URL(origin).hostname;
    return host.replace(/^www\./i, "");
  } catch {
    return origin;
  }
}

export function connectSiteMark(origin: string): string {
  const host = connectHostLabel(origin);
  const ch = host.charAt(0);
  return ch ? ch.toUpperCase() : "?";
}
