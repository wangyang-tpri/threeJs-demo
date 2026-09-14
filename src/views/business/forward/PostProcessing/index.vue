<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap gap-2">
      <n-button
        v-for="b in buttons"
        :key="b.key"
        :type="activeEffect === b.key ? 'primary' : 'default'"
        size="small"
        @click="applyEffect(b.key)"
      >
        {{ b.label }}
      </n-button>
    </div>

    <!-- 3D 场景 + 代码讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div ref="containerRef" class="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200">
        <div class="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/55 px-2 py-1 text-xs text-white">
          {{ statusText }}
        </div>
      </div>
      <CodePanel title="后期处理 · EffectComposer" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);
const statusText = ref('加载中…');
const activeEffect = ref('none');

// 场景中的演示物体组
let group: THREE.Group | null = null;
// 后期合成器与各个 Pass
let composer: EffectComposer | null = null;
let bloomPass: UnrealBloomPass | null = null;
let filmPass: FilmPass | null = null;
let vignettePass: ShaderPass | null = null;
let rgbPass: ShaderPass | null = null;

const buttons = [
  { key: 'none', label: '原画（无后期）' },
  { key: 'bloom', label: '辉光 Bloom' },
  { key: 'vignette', label: '暗角 Vignette' },
  { key: 'film', label: '胶片颗粒 Film' },
  { key: 'rgb', label: '色差 RGBShift' },
  { key: 'all', label: '组合（全部开启）' },
];

const { scene, camera, renderer } = useThreeScene(containerRef, {
  background: 0x0a0a18,
  camera: { fov: 55, position: [4.5, 3, 5.5], lookAt: [0, 0, 0] },
  controls: { target: [0, 0, 0] },
  grid: { size: 8, divisions: 16, color1: 0x1e293b, color2: 0x0f172a },
  axes: 1.5,
  lights: false,
  loop: 'manual', // 后期处理接管渲染循环：composer.render() 替代 renderer.render()
  animate: (delta) => {
    if (group) group.rotation.y += delta * 0.25;
    if (composer) composer.render();
  },
  onResize: (w, h) => {
    composer?.setSize(w, h);
  },
  onDispose: () => {
    composer?.dispose();
    composer = null;
  },
});

/* ============ 场景内容 ============ */
function buildScene() {
  const s = scene.value;
  if (!s) return;
  // 环面结（亮青，Bloom 主要溢出源）
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.85, 0.28, 128, 24),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  knot.position.set(-1.5, 0.3, 0);
  s.add(knot);
  // 球（亮紫）
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa })
  );
  ball.position.set(1.4, -0.2, 0.6);
  s.add(ball);
  // 立方体（亮橙）
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshBasicMaterial({ color: 0xfb923c })
  );
  box.position.set(1.6, 0.4, -1.1);
  s.add(box);
  // 小方块（多面体，丰富画面）
  const octa = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.5),
    new THREE.MeshBasicMaterial({ color: 0x4ade80 })
  );
  octa.position.set(-1.3, -0.4, -1.2);
  s.add(octa);

  group = new THREE.Group();
  group.add(knot, ball, box, octa);
}

/* ============ 后期处理 ============ */
function resetPasses() {
  if (!composer) return;
  // 清空已有 Pass（保留 RenderPass 从 composer.passes[0] 重建）
  while (composer.passes.length > 0) composer.removePass(composer.passes[0]!);
  composer.addPass(new RenderPass(scene.value!, camera.value!));
}

function applyEffect(key: string) {
  activeEffect.value = key;
  if (!composer) return;
  resetPasses();
  const rdr = renderer.value;
  if (!rdr) return;

  if (key === 'bloom' || key === 'all') {
    bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.3, 0.6, 0.55);
    composer.addPass(bloomPass);
  }
  if (key === 'vignette' || key === 'all') {
    vignettePass = new ShaderPass(VignetteShader);
    (vignettePass.uniforms.offset as { value: number }).value = 0.95;
    (vignettePass.uniforms.darkness as { value: number }).value = 1.2;
    composer.addPass(vignettePass);
  }
  if (key === 'film' || key === 'all') {
    filmPass = new FilmPass(0.6, false); // r185 签名：(intensity, grayscale)
    composer.addPass(filmPass);
  }
  if (key === 'rgb' || key === 'all') {
    rgbPass = new ShaderPass(RGBShiftShader);
    (rgbPass.uniforms.amount as { value: number }).value = 0.004;
    composer.addPass(rgbPass);
  }
  // 输出 Pass：负责颜色空间转换（sRGB）
  composer.addPass(new OutputPass());
  statusText.value = EFFECT_INFO[key] ?? '';
}

