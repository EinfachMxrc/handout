import { useRef, useEffect, useState } from "react";
import { SlideSimulator } from "../lib/simulator";
import { useAddinSimulatorStore } from "../store/simulatorStore";

interface SimulatorPanelProps {
  onSlideChange: (slideNumber: number, total: number) => void;
  currentSlide: number;
  totalSlides: number;
}

export function SimulatorPanel({ onSlideChange, currentSlide, totalSlides }: SimulatorPanelProps) {
  const simulatorTotalSlides = useAddinSimulatorStore((state) => state.simulatorTotalSlides);
  const simulatorAutoAdvanceMs = useAddinSimulatorStore((state) => state.simulatorAutoAdvanceMs);
  const setSimulatorConfig = useAddinSimulatorStore((state) => state.setSimulatorConfig);
  const simRef = useRef<SlideSimulator | null>(null);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [jumpInput, setJumpInput] = useState("");

  // Initialize simulator
  useEffect(() => {
    simRef.current = new SlideSimulator({
      totalSlides: simulatorTotalSlides,
      autoAdvanceMs: 0,
      onSlideChange,
    });

    return () => simRef.current?.stop();
  }, [onSlideChange, simulatorTotalSlides]);

  const handleNext = () => simRef.current?.nextSlide();
  const handlePrev = () => simRef.current?.previousSlide();
  const handleReset = () => simRef.current?.reset();

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(jumpInput);
    if (!isNaN(n)) {
      simRef.current?.jumpTo(n);
      setJumpInput("");
    }
  };

  const handleAutoToggle = () => {
    if (!simRef.current) return;
    if (isAutoRunning) {
      simRef.current.stop();
      setIsAutoRunning(false);
    } else {
      simRef.current = new SlideSimulator({
        totalSlides: simulatorTotalSlides,
        autoAdvanceMs: simulatorAutoAdvanceMs || 3000,
        onSlideChange,
      });
      simRef.current.start();
      setIsAutoRunning(true);
    }
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-600">Simulator</p>
        <span className="text-xs text-gray-400">(kein PowerPoint)</span>
      </div>

      <div className="text-center">
        <span className="text-2xl font-bold text-gray-800">{currentSlide}</span>
        <span className="text-xs text-gray-500"> / {totalSlides}</span>
      </div>

      <div className="flex gap-1">
        <button className="btn-secondary flex-1 text-xs" onClick={handlePrev}>←</button>
        <button className="btn-secondary text-xs px-2" onClick={handleReset}>⟳</button>
        <button className="btn-primary flex-1 text-xs" onClick={handleNext}>→</button>
      </div>

      <form className="flex gap-1" onSubmit={handleJump}>
        <input
          type="number"
          className="input-sm flex-1"
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          placeholder="Folie"
          min={1}
          max={totalSlides}
        />
        <button type="submit" className="btn-secondary text-xs px-2">Go</button>
      </form>

      <button
        className={isAutoRunning ? "btn-danger w-full text-xs" : "btn-secondary w-full text-xs"}
        onClick={handleAutoToggle}
      >
        {isAutoRunning ? "Auto-Stop" : "Auto-Advance (3s)"}
      </button>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Folien gesamt:</label>
        <input
          type="number"
          className="input-sm w-16"
          value={simulatorTotalSlides}
          onChange={(e) =>
            setSimulatorConfig(parseInt(e.target.value, 10) || 10, simulatorAutoAdvanceMs)
          }
          min={1}
        />
      </div>
    </div>
  );
}
