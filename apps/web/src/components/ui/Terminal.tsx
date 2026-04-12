"use client";

import { useEffect, useRef, useState } from "react";

interface TerminalProps {
  children: string;
  title?: string;
  variant?: "default" | "unsafe" | "safe";
  speed?: number;
}

export function Terminal({ children, title, variant = "default", speed = 18 }: TerminalProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Start animation when element enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  // Typing animation
  useEffect(() => {
    if (!started) return;
    const text = children;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [started, children, speed]);

  const dotColors = {
    default: { label: "", border: "rgba(255,255,255,0.06)" },
    unsafe: { label: "text-[#C0392B]", border: "rgba(192,57,43,0.25)" },
    safe: { label: "text-[#1E8449]", border: "rgba(30,132,73,0.25)" },
  };

  const variantLabel = variant === "unsafe" ? "UNSICHER" : variant === "safe" ? "SICHER" : "";
  const variantIcon = variant === "unsafe" ? "\u2717" : variant === "safe" ? "\u2713" : "";

  return (
    <div ref={ref} className="terminal-window my-5" style={{ borderColor: dotColors[variant].border }}>
      {variant !== "default" && (
        <div className={`terminal-variant-label ${dotColors[variant].label}`}>
          {variantIcon}&ensp;{variantLabel}
        </div>
      )}
      <div className="terminal-titlebar">
        <div className="terminal-dots">
          <span className="terminal-dot terminal-dot-red" />
          <span className="terminal-dot terminal-dot-yellow" />
          <span className="terminal-dot terminal-dot-green" />
        </div>
        {title && <span className="terminal-title">{title}</span>}
      </div>
      <pre className="terminal-body">
        <code>{displayed}{!done && <span className="terminal-cursor">|</span>}</code>
      </pre>
    </div>
  );
}
