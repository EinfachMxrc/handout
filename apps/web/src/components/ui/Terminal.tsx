"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

/** When true, all Terminal components inside the provider will flash once. */
export const TerminalFlashContext = createContext(false);

interface TerminalProps {
  children: string;
  title?: string;
  variant?: "default" | "unsafe" | "safe";
  speed?: number;
  flash?: boolean; // blink to notify user of new content
}

export function Terminal({ children, title, variant = "default", speed = 18, flash = false }: TerminalProps) {
  const contextFlash = useContext(TerminalFlashContext);
  const shouldFlash = flash || contextFlash;

  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Start animation when element enters viewport
  useEffect(() => {
    if (started) return; // Already started, no need to observe
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  // Typing animation
  useEffect(() => {
    if (!started) return;
    setDone(false); // Reset done state so cursor shows active typing on re-animation
    const text = children;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(timer); setDone(true); }
    }, speed);
    return () => clearInterval(timer);
  }, [started, children, speed]);

  const dotColors = {
    default: { border: "rgba(255,255,255,0.06)" },
    unsafe:  { border: "rgba(192,57,43,0.25)" },
    safe:    { border: "rgba(30,132,73,0.25)" },
  };

  const variantLabel = variant === "unsafe" ? "UNSICHER" : variant === "safe" ? "SICHER" : "";
  const variantIcon  = variant === "unsafe" ? "✗" : variant === "safe" ? "✓" : "";
  const variantClass = variant === "unsafe" ? "text-[#C0392B]" : variant === "safe" ? "text-[#1E8449]" : "";

  return (
    <div
      ref={ref}
      className={`terminal-window my-5${shouldFlash ? " terminal-flash" : ""}`}
      style={{ borderColor: dotColors[variant].border }}
    >
      {variant !== "default" && (
        <div className={`terminal-variant-label ${variantClass}`}>
          {variantIcon}&ensp;{variantLabel}
        </div>
      )}

      {/* Title bar with interactive macOS dots */}
      <div
        className="terminal-titlebar"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
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
        {title && <span className="terminal-title">{title}</span>}
      </div>

      {/* Code body */}
      <pre className="terminal-body">
        <code>
          {displayed}
          {/* cursor: blinks while typing (fast), blinks slowly when idle */}
          <span className={`terminal-cursor${done ? " terminal-cursor-idle" : ""}`}>▋</span>
        </code>
      </pre>
    </div>
  );
}
