<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 场景内状态提示
const statusText = ref('粒子数量：4000｜当前：静态粒子云');
const activeParticle = ref('cloud');

const PARTICLE_COUNT = 4000;

// 粒子数据缓冲
let positions = new Float32Array(PARTICLE_COUNT * 3);
let colors = new Float32Array(PARTICLE_COUNT * 3);
let baseRadius = new Float32Array(PARTICLE_COUNT);
let phases = new Float32Array(PARTICLE_COUNT);
let points: THREE.Points | null = null;
let pointsMat: THREE.PointsMaterial | null = null;

const { scene } = useThreeScene(containerRef, {
  background: 0x0b1026,
  camera: { fov: 55, near: 0.1, far: 100, position: [0, 2.2, 5.5], lookAt: [0, 0, 0] },
  controls: { target: [0, 0, 0] },
  grid: false,
  axes: 2,
  lights: false, // 粒子用 PointsMaterial 自发光色，无需灯光
  animate: (delta, time) => {
    if (!points || !pointsMat) return;
    const t = time / 1000;
    switch (activeParticle.value) {
      case 'cloud':
        points.rotation.y = 0;
        pointsMat.opacity = 1;
        break;
      case 'rotate':
        points.rotation.y += delta * 0.5;
        break;
      case 'pulse':
        updatePulse(t);
        break;
      case 'gradient':
        updateGradient();
        break;
      case 'twinkle':
        pointsMat.opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 2.2));
        break;
    }
  },
});

/* ================= 粒子数据 ================= */
// 随机球体内均匀分布（半径开立方保证体积均匀）
function initParticles() {
  positions = new Float32Array(PARTICLE_COUNT * 3);
  colors = new Float32Array(PARTICLE_COUNT * 3);
  baseRadius = new Float32Array(PARTICLE_COUNT);
  phases = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const r = 2.6 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    baseRadius[i] = r;
    phases[i] = Math.random() * Math.PI * 2;
    // 初始颜色：径向蓝→紫渐变
    const c = new THREE.Color().setHSL(0.6 + (r / 2.6) * 0.4, 0.9, 0.55);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
}

// 径向脉冲：每个粒子沿自身方向伸缩半径（CPU 每帧更新）
function updatePulse(t: number) {
  if (!points) return;
  const attr = points.geometry.attributes.position as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const scale = 1 + 0.35 * Math.sin(t * 1.8 + (phases[i] ?? 0));
    const r = (baseRadius[i] ?? 0) * scale;
    const x = positions[i * 3] ?? 0;
    const y = positions[i * 3 + 1] ?? 0;
    const z = positions[i * 3 + 2] ?? 0;
    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    arr[i * 3] = (x / len) * r;
    arr[i * 3 + 1] = (y / len) * r;
    arr[i * 3 + 2] = (z / len) * r;
  }
  attr.needsUpdate = true;
}

// 颜色按高度渐变（彩虹色带）
function updateGradient() {
  if (!points) return;
  const colorAttr = points.geometry.attributes.color as THREE.BufferAttribute;
  const carr = colorAttr.array as Float32Array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y = positions[i * 3 + 1] ?? 0;
    const hue = (y / 2.6 + 1) / 2; // -2.6~2.6 → 0~1
    const c = new THREE.Color().setHSL(hue, 0.95, 0.6);
    carr[i * 3] = c.r;
    carr[i * 3 + 1] = c.g;
    carr[i * 3 + 2] = c.b;
  }
  colorAttr.needsUpdate = true;
  points.rotation.y = 0;
}

/* ================= 场景内容 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  initParticles();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  pointsMat = new THREE.PointsMaterial({
    size: 0.055,
    vertexColors: true, // 使用顶点颜色
    transparent: true,
    opacity: 1,
    depthWrite: false, // 粒子叠加更柔和
    blending: THREE.AdditiveBlending,
  });
  points = new THREE.Points(geo, pointsMat);
  points.name = '粒子云';
  s.add(points);
});

/* ================= 模式切换 ================= */
const MODES: Record<string, { label: string; desc: string }> = {
  cloud: { label: '静态粒子云', desc: '粒子数量：4000｜当前：静态粒子云（随机球体分布）' },
  rotate: { label: '旋转动画', desc: '粒子数量：4000｜当前：整体旋转（GPU 一次变换，开销极低）' },
  pulse: {
    label: '径向脉冲',
    desc: '粒子数量：4000｜当前：CPU 逐粒子更新位置（每帧 4000 次计算）',
  },
  gradient: { label: '颜色渐变', desc: '粒子数量：4000｜当前：顶点颜色按高度渐变（彩虹）' },
  twinkle: { label: '闪烁效果', desc: '粒子数量：4000｜当前：透明度正弦闪烁' },
};

