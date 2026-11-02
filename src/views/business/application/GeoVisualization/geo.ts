export interface City {
  id: string;
  name: string;
  region: string;
  lon: number;
  lat: number;
  volume: number;
  nodes: number;
}
export const cities: City[] = [
  {
    id: 'shanghai',
    name: '上海',
    region: '亚洲',
    lon: 121.47,
    lat: 31.23,
    volume: 960,
    nodes: 128,
  },
  { id: 'beijing', name: '北京', region: '亚洲', lon: 116.41, lat: 39.9, volume: 820, nodes: 116 },
  {
    id: 'singapore',
    name: '新加坡',
    region: '亚洲',
    lon: 103.82,
    lat: 1.35,
    volume: 680,
    nodes: 84,
  },
  { id: 'tokyo', name: '东京', region: '亚洲', lon: 139.69, lat: 35.68, volume: 760, nodes: 96 },
  { id: 'dubai', name: '迪拜', region: '亚洲', lon: 55.27, lat: 25.2, volume: 420, nodes: 62 },
  { id: 'mumbai', name: '孟买', region: '亚洲', lon: 72.88, lat: 19.08, volume: 510, nodes: 75 },
  { id: 'london', name: '伦敦', region: '欧洲', lon: -0.13, lat: 51.51, volume: 780, nodes: 104 },
  { id: 'paris', name: '巴黎', region: '欧洲', lon: 2.35, lat: 48.86, volume: 610, nodes: 81 },
  { id: 'berlin', name: '柏林', region: '欧洲', lon: 13.41, lat: 52.52, volume: 540, nodes: 73 },
  {
    id: 'newyork',
    name: '纽约',
    region: '北美洲',
    lon: -74.01,
    lat: 40.71,
    volume: 910,
    nodes: 121,
  },
  {
    id: 'losangeles',
    name: '洛杉矶',
    region: '北美洲',
    lon: -118.24,
    lat: 34.05,
    volume: 690,
    nodes: 89,
  },
  {
    id: 'toronto',
    name: '多伦多',
    region: '北美洲',
    lon: -79.38,
    lat: 43.65,
    volume: 430,
    nodes: 57,
  },
  {
    id: 'saopaulo',
    name: '圣保罗',
    region: '南美洲',
    lon: -46.63,
    lat: -23.55,
    volume: 470,
    nodes: 65,
  },
  { id: 'cairo', name: '开罗', region: '非洲', lon: 31.24, lat: 30.04, volume: 280, nodes: 42 },
  {
    id: 'capetown',
    name: '开普敦',
    region: '非洲',
    lon: 18.42,
    lat: -33.92,
    volume: 230,
    nodes: 36,
  },
  {
    id: 'sydney',
    name: '悉尼',
    region: '大洋洲',
    lon: 151.21,
    lat: -33.87,
    volume: 490,
    nodes: 68,
  },
  {
    id: 'auckland',
    name: '奥克兰',
    region: '大洋洲',
    lon: 174.76,
    lat: -36.85,
    volume: 190,
    nodes: 29,
  },
];
export type Metric = 'volume' | 'nodes';
export const metrics = {
  volume: { label: '业务量', unit: '万单' },
  nodes: { label: '服务节点', unit: '个' },
};
export function position(lon: number, lat: number, radius = 5): [number, number, number] {
  const a = (lon * Math.PI) / 180,
    b = (lat * Math.PI) / 180;
  return [
    radius * Math.cos(b) * Math.cos(a),
    radius * Math.sin(b),
    -radius * Math.cos(b) * Math.sin(a),
  ];
}
export function distance(a: City, b: City) {
  const rad = Math.PI / 180,
    dlat = (b.lat - a.lat) * rad,
    dlon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function geoJSON(items: City[]) {
  return {
    type: 'FeatureCollection',
    features: items.map(({ lon, lat, ...properties }) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { ...properties, source: '本地模拟数据' },
    })),
  };
}
// 教学示意轮廓：非测绘底图，不表达国界。
export const continents: [number, number][][] = [
  [
    [-168, 66],
    [-150, 70],
    [-130, 60],
    [-125, 48],
    [-117, 32],
    [-105, 24],
    [-97, 16],
    [-83, 9],
    [-78, 9],
    [-86, 21],
    [-81, 25],
    [-80, 33],
    [-66, 45],
    [-55, 52],
    [-62, 60],
    [-82, 64],
    [-100, 73],
    [-130, 72],
  ],
  [
    [-81, 12],
    [-65, 10],
    [-51, 4],
    [-35, -6],
    [-42, -23],
    [-54, -35],
    [-68, -55],
    [-74, -45],
    [-72, -20],
    [-80, -4],
  ],
  [
    [-17, 36],
    [0, 37],
    [12, 33],
    [32, 31],
    [43, 12],
    [51, 11],
    [42, -4],
    [34, -20],
    [18, -35],
    [11, -25],
    [9, -5],
    [-4, 5],
    [-17, 15],
  ],
  [
    [-10, 36],
    [-10, 44],
    [0, 50],
    [6, 55],
    [5, 62],
    [20, 71],
    [40, 69],
    [60, 71],
    [90, 76],
    [120, 71],
    [150, 61],
    [179, 65],
    [179, 52],
    [145, 46],
    [137, 35],
    [122, 24],
    [109, 18],
    [103, 5],
    [97, 8],
    [88, 22],
    [80, 8],
    [72, 20],
    [57, 25],
    [44, 12],
    [35, 30],
    [28, 40],
    [15, 40],
  ],
  [
    [112, -11],
    [130, -12],
    [137, -11],
    [153, -26],
    [146, -39],
    [130, -33],
    [115, -35],
  ],
  [
    [-53, 60],
    [-42, 60],
    [-20, 75],
    [-38, 83],
    [-60, 80],
  ],
  [
    [130, 31],
    [141, 41],
    [145, 44],
    [142, 35],
  ],
  [
    [47, -13],
    [51, -16],
    [49, -25],
    [44, -24],
  ],
  [
    [166, -34],
    [179, -38],
    [170, -47],
    [165, -45],
  ],
];
