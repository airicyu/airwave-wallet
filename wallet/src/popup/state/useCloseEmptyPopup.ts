/**
 * Close-empty selection, plan, and result held by the popup.
 * Does not call the service worker or paint the screens.
 */
import { useCallback, useState } from "react";
import type { ClosableEntry, CloseEmptyCommitResult, CloseEmptyPlanResult } from "../../shared/close-empty";

export function useCloseEmptyPopup() {
  const [closeEmptyEntries, setCloseEmptyEntries] = useState<ClosableEntry[]>([]);
  const [closeEmptySelected, setCloseEmptySelected] = useState<Set<string>>(() => new Set());
  const [closeEmptyPlan, setCloseEmptyPlan] = useState<CloseEmptyPlanResult | null>(null);
  const [closeEmptyResult, setCloseEmptyResult] = useState<CloseEmptyCommitResult | null>(null);
  const [closeEmptyStaleError, setCloseEmptyStaleError] = useState<string | null>(null);
  const [closeEmptySending, setCloseEmptySending] = useState(false);

  const clearCloseEmptyDraft = useCallback(() => {
    setCloseEmptyPlan(null);
    setCloseEmptyResult(null);
    setCloseEmptyStaleError(null);
    setCloseEmptySending(false);
  }, []);

  const resetCloseEmptyFlow = useCallback(() => {
    clearCloseEmptyDraft();
    setCloseEmptySelected(new Set());
    setCloseEmptyEntries([]);
  }, [clearCloseEmptyDraft]);

  return {
    closeEmptyEntries,
    setCloseEmptyEntries,
    closeEmptySelected,
    setCloseEmptySelected,
    closeEmptyPlan,
    setCloseEmptyPlan,
    closeEmptyResult,
    setCloseEmptyResult,
    closeEmptyStaleError,
    setCloseEmptyStaleError,
    closeEmptySending,
    setCloseEmptySending,
    clearCloseEmptyDraft,
    resetCloseEmptyFlow,
  };
}
