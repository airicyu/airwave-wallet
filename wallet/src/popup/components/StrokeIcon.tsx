import type { JSX, ReactNode } from "react";

export function StrokeIcon({
  children,
  size = 16,
}: {
  children: ReactNode;
  size?: number;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconCopy({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </StrokeIcon>
  );
}

export function IconPlus({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M12 5v14M5 12h14" />
    </StrokeIcon>
  );
}

export function IconTrash({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </StrokeIcon>
  );
}

export function IconCheck({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </StrokeIcon>
  );
}

export function IconEye({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </StrokeIcon>
  );
}

export function IconKebab({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export function IconRename({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </StrokeIcon>
  );
}

export function IconLock({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </StrokeIcon>
  );
}

export function IconMenu({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </StrokeIcon>
  );
}

export function IconBack({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M15 18l-6-6 6-6" />
    </StrokeIcon>
  );
}

export function IconRefresh({ size = 18 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </StrokeIcon>
  );
}

export function IconExternal({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </StrokeIcon>
  );
}

export function IconX({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <StrokeIcon size={size}>
      <path d="M18 6L6 18M6 6l12 12" />
    </StrokeIcon>
  );
}


