"use client";

import { memo } from "react";

/**
 * MacOS-Style Terminal Dots (Close / Minimize / Maximize).
 *
 * Separater memoized Subcomponent, damit sie NICHT bei jedem Zeichen der Typing-Animation
 * neu gerendert werden. Die Typing-Animation ruft setDisplayed() pro Zeichen auf, was die
 * Parent-Terminal-Komponente re-rendert. Ohne memo würden auch die Dots (+ ihr hover state)
 * 100+ Mal pro Second neu rendern, obwohl sie visuell nichts tun.
 */

interface TerminalDotsProps {
  hovering: boolean;
  onEnter: () => void;
  onLeave: () => void;
}

function TerminalDotsImpl({ hovering, onEnter, onLeave }: TerminalDotsProps) {
  return (
    <div
      className="terminal-titlebar"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="terminal-dots">
        <span className={`terminal-dot terminal-dot-red${hovering ? " terminal-dot-hover" : ""}`}>
          {hovering && <span className="terminal-dot-icon">✕</span>}
        </span>
        <span className={`terminal-dot terminal-dot-yellow${hovering ? " terminal-dot-hover" : ""}`}>
          {hovering && <span className="terminal-dot-icon">−</span>}
        </span>
        <span className={`terminal-dot terminal-dot-green${hovering ? " terminal-dot-hover" : ""}`}>
          {hovering && <span className="terminal-dot-icon">+</span>}
        </span>
      </div>
    </div>
  );
}

export const TerminalDots = memo(TerminalDotsImpl);
