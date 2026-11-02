export type Point = [number, number];
export type DrawingUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft' | 'km';
export type UnitChoice = DrawingUnit | 'auto';
export interface Segment {
  id: string;
  a: Point;
  b: Point;
  layer: string;
  type: string;
  entityId: string;
}
export interface Drawing {
  name: string;
  segments: Segment[];
  unit: DrawingUnit | null;
  warnings: string[];
  entityCounts: Record<string, number>;
}
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  depth: number;
}
export const UNIT_SCALE: Record<DrawingUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
  km: 1000,
};
export const UNIT_LABEL: Record<DrawingUnit, string> = {
  mm: '毫米',
  cm: '厘米',
  m: '米',
  in: '英寸',
  ft: '英尺',
  km: '千米',
};
const MAX_SEGMENTS = 12000;
type Token = { code: number; value: string };
type Entity = { type: string; values: Token[] };
type Vertex = { point: Point; bulge: number };

export function getBounds(segments: Segment[]): Bounds {
  if (!segments.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, depth: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const { a, b } of segments) {
    minX = Math.min(minX, a[0], b[0]);
    minY = Math.min(minY, a[1], b[1]);
    maxX = Math.max(maxX, a[0], b[0]);
    maxY = Math.max(maxY, a[1], b[1]);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, depth: maxY - minY };
}
export function toMeters(drawing: Drawing, choice: UnitChoice): Segment[] {
  // 未声明单位的图纸暂按毫米处理，界面会提示用户确认或手动选择。
  const scale = UNIT_SCALE[choice === 'auto' ? (drawing.unit ?? 'mm') : choice];
  const bounds = getBounds(drawing.segments);
  const cx = bounds.minX + bounds.width / 2,
    cy = bounds.minY + bounds.depth / 2;
  return drawing.segments.map((s) => ({
    ...s,
    a: [(s.a[0] - cx) * scale, (s.a[1] - cy) * scale],
    b: [(s.b[0] - cx) * scale, (s.b[1] - cy) * scale],
  }));
}
export const segmentLength = (s: Segment) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);

