/**
 * Slide Simulator – for local development without PowerPoint.
 *
 * Emulates slide changes by firing events at a configurable interval.
 * Uses the same callback interface as officeBridge.
 */

export interface SimulatorConfig {
  totalSlides: number;
  /** ms between auto-advance steps (0 = disabled) */
  autoAdvanceMs: number;
  onSlideChange: (slideNumber: number, total: number) => void;
}

export class SlideSimulator {
  private currentSlide = 1;
  private totalSlides: number;
  private autoAdvanceMs: number;
  private onSlideChange: (slideNumber: number, total: number) => void;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: SimulatorConfig) {
    this.totalSlides = config.totalSlides;
    this.autoAdvanceMs = config.autoAdvanceMs;
    this.onSlideChange = config.onSlideChange;
  }

  start() {
    if (this.autoAdvanceMs > 0) {
      this.timer = setInterval(() => {
        if (this.currentSlide < this.totalSlides) {
          this.nextSlide();
        } else {
          this.stop();
        }
      }, this.autoAdvanceMs);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  nextSlide() {
    if (this.currentSlide < this.totalSlides) {
      this.currentSlide++;
      this.emit();
    }
  }

  previousSlide() {
    if (this.currentSlide > 1) {
      this.currentSlide--;
      this.emit();
    }
  }

  jumpTo(slide: number) {
    const clamped = Math.max(1, Math.min(slide, this.totalSlides));
    this.currentSlide = clamped;
    this.emit();
  }

  reset() {
    this.currentSlide = 1;
    this.emit();
  }

  getState() {
    return { currentSlide: this.currentSlide, totalSlides: this.totalSlides };
  }

  private emit() {
    this.onSlideChange(this.currentSlide, this.totalSlides);
  }
}
