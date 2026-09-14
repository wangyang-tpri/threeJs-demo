<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 当前演示的纹理（切换时释放旧的）
let currentTexture: THREE.Texture | null = null;
let cubeMesh: THREE.Mesh | null = null;

const activeTexture = ref('map');

const { scene } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 50, near: 0.1, far: 100, position: [3.2, 2.4, 3.6], lookAt: [0, 0.8, 0] },
  controls: { target: [0, 0.8, 0] },
  grid: { size: 6, divisions: 12 },
  axes: 2,
  lights: { ambient: 0.65, directional: 1.3, dirPosition: [4, 7, 5] },
  onDispose: () => {
    currentTexture?.dispose();
    currentTexture = null;
  },
});

/* ================= 程序化纹理生成（CanvasTexture） ================= */
function makeCanvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  return new THREE.CanvasTexture(canvas);
}

// 棋盘格（颜色贴图）
function makeCheckerTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, (ctx, s) => {
    const cells = 8;
    const cell = s / cells;
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#3b82f6' : '#eff6ff';
        ctx.fillRect(i * cell, j * cell, cell, cell);
      }
    }
  });
}

// 随机噪点（凹凸贴图 / 粗糙度贴图底图）
function makeNoiseTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const v = Math.floor(Math.random() * 256);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 4, 4);
    }
  });
}

