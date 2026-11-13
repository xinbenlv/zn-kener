/**
 * Squarified treemap layout (Bruls, Huizing and van Wijk, 2000): splits a rectangle into one
 * rectangle per item, area proportional to `value`, with aspect ratios kept close to 1.
 * Items keep their input order; sort them by value (largest first) for the best shapes.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Placed<T> = Rect & { item: T };

const worst = (row: number[], side: number): number => {
  const sum = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
};

export const Squarify = <T>(items: T[], value: (item: T) => number, rect: Rect): Placed<T>[] => {
  const list = items.filter((it) => value(it) > 0);
  const total = list.reduce((a, it) => a + value(it), 0);
  if (!list.length || rect.w <= 0 || rect.h <= 0) return [];
  const scale = (rect.w * rect.h) / total;
  const areas = list.map((it) => value(it) * scale);
  const out: Placed<T>[] = [];
  let { x, y, w, h } = rect;
  let i = 0;
  while (i < list.length) {
    const side = Math.min(w, h);
    const row = [areas[i]];
    let j = i + 1;
    while (j < list.length && worst([...row, areas[j]], side) <= worst(row, side)) row.push(areas[j++]);
    const sum = row.reduce((a, b) => a + b, 0);
    if (w >= h) {
      // Lay the row out as a column on the left.
      const cw = sum / h;
      let cy = y;
      row.forEach((a, k) => {
        out.push({ x, y: cy, w: cw, h: a / cw, item: list[i + k] });
        cy += a / cw;
      });
      x += cw;
      w -= cw;
    } else {
      // Lay the row out along the top.
      const rh = sum / w;
      let cx = x;
      row.forEach((a, k) => {
        out.push({ x: cx, y, w: a / rh, h: rh, item: list[i + k] });
        cx += a / rh;
      });
      y += rh;
      h -= rh;
    }
    i = j;
  }
  return out;
};

/** Shrinks a rectangle by `pad` on every side and by `top` more at the top. */
export const Inset = (r: Rect, pad: number, top = 0): Rect => ({
  x: r.x + pad,
  y: r.y + pad + top,
  w: Math.max(0, r.w - pad * 2),
  h: Math.max(0, r.h - pad * 2 - top),
});
