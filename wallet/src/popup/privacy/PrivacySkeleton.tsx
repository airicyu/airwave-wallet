/**
 * Placeholder bars shown while a private-balance page waits for its first status.
 * The panel and the token detail decide when to replace the skeleton with rows or an error.
 */
import type { JSX } from "react";

export function PrivacySkeleton({ variant }: { variant: "cards" | "detail" | "form" }): JSX.Element {
  if (variant === "cards") {
    return (
      <div className="privacy-skeleton" aria-busy="true">
        <div className="privacy-skeleton-card" />
        <div className="privacy-skeleton-card" />
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="privacy-skeleton" aria-busy="true">
        <div className="privacy-skeleton-hero" />
        <div className="privacy-skeleton-line" />
        <div className="privacy-skeleton-line short" />
      </div>
    );
  }
  return (
    <div className="privacy-skeleton" aria-busy="true">
      <div className="privacy-skeleton-line" />
      <div className="privacy-skeleton-line short" />
      <div className="privacy-skeleton-card" />
      <div className="privacy-skeleton-card" />
    </div>
  );
}
