export type FloorKey = '1F' | '2F' | '3F';
export type Category = '购物' | '餐饮' | '娱乐' | '服务';
export interface Place {
  id: string;
  name: string;
  floor: FloorKey;
  category: Category;
  x: number;
  z: number;
  description: string;
}
export interface RouteNode {
  id: string;
  floor: FloorKey;
  x: number;
  z: number;
}
export const FLOOR_HEIGHT = 4;
export const METERS_PER_UNIT = 3;
export const FLOORS: { key: FloorKey; name: string; subtitle: string }[] = [
  { key: '1F', name: '品质生活', subtitle: '时尚 / 零售 / 服务' },
  { key: '2F', name: '食光街区', subtitle: '餐饮 / 咖啡 / 甜品' },
  { key: '3F', name: '欢乐时刻', subtitle: '影院 / 运动 / 亲子' },
];
export const COLORS: Record<Category, string> = {
  购物: '#83b7d7',
  餐饮: '#e7b782',
  娱乐: '#ac9cdd',
  服务: '#80bfae',
};
const names = [
  ['城市书房', '日常衣橱', '运动空间', '数码生活', '生活优选', '珠宝时光', '美妆集合', '客户服务'],
  [
    '山野咖啡',
    '小麦烘焙',
    '江南小馆',
    '日式料理',
    '川味厨房',
    '轻食花园',
    '港式茶餐厅',
    '甜蜜实验室',
  ],
  [
    '星光影院',
    '趣玩街机',
    '亲子乐园',
    '艺术工坊',
    '健身中心',
    '桌游俱乐部',
    'VR 体验馆',
    '音乐空间',
  ],
];
export const PLACES: Place[] = FLOORS.flatMap((floor, fi) =>
  names[fi]!.map((name, i) => ({
    id: `${floor.key}-${i + 1}`,
    name,
    floor: floor.key,
    category: fi === 0 ? (i === 7 ? '服务' : '购物') : fi === 1 ? '餐饮' : '娱乐',
    x: [-7, -3, 3, 7][i % 4]!,
    z: i < 4 ? -5 : 5,
    description:
      fi === 0
        ? '发现品质好物，享受日常生活。'
        : fi === 1
          ? '与美味相遇，开启轻松食光。'
          : '探索更多乐趣，和朋友分享快乐。',
  }))
);
export const ENTRANCE: Place = {
  id: 'entrance',
  name: '南门入口',
  floor: '1F',
  category: '服务',
  x: 0,
  z: 7.5,
  description: '示例导航起点，可切换为任意店铺。',
};
export const DESTINATIONS = [ENTRANCE, ...PLACES];
export const floorIndex = (floor: FloorKey) => FLOORS.findIndex((f) => f.key === floor);

// 仅连接可通行的走廊与店铺门口，跨层边只存在于电梯节点。
export function createGraph() {
  const nodes = new Map<string, RouteNode>();
  const edges = new Map<string, Map<string, number>>();
  const add = (node: RouteNode) => {
    nodes.set(node.id, node);
    edges.set(node.id, new Map());
  };
  const link = (a: string, b: string, weight?: number) => {
    const na = nodes.get(a)!;
    const nb = nodes.get(b)!;
    const distance = weight ?? Math.hypot(na.x - nb.x, na.z - nb.z) * METERS_PER_UNIT;
    edges.get(a)!.set(b, distance);
    edges.get(b)!.set(a, distance);
  };
  const id = (floor: FloorKey, x: number, z: number) => `${floor}:${x}:${z}`;
  for (const floor of FLOORS) {
    for (const z of [-2.5, 2.5]) {
      const xs = [-9, -7, -3, 0, 3, 7, 9];
      xs.forEach((x) => add({ id: id(floor.key, x, z), floor: floor.key, x, z }));
      xs.slice(1).forEach((x, i) => link(id(floor.key, xs[i]!, z), id(floor.key, x, z)));
    }
    for (const x of [-9, 0, 9]) {
      add({ id: id(floor.key, x, 0), floor: floor.key, x, z: 0 });
      link(id(floor.key, x, -2.5), id(floor.key, x, 0));
      link(id(floor.key, x, 0), id(floor.key, x, 2.5));
    }
    for (const place of PLACES.filter((p) => p.floor === floor.key)) {
      const z = Math.sign(place.z) * 3.25;
      add({ id: place.id, floor: floor.key, x: place.x, z });
      link(place.id, id(floor.key, place.x, Math.sign(place.z) * 2.5));
    }
  }
  add({ ...ENTRANCE });
  link(ENTRANCE.id, id('1F', 0, 2.5));
  link(id('1F', 9, 0), id('2F', 9, 0), FLOOR_HEIGHT * METERS_PER_UNIT);
  link(id('2F', 9, 0), id('3F', 9, 0), FLOOR_HEIGHT * METERS_PER_UNIT);
  return { nodes, edges };
}
const graph = createGraph();
export function findRoute(
  start: string,
  end: string
): { nodes: RouteNode[]; distance: number } | null {
  if (!graph.nodes.has(start) || !graph.nodes.has(end)) return null;
  const distances = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string>();
  const pending = new Set(graph.nodes.keys());
  while (pending.size) {
    let current: string | undefined;
    let best = Infinity;
    for (const key of pending) {
      const distance = distances.get(key) ?? Infinity;
      if (distance < best) {
        current = key;
        best = distance;
      }
    }
    if (!current) break;
    pending.delete(current);
    if (current === end) {
      const path = [current];
      while (previous.has(path[0]!)) path.unshift(previous.get(path[0]!)!);
      return { nodes: path.map((key) => graph.nodes.get(key)!), distance: best };
    }
    for (const [neighbor, weight] of graph.edges.get(current)!) {
      if (best + weight < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, best + weight);
        previous.set(neighbor, current);
      }
    }
  }
  return null;
}
