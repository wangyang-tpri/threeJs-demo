import type { Bounds, Point, Segment } from './dxf';
export const furnitureCatalog = {
  sofa: { name: '双人沙发', width: 2.2, depth: 0.9, height: 0.85, color: '#85a89b', price: 2800 },
  bed: { name: '双人床', width: 1.8, depth: 2.1, height: 0.65, color: '#c6ad91', price: 3500 },
  table: { name: '餐桌', width: 1.4, depth: 0.8, height: 0.75, color: '#ad815c', price: 1600 },
  chair: { name: '座椅', width: 0.5, depth: 0.5, height: 0.85, color: '#9babb9', price: 450 },
  cabinet: { name: '储物柜', width: 1.2, depth: 0.5, height: 1.8, color: '#d9c7ac', price: 2200 },
  plant: { name: '绿植', width: 0.55, depth: 0.55, height: 1.1, color: '#5b936e', price: 260 },
};
export type FurnitureKind = keyof typeof furnitureCatalog;
export interface Furniture {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color: string;
}
export type FloorFinish = 'wood' | 'tile' | 'plain';
export interface InteriorDesign {
  items: Furniture[];
  floor: FloorFinish;
  floorColor: string;
}
export function footprint(item: Furniture): Point[] {
  const r = (item.rotation * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => [
    item.x + ((x! * item.width) / 2) * c - ((y! * item.depth) / 2) * s,
    item.y + ((x! * item.width) / 2) * s + ((y! * item.depth) / 2) * c,
  ]);
}
// 将墙段变换到家具局部坐标，使用 slab 区间裁剪判断与膨胀矩形相交。
export function touchesWall(item: Furniture, wall: Segment, thickness: number) {
  const r = (-item.rotation * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r);
  const local = (p: Point) => [
    (p[0] - item.x) * c - (p[1] - item.y) * s,
    (p[0] - item.x) * s + (p[1] - item.y) * c,
  ];
  const a = local(wall.a),
    b = local(wall.b),
    half = [item.width / 2 + thickness / 2, item.depth / 2 + thickness / 2];
  let lo = 0,
    hi = 1;
  for (let axis = 0; axis < 2; axis++) {
    const d = b[axis]! - a[axis]!;
    if (Math.abs(d) < 1e-10) {
      if (Math.abs(a[axis]!) > half[axis]!) return false;
    } else {
      const t1 = (-half[axis]! - a[axis]!) / d,
        t2 = (half[axis]! - a[axis]!) / d;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
      if (lo > hi) return false;
    }
  }
  return true;
}
export function overlaps(a: Furniture, b: Furniture) {
  const pa = footprint(a),
    pb = footprint(b);
  for (const poly of [pa, pb])
    for (let i = 0; i < 2; i++) {
      const p = poly[i]!,
        q = poly[i + 1]!,
        axis = [-(q[1] - p[1]), q[0] - p[0]];
      const project = (points: Point[]) => points.map((v) => v[0] * axis[0]! + v[1] * axis[1]!);
      const av = project(pa),
        bv = project(pb);
      if (Math.max(...av) <= Math.min(...bv) + 1e-6 || Math.max(...bv) <= Math.min(...av) + 1e-6)
        return false;
    }
  return true;
}
export function designWarnings(
  items: Furniture[],
  bounds: Bounds,
  walls: Segment[],
  thickness: number
) {
  return items.flatMap((item) => {
    const messages: string[] = [];
    if (
      footprint(item).some(
        ([x, y]) => x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY
      )
    )
      messages.push('超出图纸包围范围');
    if (walls.some((w) => touchesWall(item, w, thickness))) messages.push('与可见墙段相交');
    if (items.some((other) => other.id !== item.id && overlaps(item, other)))
      messages.push('与其他家具重叠');
    return messages.length
      ? [{ id: item.id, name: furnitureCatalog[item.kind].name, messages }]
      : [];
  });
}
export function validateDesign(value: unknown): InteriorDesign {
  const d = value as InteriorDesign;
  if (
    !d ||
    !['wood', 'tile', 'plain'].includes(d.floor) ||
    !/^#[\da-f]{6}$/i.test(d.floorColor) ||
    !Array.isArray(d.items) ||
    d.items.length > 100
  )
    throw new Error('方案格式无效（最多 100 件家具）。');
  const ids = new Set<string>();
  for (const f of d.items) {
    if (
      !f ||
      typeof f.id !== 'string' ||
      !f.id ||
      ids.has(f.id) ||
      !Object.hasOwn(furnitureCatalog, f.kind) ||
      !/^#[\da-f]{6}$/i.test(f.color) ||
      ![f.x, f.y, f.rotation, f.width, f.depth, f.height].every(Number.isFinite) ||
      Math.abs(f.x) > 100000 ||
      Math.abs(f.y) > 100000 ||
      Math.abs(f.rotation) > 360 ||
      [f.width, f.depth, f.height].some((n) => n < 0.1 || n > 10)
    )
      throw new Error('家具参数无效或编号重复。');
    ids.add(f.id);
  }
  return {
    floor: d.floor,
    floorColor: d.floorColor,
    items: d.items.map((f) => ({
      id: f.id,
      kind: f.kind,
      x: f.x,
      y: f.y,
      width: f.width,
      depth: f.depth,
      height: f.height,
      rotation: f.rotation,
      color: f.color,
    })),
  };
}