const EFFECT_INFO: Record<string, string> = {
  none: '当前：原画 —— EffectComposer 未启用，场景直接渲染到屏幕',
  bloom: '当前：辉光 Bloom —— UnrealBloomPass 提取高亮区域并向外扩散光晕',
  vignette: '当前：暗角 —— VignetteShader 按屏幕坐标 UV 向边缘压暗',
  film: '当前：胶片颗粒 —— FilmPass 叠加随机噪点与扫描线，模拟老电影',
  rgb: '当前：色差 —— RGBShiftShader 将红/绿/蓝通道按 UV 偏移错位',
  all: '当前：组合效果 —— Bloom + 暗角 + 颗粒 + 色差 叠加，观察合成顺序',
};

/* ============ 代码讲解 ============ */
const CODE = {
  composer: () => `// 1. 创建合成器（内部包含 render target 链）
const composer = new EffectComposer(renderer)
// 2. 第一层必须是 RenderPass：把场景渲染进离屏缓冲
composer.addPass(new RenderPass(scene, camera))

// 3. 依次叠加后期 Pass，顺序即渲染顺序
composer.addPass(new UnrealBloomPass(size, 1.3, 0.6, 0.55))
composer.addPass(new ShaderPass(VignetteShader))
composer.addPass(new FilmPass(0.55, 0.6, 800, false))
composer.addPass(new ShaderPass(RGBShiftShader))

// 4. 最后的 OutputPass 负责颜色空间转换（sRGB）
composer.addPass(new OutputPass())

// 5. 渲染循环中用 composer.render() 取代 renderer.render()
renderer.setAnimationLoop(() => composer.render())`,
  none: () => `// 无后期处理：场景直接渲染到屏幕
renderer.render(scene, camera)

// 这就是普通 WebGLRenderer 的默认渲染路径：
// 渲染 → 交换缓冲 → 显示
// 没有任何"离屏纹理 + 全屏四边形"环节

// 而后期处理的全部意义在于：
// 先渲染到离屏纹理，再经过多道"滤镜"输出`,
  bloom: () => `// UnrealBloomPass：经典辉光效果
// 原理：分 4 步——提取亮度 → 高斯模糊降采样 →
// 逐级上采样叠加 → 与原图合成
const pass = new UnrealBloomPass(size, strength, radius, threshold)
// strength: 光晕强度    radius: 扩散半径
// threshold: 亮度阈值（超过该亮度的区域才产生辉光）
composer.addPass(pass)`,
  vignette: () => `// ShaderPass：用 GLSL 着色器实现任意逐像素效果
// 内置 VignetteShader（暗角）：按片元 UV 到中心的距离压暗
const pass = new ShaderPass(VignetteShader)
pass.uniforms.offset.value = 0.95    // 暗角起始半径
pass.uniforms.darkness.value = 1.2   // 暗角强度
composer.addPass(pass)

// ShaderPass 的关键约定：
// 输入纹理来自上一 Pass（uniforms.tDiffuse）
// 输出 = 全屏四边形逐片元着色`,
  film: () => `// FilmPass：胶片颗粒 + 扫描线
const pass = new FilmPass(
  0.6,   // intensity：噪点强度（r185 两参签名）
  false  // grayscale：是否灰度
)
composer.addPass(pass)

// 原理：每帧生成随机噪点图 + 沿 Y 方向的扫描线，
// 按 alpha 混合进画面，模拟老电影质感`,
  rgb: () => `// RGBShiftShader：色差（镜头色散）
const pass = new ShaderPass(RGBShiftShader)
pass.uniforms.amount.value = 0.004   // 通道偏移量
composer.addPass(pass)

// 核心逻辑（片元着色器）：
//   color.r = texture(tDiffuse, vUv + amount).r
//   color.g = texture(tDiffuse, vUv).g
//   color.b = texture(tDiffuse, vUv - amount).b
// 红蓝通道反向偏移 → 画面边缘出现彩色错位`,
  all: () => `// 组合：多个 Pass 按添加顺序依次执行
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(size, 1.3, 0.6, 0.55))
composer.addPass(new ShaderPass(VignetteShader))
composer.addPass(new FilmPass(0.6, false))
composer.addPass(new ShaderPass(RGBShiftShader))
composer.addPass(new OutputPass())  // 最后做 sRGB 转换

// 渲染管线：
// 场景 → 辉光 → 暗角 → 颗粒 → 色差 → 输出
// 每个 Pass 的输出纹理 = 下一个 Pass 的输入`,
};

