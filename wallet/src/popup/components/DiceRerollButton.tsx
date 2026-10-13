/**
 * Purple circular dice control that rerolls a local wallet draft.
 * Does not generate keys or talk to the service worker.
 */
import { useRef, type JSX } from "react";

export function DiceRerollButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);

  function play() {
    const svg = svgRef.current;
    if (!svg) return;
    svg.getAnimations().forEach((anim) => anim.cancel());
    svg.classList.remove("shake");
    svg.style.animation = "none";
    void svg.getBoundingClientRect();
    svg.style.animation = "";
    svg.classList.add("shake");
  }

  return (
    <button
      type="button"
      className="dice-btn"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        play();
        onClick();
      }}
    >
      <svg ref={svgRef} viewBox="3.4 2.4 17.2 19.2" aria-hidden="true">
        <path className="die-face die-face-top" d="M12 4 18.93 8 12 12 5.07 8Z" />
        <path className="die-face die-face-left" d="M5.07 8 12 12 12 20 5.07 16Z" />
        <path className="die-face die-face-right" d="M12 12 18.93 8 18.93 16 12 20Z" />
        <path className="die-edge" d="M12 4 18.93 8 18.93 16 12 20 5.07 16 5.07 8Z M5.07 8 12 12 18.93 8 M12 12v8" />
        <circle className="die-pip" cx="9.78" cy="6.72" r="0.58" />
        <circle className="die-pip" cx="14.22" cy="9.28" r="0.58" />
        <circle className="die-pip" cx="8.54" cy="14" r="0.58" />
        <circle className="die-pip" cx="16.78" cy="11.72" r="0.58" />
        <circle className="die-pip" cx="15.47" cy="14" r="0.58" />
        <circle className="die-pip" cx="14.15" cy="16.28" r="0.58" />
      </svg>
    </button>
  );
}
