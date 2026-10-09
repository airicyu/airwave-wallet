/**
 * Displays one website-request page as a stacked layer.
 * Does not own the wallet shell, pending map, or chrome window lifecycle.
 */
import type { JSX } from "react";
import { ConnectPage } from "./ConnectPage";
import { SignFlowPage } from "./SignFlowPage";
import type { FlowEntry } from "./types";

export function FlowHost({
  entry,
  layer,
  paused,
  onFinished,
}: {
  entry: FlowEntry;
  layer: number;
  paused: boolean;
  onFinished: () => void;
}): JSX.Element {
  return (
    <div
      className={paused ? "flow-layer is-paused" : "flow-layer"}
      style={{ zIndex: layer }}
      aria-hidden={paused}
      inert={paused}
    >
      {entry.pageId === "connect" ? (
        <ConnectPage requestId={entry.requestId} onFinished={onFinished} />
      ) : (
        <SignFlowPage requestId={entry.requestId} onFinished={onFinished} />
      )}
    </div>
  );
}