const EXPLAIN = {
  none: () => `无后期处理 = 直接渲染路径：
- renderer.render() 把场景画进默认帧缓冲，然后交换显示
- 没有中间纹理环节，性能开销最小

后期处理引入的额外开销：
1. 渲染到离屏 RenderTarget（多一层绘制）
2. 全屏四边形逐像素着色（每个 Pass 一次）
3. 纹理读写带宽占用

所以"无后期"是性能基准，组合效果最慢——这正是"性能优化"章节的取舍场景。`,
  bloom: () => `Bloom（辉光）是后期处理最常用的效果。

UnrealBloomPass 的实现：
1. 按 threshold 提取场景中超过亮度阈值的像素
2. 对高亮图做多次降采样 + 高斯模糊（模糊半径决定光晕扩散范围）
3. 逐级上采样回原尺寸，得到柔光层
4. 柔光层与原图相加合成，亮部周围出现光晕

本页把环面结设为亮青色，正是因为它的高亮度区域会被 threshold=0.55 提取出来。`,
  vignette: () => `ShaderPass 把任意"片元着色器"包装成一个 Pass：
- 输入：上一 Pass 的纹理（作为 uniforms.tDiffuse）
- 对全屏四边形每个片元执行着色器
- 输出：处理后的颜色

VignetteShader 的暗角公式（核心一行）：
  uvDist = distance(vUv, vec2(0.5))
  color *= smoothstep(offset, offset - darkness, uvDist)

uvDist 是片元到屏幕中心的距离，越靠边越暗——模拟镜头暗角。`,
  film: () => `FilmPass 模拟胶片质感，两个分量叠加：
1. 噪点：每帧生成随机灰度值，按 intensity 混入
2. 扫描线：沿屏幕 Y 方向周期性压暗

它演示了后期处理的典型用法：用 time 和随机数制造随时间变化的画面扰动。

提示：结合"着色器"章节，你会理解这些内置 Shader 本质就是 GLSL 字符串 + uniforms。`,
  rgb: () => `RGBShift（色差）模拟相机镜头的色散现象：
- 红、绿、蓝三通道对 UV 做不同偏移
- 画面边缘（偏移大处）出现彩色描边

它演示了后期处理最典型的"通道分离"技巧：
同一个纹理，不同通道采样不同位置，再合成。

在 ShaderPass 中修改 uniforms.amount 即可实时调整偏移量。`,
  all: () => `组合模式展示后期管线的核心特性——Pass 链：

  RenderPass(场景) → Bloom → Vignette → Film → RGBShift → OutputPass

- 每个 Pass 读取上一级纹理、输出下一级纹理
- 顺序影响结果：先辉光再暗角 vs 先暗角再辉光，效果不同
- OutputPass 负责把线性颜色转成 sRGB（颜色空间管理）

这正是电影/游戏"后处理栈"（Post-Processing Stack）的原型：
体积光、景深、动态模糊、色调映射都在这条链上。`,
};

const { code, explanation } = useCodeExplain(CODE, EXPLAIN, activeEffect);

onMounted(() => {
  buildScene();
  // 初始化合成器与默认 Pass
  if (renderer.value) {
    composer = new EffectComposer(renderer.value);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const el = containerRef.value;
    if (el) composer.setSize(el.clientWidth, el.clientHeight);
  }
  applyEffect('none');
});
</script>
