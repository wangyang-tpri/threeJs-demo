export type StockStatus = 'normal' | 'low' | 'empty' | 'blocked';
export type JobKind = 'inbound' | 'outbound';
export type Point = [number, number];
export interface Bin {
  id: string;
  rack: string;
  area: 'A区' | 'B区';
  bay: number;
  level: number;
  x: number;
  z: number;
  sku: string;
  name: string;
  quantity: number;
  capacity: number;
  threshold: number;
  blocked: boolean;
}
export const RACKS = Array.from({ length: 8 }, (_, i) => ({
  id: `${i < 4 ? 'A' : 'B'}${String((i % 4) + 1).padStart(2, '0')}`,
  x: [-7.5, -2.5, 2.5, 7.5][i % 4]!,
  z: i < 4 ? -4 : 4,
}));
export const DOCK: Point = [0, 10];
export const STATUS_LABEL: Record<StockStatus, string> = {
  normal: '库存正常',
  low: '低库存',
  empty: '空库位',
  blocked: '冻结库位',
};
export const COLORS: Record<StockStatus, string> = {
  normal: '#759ab9',
  low: '#e1b16b',
  empty: '#b6c9d1',
  blocked: '#c88b8d',
};
export function createBins(): Bin[] {
  return RACKS.flatMap((rack, ri) =>
    Array.from({ length: 9 }, (_, i) => {
      const index = ri * 9 + i,
        bay = Math.floor(i / 3) + 1,
        level = (i % 3) + 1;
      return {
        id: `${rack.id}-${String(bay).padStart(2, '0')}-${String(level).padStart(2, '0')}`,
        rack: rack.id,
        area: ri < 4 ? 'A区' : 'B区',
        bay,
        level,
        x: rack.x,
        z: rack.z + (bay - 2) * 2,
        sku: `SKU-${1001 + (index % 5)}`,
        name: ['智能配件', '传感器模组', '连接线材', '包装材料', '控制单元'][index % 5]!,
        quantity: index % 7 === 0 ? 0 : index % 5 === 0 ? 6 : 20 + (index % 45),
        capacity: 100,
        threshold: 12,
        blocked: index > 0 && index % 13 === 0,
      };
    })
  );
}
export function stockStatus(bin: Bin): StockStatus {
  return bin.blocked
    ? 'blocked'
    : bin.quantity === 0
      ? 'empty'
      : bin.quantity < bin.threshold
        ? 'low'
        : 'normal';
}
/** 服务点位于货架西侧的纵向通道，通过南侧横向通道进入，路径不穿货架。 */
export function planRoute(bin: Bin): Point[] {
  const points: Point[] = [[...DOCK], [0, 8], [bin.x - 2.5, 8], [bin.x - 2.5, bin.z]];
  return points.filter(
    (p, i) => i === 0 || p[0] !== points[i - 1]![0] || p[1] !== points[i - 1]![1]
  );
}
export function routeLength(points: Point[]) {
  return points
    .slice(1)
    .reduce((sum, p, i) => sum + Math.hypot(p[0] - points[i]![0], p[1] - points[i]![1]), 0);
}
export function pointAtDistance(points: Point[], distance: number): Point {
  let remaining = Math.max(0, distance);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!,
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining <= length) {
      const t = length ? remaining / length : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    remaining -= length;
  }
  return [...points.at(-1)!];
}
export function validateJob(bin: Bin | undefined, kind: JobKind, amount: number) {
  if (!bin) return '请先选择一个库位。';
  if (bin.blocked) return '该库位已冻结，不能创建搬运任务。';
  if (!Number.isInteger(amount) || amount < 1) return '搬运数量必须为正整数。';
  if (kind === 'outbound' && amount > bin.quantity) return '出库数量超过当前库存。';
  if (kind === 'inbound' && bin.quantity + amount > bin.capacity)
    return '入库数量超过库位剩余容量。';
  return '';
}
export function applyJob(bin: Bin, kind: JobKind, amount: number): Bin {
  const error = validateJob(bin, kind, amount);
  if (error) throw new Error(error);
  return { ...bin, quantity: bin.quantity + (kind === 'inbound' ? amount : -amount) };
}
export function inventoryCSV(bins: Bin[]) {
  const cell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return (
    '\uFEFF' +
    [
      ['库位', '区域', '货架', '层', 'SKU', '品名', '库存', '容量', '状态'],
      ...bins.map((b) => [
        b.id,
        b.area,
        b.rack,
        b.level,
        b.sku,
        b.name,
        b.quantity,
        b.capacity,
        STATUS_LABEL[stockStatus(b)],
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
  );
}
