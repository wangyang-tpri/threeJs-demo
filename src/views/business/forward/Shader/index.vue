<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 场景内状态提示
const statusText = ref('当前效果：UV 渐变（片元着色器）');
const activeShader = ref('uvGradient');

// 当前 shader 材质与球体
let shaderMat: THREE.ShaderMaterial | null = null;
let sphereMesh: THREE.Mesh | null = null;

const { scene } = useThreeScene(containerRef, {
  background: 0x0f172a,
  camera: { fov: 50, near: 0.1, far: 100, position: [0, 1.2, 4.5], lookAt: [0, 0, 0] },
  controls: { target: [0, 0, 0] },
  grid: false,
  axes: 2,
  lights: false, // ShaderMaterial 不依赖灯光，全由着色器计算
  animate: (delta) => {
    if (shaderMat?.uniforms.uTime) {
      shaderMat.uniforms.uTime.value += delta;
    }
  },
});

/* ================= GLSL 着色器 ================= */
// 通用顶点着色器：只做标准坐标变换，把 uv/position 传给片元
const VERT_DEFAULT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// 波浪顶点着色器：顶点沿法线方向正弦位移（物体"活"起来）
const VERT_WAVE = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 pos = position;
  // 沿 Z 方向做正弦波，频率 4、振幅 0.15
  pos.z += sin(pos.x * 4.0 + uTime * 2.0) * 0.15;
  pos.z += sin(pos.y * 4.0 - uTime * 1.5) * 0.12;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// 片元着色器集合（每种效果一段 GLSL）
