// ============================================================
// Core Domain Types
// Shared across: web app, reveal-engine, convex, powerpoint-addin
// ============================================================

export type SessionStatus = "draft" | "live" | "ended";
export type SyncMode = "auto" | "hybrid" | "manual";

// ---- Reveal Rule ----
export interface RevealRule {
  /** 1-based slide number at which this block becomes visible */
  revealSlide: number;
  /** Optional: hide block again after this slide (1-based) */
  revealToSlide?: number;
  /** Re-lock the block if presenter goes back before revealSlide. Default: false */
  relockOnBack?: boolean;
  /** Block is always visible, ignores slide logic */
  alwaysVisible?: boolean;
  /** Block only becomes visible when manually triggered by presenter */
  manuallyTriggered?: boolean;
}

// ---- Handout Block ----
export interface HandoutBlock {
  id: string;
  handoutId: string;
  title: string;
  /** Markdown or rich text content */
  content: string;
  /** 0-based ordering index */
  order: number;
  revealRule: RevealRule;
  createdAt: number;
  updatedAt: number;
}

// ---- Handout ----
export interface Handout {
  id: string;
  presenterId: string;
  title: string;
  description?: string;
  blocks: HandoutBlock[];
  createdAt: number;
  updatedAt: number;
}

// ---- Presentation Session ----
export interface PresentationSession {
  id: string;
  handoutId: string;
  presenterId: string;
  /** Public token for handout URL: /h/[publicToken] */
  publicToken: string;
  status: SessionStatus;
  syncMode: SyncMode;
  /** Current slide (1-based) */
  currentSlide: number;
  /** Total slide count (if known from PowerPoint) */
  totalSlides?: number;
  /** Presentation title from PowerPoint (if available) */
  presentationTitle?: string;
  /** IDs of blocks that have been manually triggered */
  manuallyTriggeredBlockIds: string[];
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
}

// ---- Public Session (safe to send to unauthenticated clients) ----
export interface PublicSession {
  id: string;
  handoutTitle: string;
  handoutDescription?: string;
  status: SessionStatus;
  currentSlide: number;
}

// ---- Public Visible Block (safe to send to unauthenticated clients) ----
export interface PublicHandoutBlock {
  id: string;
  title: string;
  content: string;
  order: number;
}

// ---- Slide Change Event (from Add-in or Simulator) ----
export interface SlideChangeEvent {
  slideNumber: number;
  totalSlides?: number;
  source: "powerpoint" | "simulator" | "manual";
}

// ---- Add-in Connection Status ----
export interface AddinConnectionStatus {
  connected: boolean;
  sessionId?: string;
  syncMode: SyncMode;
  currentSlide?: number;
  presentationTitle?: string;
  lastSyncAt?: number;
  error?: string;
}

// ---- Presenter Auth ----
export interface PresenterCredentials {
  email: string;
  password: string;
}

// ---- Block Visibility Result (from Reveal Engine) ----
export interface BlockVisibilityResult {
  blockId: string;
  visible: boolean;
  reason: "always_visible" | "slide_reached" | "manual_trigger" | "before_reveal" | "after_to_slide" | "relocked" | "manual_only";
}