function applyMode(key: string) {
  activeParticle.value = key;
  if (points) {
    points.rotation.set(0, 0, 0);
    (points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    if (pointsMat) pointsMat.opacity = 1;
  }
  // 恢复初始位置与颜色
  const pa = points?.geometry.attributes.position as THREE.BufferAttribute | undefined;
  if (pa) (pa.array as Float32Array).set(positions);
  statusText.value = MODES[key]!.desc;
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  cloud: () => `// ① 粒子系统：Points 基础
const geometry = new THREE.BufferGeometry()
// 每个粒子一个顶点（position）
geometry.setAttribute('position',
  new THREE.BufferAttribute(positions, 3))
const material = new THREE.PointsMaterial({
  size: 0.055,       // 粒子大小
  vertexColors: true // 使用顶点颜色
})
const points = new THREE.Points(geometry, material)
scene.add(points)
// 特点：GPU 把每个顶点画成一个点
// 100 万个粒子也只需一次 draw call`,
  rotate: () => `// ② 整体旋转：只动一个节点
points.rotation.y += delta * 0.5
// 粒子位置不变，旋转整个 Points
// 仍是 1 次 draw call —— GPU 变换
// 对比：逐粒子更新位置是 CPU 方式
// 优化原则：能整体变换就别逐粒子改`,
  pulse: () => `// ③ CPU 粒子：逐粒子更新
for (let i = 0; i < COUNT; i++) {
  const scale = 1 + 0.35 * Math.sin(t * 1.8 + phase[i])
  const r = baseRadius[i] * scale
  arr[i * 3]     = (x / len) * r  // x
  arr[i * 3 + 1] = (y / len) * r  // y
  arr[i * 3 + 2] = (z / len) * r  // z
}
positionAttr.needsUpdate = true
// 每帧重算并上传 CPU→GPU
// 粒子多时是性能瓶颈，需改用 GPU`,
  gradient: () => `// ④ 顶点颜色：按高度渐变
geometry.setAttribute('color',
  new THREE.BufferAttribute(colors, 3))
material.vertexColors = true
// 每个粒子一个 RGB 颜色
// 每帧更新 colors + needsUpdate
// 也可以把色带写入着色器
// （GPU 计算，零 CPU 开销）`,
  twinkle: () => `// ⑤ 闪烁：透明度正弦驱动
material.opacity =
  0.55 + 0.45 * Math.abs(Math.sin(t * 2.2))
// 整片粒子一起闪烁（最简单）
// 逐粒子闪烁：用 size 衰减或
// 顶点色 alpha（需自定义着色器）`,
};

const explainMap: Record<string, () => string> = {
  cloud: () =>
    `【原理】粒子 = 每个顶点画一个小点。BufferGeometry 的 position 属性提供顶点坐标，PointsMaterial 控制点的大小/颜色，GPU 用一次 draw call 绘制全部。\n【优势】10 万级粒子流畅（对比：10 万个独立 Mesh 是 10 万次 draw call，直接卡死）。\n【用途】星空、雨雪、烟雾、萤火虫、数据点云。`,
  rotate: () =>
    `【原理】旋转整个 Points 节点 = 变换全部粒子，由 GPU 矩阵乘法完成，与粒子数量无关。\n【原则】能用节点变换（整体移动/旋转/缩放）就别用 CPU 逐粒子更新——这是粒子性能的第一准则。\n【对比】本页"径向脉冲"每帧更新 4000 个粒子位置，就是 CPU 方式的开销示例。`,
  pulse: () =>
    `【原理】CPU 粒子：JavaScript 每帧循环修改 Float32Array 位置，再 needsUpdate 上传到 GPU。\n【瓶颈】上传带宽有限——10 万粒子 × 每秒 60 帧 × 12 字节 ≈ 72MB/s，加上 JS 循环开销。\n【解决】大规模粒子把运动写进着色器（uniform 传时间，GPU 计算位置），这就是"GPU 粒子"。`,
  gradient: () =>
    `【原理】顶点颜色：每个粒子附带 RGB，PointsMaterial 开启 vertexColors 后按粒子颜色着色。\n【实现】colors Float32Array 每帧重算 + setAttribute('color') + needsUpdate。\n【应用】热力图粒子、高度染色、风速场配色。`,
  twinkle: () =>
    `【原理】透明度整体正弦波动，简单但视觉效果好。\n【进阶】逐粒子闪烁需要自定义 ShaderMaterial：在片元着色器里按 particle index × uTime 计算每点 alpha。\n【结合】粒子系统与着色器是绝配——复杂粒子效果（气流、星云）几乎都走 shader。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeParticle);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(item, key) in MODES"
        :key="key"
        size="small"
        :type="activeParticle === key ? 'primary' : 'default'"
        @click="applyMode(key)"
        >{{ item.label }}</n-button
      >
    </div>

    <!-- 主体：左 3D 场景 / 右 代码+讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div
        ref="containerRef"
        class="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      >
        <!-- 状态提示条 -->
        <div
          class="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/55 px-2 py-1 text-xs text-white"
        >
          {{ statusText }}
        </div>
      </div>

      <CodePanel :title="activeParticle" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
