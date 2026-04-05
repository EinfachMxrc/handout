/**
 * Reveal Engine – pure TypeScript business logic
 *
 * No UI, no Convex, no React dependencies.
 * Determines which blocks are visible given the current slide and session state.
 */

import type {
  RevealRule,
  BlockVisibilityResult,
  HandoutBlock,
} from "@slide-handout/shared";

export interface BlockInput {
  id: string;
  revealRule: RevealRule;
}

export interface EvaluationContext {
  /** Current slide (1-based) */
  currentSlide: number;
  /** Set of block IDs that have been manually triggered by the presenter */
  manuallyTriggeredBlockIds: Set<string>;
  /**
   * Highest slide number reached so far in this session.
   * Used to implement relockOnBack: when the current slide drops below
   * revealSlide, we can re-lock only if relockOnBack is true.
   */
  highWaterSlide: number;
}

/**
 * Evaluate whether a single block is visible given the current context.
 */
export function evaluateBlock(
  block: BlockInput,
  ctx: EvaluationContext
): BlockVisibilityResult {
  const rule = block.revealRule;

  // 1. alwaysVisible overrides everything
  if (rule.alwaysVisible) {
    return { blockId: block.id, visible: true, reason: "always_visible" };
  }

  // 2. manuallyTriggered blocks only appear when explicitly unlocked
  if (rule.manuallyTriggered) {
    const triggered = ctx.manuallyTriggeredBlockIds.has(block.id);
    return {
      blockId: block.id,
      visible: triggered,
      reason: triggered ? "manual_trigger" : "manual_only",
    };
  }

  const slide = ctx.currentSlide;
  const revealAt = rule.revealSlide;

  // 3. relockOnBack: if the user went back below revealSlide, re-lock
  if (rule.relockOnBack && slide < revealAt) {
    return { blockId: block.id, visible: false, reason: "relocked" };
  }

  // 4. Standard: block becomes visible when slide >= revealSlide
  //    Without relockOnBack: once revealed via highWaterSlide, stays visible
  const effectiveSlide = rule.relockOnBack ? slide : Math.max(slide, ctx.highWaterSlide);

  if (effectiveSlide < revealAt) {
    return { blockId: block.id, visible: false, reason: "before_reveal" };
  }

  // 5. revealToSlide: block is hidden again after this slide
  if (rule.revealToSlide !== undefined) {
    if (slide > rule.revealToSlide) {
      return { blockId: block.id, visible: false, reason: "after_to_slide" };
    }
  }

  return { blockId: block.id, visible: true, reason: "slide_reached" };
}

/**
 * Evaluate all blocks and return which are visible.
 */
export function evaluateAllBlocks(
  blocks: BlockInput[],
  ctx: EvaluationContext
): BlockVisibilityResult[] {
  return blocks.map((block) => evaluateBlock(block, ctx));
}

/**
 * Filter blocks to only visible ones, sorted by order.
 */
export function getVisibleBlocks(
  blocks: HandoutBlock[],
  ctx: EvaluationContext
): HandoutBlock[] {
  const results = evaluateAllBlocks(blocks, ctx);
  const visibleIds = new Set(
    results.filter((r) => r.visible).map((r) => r.blockId)
  );
  return blocks
    .filter((b) => visibleIds.has(b.id))
    .sort((a, b) => a.order - b.order);
}

/**
 * Build a fresh EvaluationContext for a new session (slide 1, no history).
 */
export function createInitialContext(
  overrides?: Partial<EvaluationContext>
): EvaluationContext {
  return {
    currentSlide: 1,
    manuallyTriggeredBlockIds: new Set(),
    highWaterSlide: 1,
    ...overrides,
  };
}

/**
 * Advance context to a new slide, updating highWaterSlide.
 */
export function advanceContext(
  ctx: EvaluationContext,
  newSlide: number
): EvaluationContext {
  return {
    ...ctx,
    currentSlide: newSlide,
    highWaterSlide: Math.max(ctx.highWaterSlide, newSlide),
  };
}
