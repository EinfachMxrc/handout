import { describe, it, expect } from "vitest";
import {
  evaluateBlock,
  evaluateAllBlocks,
  getVisibleBlocks,
  createInitialContext,
  advanceContext,
  type BlockInput,
  type EvaluationContext,
} from "../revealEngine.js";
import type { HandoutBlock } from "@slide-handout/shared";

// ---- Helpers ----
function makeBlock(
  id: string,
  revealSlide: number,
  overrides?: Partial<BlockInput["revealRule"]>
): BlockInput {
  return {
    id,
    revealRule: {
      revealSlide,
      ...overrides,
    },
  };
}

function makeHandoutBlock(
  id: string,
  order: number,
  revealSlide: number,
  overrides?: Partial<HandoutBlock["revealRule"]>
): HandoutBlock {
  return {
    id,
    handoutId: "h1",
    title: `Block ${id}`,
    content: `Content for ${id}`,
    order,
    revealRule: { revealSlide, ...overrides },
    createdAt: 0,
    updatedAt: 0,
  };
}

function ctx(slide: number, highWater?: number, triggered?: string[]): EvaluationContext {
  return {
    currentSlide: slide,
    highWaterSlide: highWater ?? slide,
    manuallyTriggeredBlockIds: new Set(triggered ?? []),
  };
}

// ============================================================
// ACCEPTANCE SCENARIO:
//   Block A from slide 1, Block B from slide 3, Block C from slide 5
// ============================================================
describe("Acceptance scenario", () => {
  const blockA = makeHandoutBlock("A", 0, 1);
  const blockB = makeHandoutBlock("B", 1, 3);
  const blockC = makeHandoutBlock("C", 2, 5);
  const blocks = [blockA, blockB, blockC];

  it("slide 1 → only A visible", () => {
    const visible = getVisibleBlocks(blocks, ctx(1));
    expect(visible.map((b) => b.id)).toEqual(["A"]);
  });

  it("slide 3 → A and B visible", () => {
    const visible = getVisibleBlocks(blocks, ctx(3));
    expect(visible.map((b) => b.id)).toEqual(["A", "B"]);
  });

  it("slide 5 → A, B, C visible", () => {
    const visible = getVisibleBlocks(blocks, ctx(5));
    expect(visible.map((b) => b.id)).toEqual(["A", "B", "C"]);
  });

  it("slide 4 after reaching 5 → all still visible (highWater=5)", () => {
    const c = advanceContext(advanceContext(ctx(1), 5), 4);
    const visible = getVisibleBlocks(blocks, c);
    expect(visible.map((b) => b.id)).toEqual(["A", "B", "C"]);
  });
});

// ============================================================
// BASIC REVEAL
// ============================================================
describe("Basic reveal", () => {
  it("block not visible before revealSlide", () => {
    const result = evaluateBlock(makeBlock("x", 3), ctx(2));
    expect(result.visible).toBe(false);
    expect(result.reason).toBe("before_reveal");
  });

  it("block visible exactly at revealSlide", () => {
    const result = evaluateBlock(makeBlock("x", 3), ctx(3));
    expect(result.visible).toBe(true);
    expect(result.reason).toBe("slide_reached");
  });

  it("block visible after revealSlide", () => {
    const result = evaluateBlock(makeBlock("x", 3), ctx(10));
    expect(result.visible).toBe(true);
  });

  it("once revealed, stays visible when going back (default behavior)", () => {
    // highWater was 5, now at slide 1 – block should still be visible
    const result = evaluateBlock(makeBlock("x", 3), ctx(1, 5));
    expect(result.visible).toBe(true);
  });
});

// ============================================================
// ALWAYS VISIBLE
// ============================================================
describe("alwaysVisible", () => {
  it("visible even before revealSlide", () => {
    const block = makeBlock("x", 999, { alwaysVisible: true });
    expect(evaluateBlock(block, ctx(1)).visible).toBe(true);
    expect(evaluateBlock(block, ctx(1)).reason).toBe("always_visible");
  });
});

// ============================================================
// RELOCK ON BACK
// ============================================================
describe("relockOnBack", () => {
  it("revealed when at revealSlide", () => {
    const block = makeBlock("x", 3, { relockOnBack: true });
    expect(evaluateBlock(block, ctx(3)).visible).toBe(true);
  });

  it("re-locked when going back below revealSlide", () => {
    const block = makeBlock("x", 3, { relockOnBack: true });
    const result = evaluateBlock(block, ctx(2, 5));
    expect(result.visible).toBe(false);
    expect(result.reason).toBe("relocked");
  });

  it("without relockOnBack: stays visible when going back", () => {
    const block = makeBlock("x", 3, { relockOnBack: false });
    const result = evaluateBlock(block, ctx(1, 5));
    expect(result.visible).toBe(true);
  });
});

// ============================================================
// REVEAL TO SLIDE
// ============================================================
describe("revealToSlide", () => {
  it("visible within range", () => {
    const block = makeBlock("x", 2, { revealToSlide: 4 });
    expect(evaluateBlock(block, ctx(2)).visible).toBe(true);
    expect(evaluateBlock(block, ctx(3)).visible).toBe(true);
    expect(evaluateBlock(block, ctx(4)).visible).toBe(true);
  });

  it("hidden after revealToSlide", () => {
    const block = makeBlock("x", 2, { revealToSlide: 4 });
    const result = evaluateBlock(block, ctx(5));
    expect(result.visible).toBe(false);
    expect(result.reason).toBe("after_to_slide");
  });
});

// ============================================================
// MANUALLY TRIGGERED
// ============================================================
describe("manuallyTriggered", () => {
  it("not visible without manual trigger", () => {
    const block = makeBlock("x", 1, { manuallyTriggered: true });
    const result = evaluateBlock(block, ctx(5));
    expect(result.visible).toBe(false);
    expect(result.reason).toBe("manual_only");
  });

  it("visible when manually triggered", () => {
    const block = makeBlock("x", 1, { manuallyTriggered: true });
    const result = evaluateBlock(block, ctx(5, 5, ["x"]));
    expect(result.visible).toBe(true);
    expect(result.reason).toBe("manual_trigger");
  });
});

// ============================================================
// ADVANCE CONTEXT
// ============================================================
describe("advanceContext", () => {
  it("updates currentSlide and highWaterSlide forward", () => {
    const c = advanceContext(createInitialContext(), 5);
    expect(c.currentSlide).toBe(5);
    expect(c.highWaterSlide).toBe(5);
  });

  it("does not lower highWaterSlide when going back", () => {
    const c1 = advanceContext(createInitialContext(), 5);
    const c2 = advanceContext(c1, 2);
    expect(c2.currentSlide).toBe(2);
    expect(c2.highWaterSlide).toBe(5);
  });
});

// ============================================================
// EVALUATE ALL BLOCKS
// ============================================================
describe("evaluateAllBlocks", () => {
  it("returns results for all blocks", () => {
    const blocks = [makeBlock("a", 1), makeBlock("b", 3), makeBlock("c", 5)];
    const results = evaluateAllBlocks(blocks, ctx(3));
    expect(results).toHaveLength(3);
    expect(results.find((r) => r.blockId === "a")?.visible).toBe(true);
    expect(results.find((r) => r.blockId === "b")?.visible).toBe(true);
    expect(results.find((r) => r.blockId === "c")?.visible).toBe(false);
  });
});
