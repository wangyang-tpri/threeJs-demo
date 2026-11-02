export type PartId = 'body' | 'front' | 'lens' | 'sensor' | 'board' | 'battery' | 'screen';
export type ViewPreset = 'perspective' | 'front' | 'back' | 'top';
export interface Part {
  id: PartId;
  name: string;
  material: string;
  description: string;
  offset: [number, number, number];
}
export const PARTS: Part[] = [
  {
    id: 'body',
    name: '机身框架',
    material: '铝合金 / 工程塑料',
    description: '承载内部组件，提供结构支撑与握持空间。',
    offset: [0, 0, 0],
  },
  {
    id: 'front',
    name: '前盖组件',
    material: '铝合金',
    description: '保护机身正面，并提供镜头安装位置。',
    offset: [0, 0, 1.6],
  },
  {
    id: 'lens',
    name: '镜头模组',
    material: '光学玻璃 / 金属',
    description: '由镜筒、装饰环和镜片组成，将光线传递至成像系统。',
    offset: [0, 0, 3.1],
  },
  {
    id: 'sensor',
    name: '图像传感器',
    material: '硅 / 陶瓷封装',
    description: '把入射光转换为电信号。蓝色区域为结构示意感光面。',
    offset: [0, 1.2, 0.7],
  },
  {
    id: 'board',
    name: '主控电路板',
    material: 'PCB / 芯片',
    description: '处理图像信号，连接电源、显示与控制单元。',
    offset: [0, 1.5, -1.2],
  },
  {
    id: 'battery',
    name: '电池组件',
    material: '电芯 / 绝缘外壳',
    description: '向相机供电，可单独查看安装与连接结构。',
    offset: [-2.6, -0.2, 0],
  },
  {
    id: 'screen',
    name: '后盖与显示屏',
    material: '显示面板 / 玻璃',
    description: '提供取景及状态显示，与主控电路板连接。',
    offset: [0, 0, -2.7],
  },
];
// @unocss-include
export const FINISHES = [
  { name: '石墨黑', color: '#3c4653', class: 'bg-[#3c4653]' },
  { name: '银雾灰', color: '#bcc8cf', class: 'bg-[#bcc8cf]' },
  { name: '松石绿', color: '#658e87', class: 'bg-[#658e87]' },
  { name: '沙漠金', color: '#c2a882', class: 'bg-[#c2a882]' },
];
export function demoProgress(time: number) {
  const t = Math.max(0, Math.min(8, time));
  const ease = (v: number) => v * v * (3 - 2 * v);
  return t < 3 ? ease(t / 3) * 100 : t <= 5 ? 100 : (1 - ease((t - 5) / 3)) * 100;
}