const FRAGMENTS: Record<string, string> = {
  uvGradient: /* glsl */ `
varying vec2 vUv;
void main() {
  // distance 计算到中心距离 → 中心蓝、边缘粉的径向渐变
  float d = distance(vUv, vec2(0.5));
  vec3 color = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.4, 0.6), d * 1.4);
  gl_FragColor = vec4(color, 1.0);
}
`,
  stripe: /* glsl */ `
varying vec2 vUv;
void main() {
  // sin 条纹：uv.x 越大条纹越密
  float s = sin(vUv.x * 40.0);
  // smoothstep 把 [-1,1] 平滑映射为 0~1 的亮带
  float band = smoothstep(0.3, 0.9, s);
  vec3 color = mix(vec3(0.05, 0.1, 0.3), vec3(0.1, 0.8, 1.0), band);
  gl_FragColor = vec4(color, 1.0);
}
`,
  pulse: /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  // 距离场 + 时间 → 向外扩散的圆环脉冲
  float d = distance(vUv, vec2(0.5));
  float ring = abs(sin(d * 24.0 - uTime * 3.0));
  float glow = exp(-d * 5.0); // 中心发光衰减
  vec3 color = vec3(0.3, 0.9, 0.5) * (ring * 0.9 + glow * 0.35);
  gl_FragColor = vec4(color, 1.0);
}
`,
  wave: /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  // 与顶点波浪配合：颜色也随高度/uTime 呼吸
  float c = 0.5 + 0.5 * sin(vUv.y * 6.0 + uTime * 1.8);
  vec3 color = mix(vec3(0.1, 0.2, 0.6), vec3(0.0, 0.9, 1.0), c);
  gl_FragColor = vec4(color, 1.0);
}
`,
  rgb: /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  // 三通道独立正弦 → 彩色流光
  vec3 color = vec3(
    0.5 + 0.5 * sin(vUv.x * 8.0 + uTime),
    0.5 + 0.5 * sin(vUv.y * 8.0 + uTime * 1.3),
    0.5 + 0.5 * sin((vUv.x + vUv.y) * 8.0 + uTime * 0.8)
  );
  gl_FragColor = vec4(color, 1.0);
}
`,
};

/* ================= 场景内容 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1.35, 64, 64), new THREE.MeshBasicMaterial());
  sphereMesh.name = '着色器球体';
  s.add(sphereMesh);

  applyShader('uvGradient');
});

/* ================= 效果切换 ================= */
const SHADERS: Record<string, { label: string; vertex: string; fragment: string }> = {
  uvGradient: { label: 'UV渐变', vertex: VERT_DEFAULT, fragment: FRAGMENTS.uvGradient! },
  stripe: { label: '条纹', vertex: VERT_DEFAULT, fragment: FRAGMENTS.stripe! },
  pulse: { label: '脉冲圆环', vertex: VERT_DEFAULT, fragment: FRAGMENTS.pulse! },
  wave: { label: '波浪形变', vertex: VERT_WAVE, fragment: FRAGMENTS.wave! },
  rgb: { label: '流光溢彩', vertex: VERT_DEFAULT, fragment: FRAGMENTS.rgb! },
};

function applyShader(key: string) {
  activeShader.value = key;
  if (!sphereMesh) return;
  shaderMat?.dispose();
  shaderMat = new THREE.ShaderMaterial({
    vertexShader: SHADERS[key]!.vertex,
    fragmentShader: SHADERS[key]!.fragment,
    uniforms: { uTime: { value: 0 } },
    side: THREE.DoubleSide,
  });
  sphereMesh.material = shaderMat;
  statusText.value = `当前效果：${SHADERS[key]!.label}（${
    key === 'wave' ? '顶点着色器位移 + ' : ''
  }片元着色器着色）`;
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  uvGradient: () => `// ① UV 渐变：片元着色器
const material = new THREE.ShaderMaterial({
  vertexShader: \`
    varying vec2 vUv;
    void main() {
      vUv = uv;                       // 顶点 UV
      gl_Position = projectionMatrix  // 投影矩阵
        * modelViewMatrix             // 视图×模型矩阵
        * vec4(position, 1.0);
    }\`,
  fragmentShader: \`
    varying vec2 vUv;
    void main() {
      float d = distance(vUv, vec2(0.5));
      vec3 color = mix(
        vec3(0.2, 0.5, 1.0),   // 中心蓝
        vec3(1.0, 0.4, 0.6),   // 边缘粉
        d * 1.4
      );
      gl_FragColor = vec4(color, 1.0);
    }\`,
})`,
  stripe: () => `// ② 条纹：sin 函数生成明暗带
float s = sin(vUv.x * 40.0) // 40 = 条纹密度
float band = smoothstep(0.3, 0.9, s) // 平滑取带
vec3 color = mix(dark, light, band)
gl_FragColor = vec4(color, 1.0)
// 核心：任意数学函数都能成为
// 颜色/形状 —— shader 就是"逐像素计算"`,
  pulse: () => `// ③ 脉冲圆环：距离场 + 时间
uniform float uTime; // 每帧递增的全局时间
float d = distance(vUv, vec2(0.5)) // 到中心距离
float ring = abs(sin(d * 24.0 - uTime * 3.0))
// d*24 让环密集，减 uTime 让环向外扩散
float glow = exp(-d * 5.0) // 中心光晕
gl_FragColor = vec4(绿色 * (ring + glow))`,
  wave: () => `// ④ 波浪形变：顶点着色器改几何
// 顶点阶段：
uniform float uTime;
vec3 pos = position;
pos.z += sin(pos.x * 4.0 + uTime * 2.0) * 0.15;
gl_Position = projectionMatrix
  * modelViewMatrix * vec4(pos, 1.0)
// 原理：在 gl_Position 前修改 position，
// 物体的几何形状每帧都在变`,
  rgb: () => `// ⑤ 流光溢彩：RGB 三通道独立正弦
vec3 color = vec3(
  0.5 + 0.5 * sin(vUv.x * 8.0 + uTime),        // R
  0.5 + 0.5 * sin(vUv.y * 8.0 + uTime * 1.3), // G
  0.5 + 0.5 * sin((vUv.x + vUv.y) * 8.0
                  + uTime * 0.8)              // B
)
// 每通道独立频率 → 流动的彩虹效果`,
};

const explainMap: Record<string, () => string> = {
  uvGradient: () =>
    `【管线】顶点着色器（每顶点执行，输出 gl_Position）→ 光栅化 → 片元着色器（每像素执行，输出 gl_FragColor）。\n【变量】attribute 顶点属性（position/uv/normal）；uniform 全局常量（uTime）；varying 从顶点传递到片元。\n【本页】用内置 uv 坐标计算到中心距离 distance(vUv, 0.5)，mix 混合两种颜色得到径向渐变。`,
  stripe: () =>
    `【原理】片元着色器对每个像素执行，任何数学函数都能生成图案。sin(uv.x × 频率) 产生黑白交替条纹，smoothstep 柔化边缘。\n【要点】频率越高条纹越密；条纹方向由 uv 轴决定（uv.x 水平、uv.y 垂直）。\n【应用】条纹、网格线、扫描线、条形码。`,
  pulse: () =>
    `【原理】距离场（distance）描述"像素离中心多远"，结合时间 uTime 产生向外扩散的圆环。abs(sin(x)) 是经典的"环"函数。\n【要点】uTime 必须在每帧回调里递增：uniforms.uTime.value += delta。\n【应用】声波、雷达扫描、水波涟漪、能量护盾。`,
  wave: () =>
    `【原理】顶点着色器在投影前修改 position，几何体形状随之改变——这是"顶点动画"。\n【关键】position 是局部坐标，sin(pos.x × 频率 + uTime × 速度) 沿 x 方向传播波浪。\n【应用】水面起伏、旗帜飘动、软体形变、布料模拟的简化版。`,
  rgb: () =>
    `【原理】颜色是 vec3(r,g,b)，三个通道分别用不同频率/相位的正弦波驱动，产生流动的彩色渐变。\n【要点】0.5 + 0.5×sin(x) 把 [-1,1] 映射到 [0,1]（颜色合法范围）。\n【应用】霓虹、极光、UI 光效、动态渐变背景。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeShader);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(item, key) in SHADERS"
        :key="key"
        size="small"
        :type="activeShader === key ? 'primary' : 'default'"
        @click="applyShader(key)"
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

      <CodePanel :title="activeShader" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