/** 解析 ASCII DXF 的 ENTITIES，统一为保留图层及实体来源的线段。 */
export function parseDXF(text: string, name = '导入图纸.dxf', curveSegments = 48): Drawing {
  if (/^AutoCAD Binary DXF/i.test(text) || text.includes('\0'))
    throw new Error('暂不支持二进制 DXF，请在 CAD 中另存为 ASCII DXF。');
  const lines = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  while (lines.at(-1)?.trim() === '') lines.pop();
  if (!lines.length || lines.length % 2)
    throw new Error('DXF 组码和值不完整，请检查文件是否为 ASCII DXF。');
  if (lines.length > 600000) throw new Error('图纸记录过多，请仅导出需要的平面图层。');
  const tokens: Token[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    if (!/^\d+$/.test(lines[i]!.trim())) throw new Error(`第 ${i + 1} 行组码无效。`);
    tokens.push({ code: Number(lines[i]!.trim()), value: lines[i + 1]!.trim() });
  }
  const drawing: Drawing = { name, segments: [], unit: null, warnings: [], entityCounts: {} };
  const warn = (message: string) => {
    if (!drawing.warnings.includes(message)) drawing.warnings.push(message);
  };
  const units: Record<number, DrawingUnit> = {
    1: 'in',
    2: 'ft',
    4: 'mm',
    5: 'cm',
    6: 'm',
    7: 'km',
  };
  let section = '',
    foundEntities = false;
  const records: Entity[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.code === 0 && token.value === 'SECTION') {
      const next = tokens[++i];
      section = next?.code === 2 ? next.value : '';
      continue;
    }
    if (token.code === 0 && token.value === 'ENDSEC') {
      section = '';
      continue;
    }
    if (section === 'HEADER' && token.code === 9 && token.value === '$INSUNITS') {
      const unitToken = tokens[i + 1];
      if (unitToken?.code === 70) drawing.unit = units[Number(unitToken.value)] ?? null;
    }
    if (section !== 'ENTITIES') continue;
    foundEntities = true;
    if (token.code === 0) {
      const values: Token[] = [];
      while (tokens[i + 1] && tokens[i + 1]!.code !== 0) values.push(tokens[++i]!);
      records.push({ type: token.value.toUpperCase(), values });
    }
  }
  if (!foundEntities) throw new Error('未找到 ENTITIES 图形段，请导出包含平面图实体的 DXF。');
  const value = (entity: Entity, code: number) => entity.values.find((v) => v.code === code)?.value;
  const number = (entity: Entity, code: number, fallback?: number) => {
    const raw = value(entity, code);
    const n = raw === undefined ? fallback : raw === '' ? NaN : Number(raw);
    return n !== undefined && Number.isFinite(n) && Math.abs(n) <= 1e12 ? n : NaN;
  };
  const quality = Math.min(
    128,
    Math.max(12, Math.round(Number.isFinite(curveSegments) ? curveSegments : 48))
  );
  const unique = new Set<string>();
  let invalid = 0,
    duplicates = 0;
  const append = (a: Point, b: Point, entity: Entity, entityId: string) => {
    if (
      ![...a, ...b].every((n) => Number.isFinite(n) && Math.abs(n) <= 1e12) ||
      Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-9
    ) {
      invalid++;
      return;
    }
    const layer = value(entity, 8) || '0';
    const ends = [
      a.map((n) => n.toPrecision(13)).join(','),
      b.map((n) => n.toPrecision(13)).join(','),
    ].sort();
    const key = JSON.stringify([layer, ...ends]);
    if (unique.has(key)) {
      duplicates++;
      return;
    }
    if (drawing.segments.length >= MAX_SEGMENTS)
      throw new Error(`线段超过 ${MAX_SEGMENTS} 段，请精简图层后再导入。`);
    unique.add(key);
    drawing.segments.push({
      id: `segment-${drawing.segments.length + 1}`,
      a,
      b,
      layer,
      type: entity.type,
      entityId,
    });
  };
  const arc = (
    center: Point,
    radius: number,
    start: number,
    sweep: number,
    entity: Entity,
    entityId: string
  ) => {
    if (
      ![...center, radius, start, sweep].every(Number.isFinite) ||
      radius <= 0 ||
      Math.abs(sweep) < 1e-12
    ) {
      invalid++;
      return;
    }
    const count = Math.max(2, Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * quality));
    const point = (angle: number): Point => [
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle),
    ];
    for (let i = 0; i < count; i++)
      append(
        point(start + (sweep * i) / count),
        point(start + (sweep * (i + 1)) / count),
        entity,
        entityId
      );
  };
  const polyline = (vertices: Vertex[], closed: boolean, entity: Entity, entityId: string) => {
    if (vertices.length < 2) {
      invalid++;
      return;
    }
    const count = closed ? vertices.length : vertices.length - 1;
    for (let i = 0; i < count; i++) {
      const v = vertices[i]!,
        next = vertices[(i + 1) % vertices.length]!;
      const [a, b] = [v.point, next.point];
      const bulge = v.bulge;
      if (!Number.isFinite(bulge)) {
        invalid++;
        continue;
      }
      if (Math.abs(bulge) < 1e-10) {
        append(a, b, entity, entityId);
        continue;
      }
      const dx = b[0] - a[0],
        dy = b[1] - a[1],
        chord = Math.hypot(dx, dy);
      if (!Number.isFinite(chord) || chord < 1e-9) {
        invalid++;
        continue;
      }
      const offset = (chord * (1 - bulge * bulge)) / (4 * bulge);
      const center: Point = [
        (a[0] + b[0]) / 2 - (dy / chord) * offset,
        (a[1] + b[1]) / 2 + (dx / chord) * offset,
      ];
      arc(
        center,
        (chord * (1 + bulge * bulge)) / (4 * Math.abs(bulge)),
        Math.atan2(a[1] - center[1], a[0] - center[0]),
        4 * Math.atan(bulge),
        entity,
        entityId
      );
    }
  };
  for (let i = 0; i < records.length; i++) {
    const entity = records[i]!;
    const entityId = value(entity, 5) || `entity-${i + 1}`;
    drawing.entityCounts[entity.type] = (drawing.entityCounts[entity.type] ?? 0) + 1;
    const extrusionX = number(entity, 210, 0),
      extrusionY = number(entity, 220, 0),
      extrusionZ = number(entity, 230, 1);
    if (extrusionX !== 0 || extrusionY !== 0 || extrusionZ !== 1) {
      warn('非默认 OCS 坐标系的实体已跳过，请在 CAD 中转为 XY 平面。');
      continue;
    }
    if (entity.type === 'LINE') {
      append(
        [number(entity, 10), number(entity, 20)],
        [number(entity, 11), number(entity, 21)],
        entity,
        entityId
      );
    } else if (entity.type === 'LWPOLYLINE') {
      const vertices: Vertex[] = [];
      for (const token of entity.values) {
        if (token.code === 10)
          vertices.push({ point: [token.value === '' ? NaN : Number(token.value), NaN], bulge: 0 });
        else if (token.code === 20 && vertices.length)
          vertices.at(-1)!.point[1] = token.value === '' ? NaN : Number(token.value);
        else if (token.code === 42 && vertices.length) vertices.at(-1)!.bulge = Number(token.value);
      }
      polyline(vertices, (number(entity, 70, 0) & 1) !== 0, entity, entityId);
    } else if (entity.type === 'POLYLINE') {
      const vertices: Vertex[] = [];
      while (records[i + 1]?.type === 'VERTEX') {
        const vertex = records[++i]!;
        vertices.push({
          point: [number(vertex, 10), number(vertex, 20)],
          bulge: number(vertex, 42, 0),
        });
      }
      if (records[i + 1]?.type === 'SEQEND') i++;
      if ((number(entity, 70, 0) & (8 | 16 | 64)) !== 0) {
        warn('三维多段线或网格已跳过，仅支持二维 POLYLINE。');
        continue;
      }
      polyline(vertices, (number(entity, 70, 0) & 1) !== 0, entity, entityId);
    } else if (entity.type === 'CIRCLE' || entity.type === 'ARC') {
      const start = entity.type === 'CIRCLE' ? 0 : (number(entity, 50) * Math.PI) / 180;
      const end = (number(entity, 51) * Math.PI) / 180;
      const sweep =
        entity.type === 'CIRCLE'
          ? Math.PI * 2
          : (((end - start) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      arc(
        [number(entity, 10), number(entity, 20)],
        number(entity, 40),
        start,
        sweep,
        entity,
        entityId
      );
    } else {
      warn(`未转换 ${entity.type} 实体（块、文字、标注及填充不自动生成墙体）。`);
    }
  }
  if (invalid) warn(`已跳过 ${invalid} 段无效坐标或零长度线段。`);
  if (duplicates) warn(`已合并 ${duplicates} 段同图层重复线段。`);
  if (!drawing.segments.length)
    throw new Error('未找到有效线段。支持 LINE、LWPOLYLINE、二维 POLYLINE、CIRCLE 和 ARC。');
  return drawing;
}

export function createSample(kind: 'home' | 'office'): Drawing {
  const segments: Segment[] = [];
  const add = (a: Point, b: Point, layer = '墙体') =>
    segments.push({
      id: `sample-${segments.length + 1}`,
      a,
      b,
      layer,
      type: 'LINE',
      entityId: `sample-${segments.length + 1}`,
    });
  const width = kind === 'home' ? 12 : 18,
    depth = kind === 'home' ? 9 : 12;
  // 预留门口，内墙中心线均保留实际米制尺寸。
  add([0, 0], [width / 2 - 0.6, 0]);
  add([width / 2 + 0.6, 0], [width, 0]);
  add([width, 0], [width, depth]);
  add([width, depth], [0, depth]);
  add([0, depth], [0, 0]);
  if (kind === 'home') {
    add([5, 0], [5, 3]);
    add([5, 4], [5, 9]);
    add([5, 5], [8, 5]);
    add([9, 5], [12, 5]);
    add([0, 5.5], [2, 5.5]);
    add([3, 5.5], [5, 5.5]);
  } else {
    for (const x of [6, 12]) {
      add([x, 0], [x, 4]);
      add([x, 5], [x, 12]);
    }
    for (const [a, b] of [
      [0, 2],
      [3, 8],
      [9, 14],
      [15, 18],
    ])
      add([a!, 7], [b!, 7]);
  }
  add([1, 1], [3, 1], '家具参考');
  add([3, 1], [3, 2.2], '家具参考');
  add([3, 2.2], [1, 2.2], '家具参考');
  add([1, 2.2], [1, 1], '家具参考');
  return {
    name: kind === 'home' ? '三居室 · 12 × 9 m' : '开放办公 · 18 × 12 m',
    segments,
    unit: 'm',
    warnings: [],
    entityCounts: { LINE: segments.length },
  };
}
export function serializeDXF(drawing: Drawing) {
  const codes: Record<DrawingUnit, number> = { in: 1, ft: 2, mm: 4, cm: 5, m: 6, km: 7 };
  const lines = [
    '0',
    'SECTION',
    '2',
    'HEADER',
    '9',
    '$INSUNITS',
    '70',
    String(drawing.unit ? codes[drawing.unit] : 0),
    '0',
    'ENDSEC',
    '0',
    'SECTION',
    '2',
    'ENTITIES',
  ];
  for (const s of drawing.segments)
    lines.push(
      '0',
      'LINE',
      '8',
      s.layer,
      '10',
      String(s.a[0]),
      '20',
      String(s.a[1]),
      '11',
      String(s.b[0]),
      '21',
      String(s.b[1])
    );
  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\n') + '\n';
}
export function createPlanSVG(segments: Segment[]) {
  const b = getBounds(segments),
    padding = Math.max(b.width, b.depth, 1) * 0.04;
  const width = Math.max(b.width, 0.1) + padding * 2,
    height = Math.max(b.depth, 0.1) + padding * 2;
  const stroke = Math.max(width, height) / 600;
  const lines = segments
    .map((s) => `<line x1="${s.a[0]}" y1="${-s.a[1]}" x2="${s.b[0]}" y2="${-s.b[1]}"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.minX - padding} ${-b.maxY - padding} ${width} ${height}" width="1200" height="${Math.round((1200 * height) / width)}"><rect x="${b.minX - padding}" y="${-b.maxY - padding}" width="${width}" height="${height}" fill="white"/><g stroke="#197f80" stroke-width="${stroke}" stroke-linecap="round" fill="none">${lines}</g></svg>`;
}
