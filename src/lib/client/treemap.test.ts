import { describe, expect, it } from "vitest";
import { Inset, Squarify } from "./treemap";

const area = (r: { w: number; h: number }) => r.w * r.h;

describe("Squarify", () => {
  it("gives each item an area proportional to its value and fills the rectangle", () => {
    const items = [6, 6, 4, 3, 2, 2, 1];
    const out = Squarify(items, (v) => v, { x: 0, y: 0, w: 600, h: 400 });
    expect(out).toHaveLength(items.length);
    const total = items.reduce((a, b) => a + b, 0);
    out.forEach((r) => expect(area(r)).toBeCloseTo((r.item / total) * 600 * 400, 6));
    expect(out.reduce((a, r) => a + area(r), 0)).toBeCloseTo(600 * 400, 6);
    out.forEach((r) => {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(600 + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(400 + 1e-6);
    });
  });

  it("keeps cells close to square", () => {
    const out = Squarify([1, 1, 1, 1], (v) => v, { x: 0, y: 0, w: 200, h: 200 });
    out.forEach((r) => expect(Math.max(r.w / r.h, r.h / r.w)).toBeLessThan(1.01));
  });

  it("skips zero values and handles an empty or flat rectangle", () => {
    expect(Squarify([0, 2], (v) => v, { x: 0, y: 0, w: 10, h: 10 })).toHaveLength(1);
    expect(Squarify([], (v: number) => v, { x: 0, y: 0, w: 10, h: 10 })).toEqual([]);
    expect(Squarify([1], (v) => v, { x: 0, y: 0, w: 0, h: 10 })).toEqual([]);
  });
});

describe("Inset", () => {
  it("shrinks every side and never goes negative", () => {
    expect(Inset({ x: 0, y: 0, w: 100, h: 50 }, 4, 16)).toEqual({ x: 4, y: 20, w: 92, h: 26 });
    expect(Inset({ x: 0, y: 0, w: 4, h: 4 }, 4, 16)).toMatchObject({ w: 0, h: 0 });
  });
});
