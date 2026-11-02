export interface Building {
  id: string;
  name: string;
  use: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  floors: number;
  people: number;
  power: number;
  devices: number;
}
export const buildings: Building[] = [
  {
    id: 'A1',
    name: '研发中心',
    use: '办公',
    x: -15,
    z: -10,
    width: 8,
    depth: 7,
    floors: 7,
    people: 420,
    power: 168,
    devices: 42,
  },
  {
    id: 'A2',
    name: '创新大厦',
    use: '办公',
    x: 0,
    z: -10,
    width: 8,
    depth: 7,
    floors: 10,
    people: 620,
    power: 225,
    devices: 56,
  },
  {
    id: 'A3',
    name: '数据中心',
    use: '机房',
    x: 15,
    z: -10,
    width: 8,
    depth: 7,
    floors: 4,
    people: 38,
    power: 360,
    devices: 88,
  },
  {
    id: 'B1',
    name: '人才公寓',
    use: '生活',
    x: -15,
    z: 10,
    width: 8,
    depth: 7,
    floors: 8,
    people: 360,
    power: 126,
    devices: 38,
  },
  {
    id: 'B2',
    name: '会议中心',
    use: '公共',
    x: 0,
    z: 10,
    width: 9,
    depth: 7,
    floors: 3,
    people: 180,
    power: 92,
    devices: 30,
  },
  {
    id: 'B3',
    name: '综合服务楼',
    use: '公共',
    x: 15,
    z: 10,
    width: 8,
    depth: 7,
    floors: 5,
    people: 210,
    power: 108,
    devices: 34,
  },
];
export type Lens = 'overview' | 'energy' | 'safety';
export interface Reading {
  power: number;
  temperature: number;
  people: number;
  online: number;
}
export interface Alarm {
  id: number;
  buildingId: string;
  time: number;
  acknowledged: boolean;
  resolved: boolean;
}
export function sample(b: Building, time: number, fault = false): Reading {
  return {
    power:
      Math.round(b.power * (1 + 0.07 * Math.sin(time * 0.09 + b.x)) * (fault ? 1.32 : 1) * 10) / 10,
    temperature: Math.round((24 + 2 * Math.sin(time * 0.12 + b.z) + (fault ? 18 : 0)) * 10) / 10,
    people: Math.max(0, Math.round(b.people * (0.88 + 0.08 * Math.sin(time * 0.04 + b.floors)))),
    online: b.devices - (fault ? 3 : 0),
  };
}
export type GroundPoint = [number, number];
export const patrolPath: GroundPoint[] = [
  [-24, 20],
  [24, 20],
  [24, 0],
  [7.5, 0],
  [7.5, -20],
  [-24, -20],
  [-24, 20],
];
export const pathLength = patrolPath
  .slice(1)
  .reduce((sum, p, i) => sum + Math.hypot(p[0] - patrolPath[i]![0], p[1] - patrolPath[i]![1]), 0);
export function routePoint(distance: number): GroundPoint {
  let remaining = ((distance % pathLength) + pathLength) % pathLength;
  for (let i = 1; i < patrolPath.length; i++) {
    const a = patrolPath[i - 1]!,
      b = patrolPath[i]!,
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining <= length)
      return [
        a[0] + ((b[0] - a[0]) * remaining) / length,
        a[1] + ((b[1] - a[1]) * remaining) / length,
      ];
    remaining -= length;
  }
  return [...patrolPath[0]!];
}