// 圆点阵列（法线贴图：点状凸起）
function makeDotTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#7f7fff'; // 法线贴图默认"平"为 (0.5,0.5,1) ≈ 蓝紫色
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#ffffff';
    const r = 26;
    for (let y = r; y < s; y += 64) {
      for (let x = r; x < s; x += 64) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// 斑点（粗糙度贴图：黑=光滑，白=粗糙）
function makeSpeckleTexture(): THREE.CanvasTexture {
  return makeCanvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      const r = 8 + Math.random() * 18;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/* ================= 场景内容 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), material);
  cubeMesh.position.y = 0.9;
  s.add(cubeMesh);

  // 默认：棋盘格颜色贴图（平铺 2x2）
  applyTexture('map');
});

/* ================= 切换纹理 ================= */
const TEXTURES: Record<string, { label: string; apply: (mat: THREE.MeshStandardMaterial) => void }> = {
  map: {
    label: '颜色贴图 map',
    apply: (mat) => {
      const t = makeCheckerTexture();
      t.repeat.set(2, 2);
      mat.map = t;
    },
  },
  bump: {
    label: '凹凸贴图 bumpMap',
    apply: (mat) => {
      mat.map = null;
      mat.bumpMap = makeNoiseTexture();
      mat.bumpScale = 1.2;
    },
  },
  normal: {
    label: '法线贴图 normalMap',
    apply: (mat) => {
      mat.map = null;
      mat.normalMap = makeDotTexture();
      mat.normalScale.set(1.2, 1.2);
    },
  },
  roughness: {
    label: '粗糙度贴图 roughnessMap',
    apply: (mat) => {
      mat.map = null;
      mat.roughnessMap = makeSpeckleTexture();
      mat.roughness = 0.6;
    },
  },
  repeat: {
    label: '平铺重复 repeat',
    apply: (mat) => {
      const t = makeCheckerTexture();
      t.repeat.set(4, 4);
      mat.map = t;
    },
  },
  rotate: {
    label: '纹理旋转 rotation',
    apply: (mat) => {
      const t = makeCheckerTexture();
      t.rotation = Math.PI / 4; // 旋转 45°
      t.center.set(0.5, 0.5); // 绕中心旋转
      mat.map = t;
    },
  },
};

function applyTexture(key: string) {
  activeTexture.value = key;
  const mat = cubeMesh?.material as THREE.MeshStandardMaterial | undefined;
  if (!mat) return;
  // 清理上一张纹理（map 由 repeat/rotate 复用同一生成器，逐个释放）
  [mat.map, mat.bumpMap, mat.normalMap, mat.roughnessMap].forEach((t) => {
    if (t) t.dispose();
  });
  mat.map = null;
  mat.bumpMap = null;
  mat.normalMap = null;
  mat.roughnessMap = null;
  mat.roughness = 0.5;
  TEXTURES[key]!.apply(mat);
  mat.needsUpdate = true;
  currentTexture = mat.map ?? mat.bumpMap ?? mat.normalMap ?? mat.roughnessMap;
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  map: () => `// ① 颜色贴图 map：物体表面最基础的贴图
const loader = new THREE.TextureLoader()
const texture = await loader.loadAsync('/textures/wood.jpg')
const material = new THREE.MeshStandardMaterial({
  map: texture, // 直接决定表面颜色
})
// 程序化版本（无需图片资源）：
const canvas = document.createElement('canvas')
// ... 绘制棋盘格 ...
const tex = new THREE.CanvasTexture(canvas)
tex.repeat.set(2, 2) // 平铺 2x2 次
material.map = tex`,
  bump: () => `// ② 凹凸贴图 bumpMap：仅改变光照明暗
material.bumpMap = bumpTexture // 灰度图
material.bumpScale = 1.2       // 凹凸强度
// 原理：只读取灰度值伪造凹凸明暗
// 优点：性能好，不改变几何体
// 缺点：不改变轮廓，边缘仍是平的`,
  normal: () => `// ③ 法线贴图 normalMap：精细凹凸
material.normalMap = normalTexture // RGB 方向图
material.normalScale.set(1.2, 1.2)
// 原理：用 RGB 编码表面法线方向
//  （红=X 轴，绿=Y 轴，蓝=Z 轴）
// 优势：可以精确控制凹凸方向
// 用途：砖墙、石雕、金属拉丝等细节`,
  roughness: () => `// ④ 粗糙度贴图 roughnessMap
material.roughnessMap = speckleTexture
material.roughness = 0.6 // 基础值
// 原理：贴图灰度映射粗糙度
// 黑(0) = 光滑（镜面反射强）
// 白(1) = 粗糙（漫反射强）
// 用途：锈迹斑驳的金属、磨损的漆面`,
  repeat: () => `// ⑤ 平铺重复 RepeatWrapping
const tex = new THREE.CanvasTexture(canvas)
tex.wrapS = THREE.RepeatWrapping // 水平平铺
tex.wrapT = THREE.RepeatWrapping // 垂直平铺
tex.repeat.set(4, 4)             // 重复 4x4 次
// 注意：默认 ClampToEdgeWrapping
//        不会平铺而是拉伸边缘`,
  rotate: () => `// ⑥ 纹理旋转 rotation
const tex = new THREE.CanvasTexture(canvas)
tex.rotation = Math.PI / 4 // 旋转 45°
tex.center.set(0.5, 0.5)   // 旋转中心（默认 0,0 左上角）
// 应用：地砖斜铺、木纹斜贴
// 注意：rotation 单位是弧度
//        center 是 UV 坐标 0~1`,
};

const explainMap: Record<string, () => string> = {
  map: () =>
    `【原理】颜色贴图（map）把一张图片直接映射到物体表面 UV 坐标，决定每个像素的最终颜色。\n【流程】TextureLoader 加载图片 → 赋给材质 map → 渲染器按 UV 采样。\n【平铺】wrapS/wrapT 设为 RepeatWrapping + repeat.set(n,n) 可重复平铺，适合地面、墙面。`,
  bump: () =>
    `【原理】凹凸贴图只读取灰度值（0~255），在光照计算中偏移表面法线，伪造出"坑洼"明暗，几何体本身不变。\n【参数】bumpScale 控制凹凸强度，负值可反转凹凸方向。\n【特点】性能开销小，但只在光照下可见，且物体轮廓不会变——这是与法线贴图的本质区别。`,
  normal: () =>
    `【原理】法线贴图用 RGB 三通道编码每个像素的表面法线方向（R=X、G=Y、B=Z），比灰度凹凸贴图更精确。\n【效果】可以表现凹槽、浮雕、刻痕等精细细节，且能正确响应光照方向。\n【用途】游戏/渲染中最常用的细节贴图，把百万级顶点细节"压缩"到一张图片里。`,
  roughness: () =>
    `【原理】粗糙度贴图把灰度值映射到 PBR 的 roughness 参数：黑色区域光滑（镜面反射强烈），白色区域粗糙（散射强烈）。\n【效果】同一物体表面可同时存在亮面与哑光面。\n【用途】做旧金属、污渍、水渍、磨损边缘。`,
  repeat: () =>
    `【原理】repeat.set(4,4) 让纹理在 U/V 两个方向各重复 4 次，配合 RepeatWrapping 无缝平铺。\n【细节】默认 wrapS/wrapT 是 ClampToEdgeWrapping（拉伸边缘）；重复次数可以是小数（如 2.5）实现错位。\n【用途】大面积地面、水面、墙体，一张小图铺满大场景。`,
  rotate: () =>
    `【原理】rotation 以弧度旋转纹理坐标系，center 指定旋转中心（UV 坐标，默认 (0,0) 为左下角，通常设 (0.5,0.5) 绕中心转）。\n【细节】旋转后纹理边缘会出现空白，配合 repeat 平铺可消除接缝。\n【用途】斜铺地砖、斜纹木地板、倾斜路面标线。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeTexture);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(item, key) in TEXTURES"
        :key="key"
        size="small"
        :type="activeTexture === key ? 'primary' : 'default'"
        @click="applyTexture(key)"
        >{{ item.label }}</n-button
      >
    </div>

    <!-- 主体：左 3D 场景 / 右 代码+讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div
        ref="containerRef"
        class="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      ></div>

      <CodePanel :title="activeTexture" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
