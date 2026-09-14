<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 场景内状态提示
const statusText = ref('当前动画：旋转');
const activeAnim = ref('rotate');

// 动画物体引用
let cube: THREE.Mesh | null = null;
let sphere: THREE.Mesh | null = null;
let orbiter: THREE.Mesh | null = null;
let knot: THREE.Mesh | null = null;

// 各物体初始状态快照
const INIT = {
  sphereY: 1,
  knotScale: 1,
};

const { scene } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 50, near: 0.1, far: 100, position: [4.5, 3, 5.5], lookAt: [0, 1, 0] },
  controls: { target: [0, 1, 0] },
  grid: { size: 7, divisions: 14 },
  axes: 3,
  lights: { ambient: 0.65, directional: 1.3, dirPosition: [5, 8, 6] },
  animate: (delta, time) => {
    if (!cube || !sphere || !orbiter || !knot) return;
    // 每帧先复位，避免切换后残留
    resetAll();
    const t = time / 1000; // 毫秒 → 秒
    switch (activeAnim.value) {
      case 'rotate':
        cube.rotation.y += delta * 1.5;
        break;
      case 'bounce':
        sphere.position.y = INIT.sphereY + 0.6 * Math.abs(Math.sin(t * 2.4));
        break;
      case 'orbit':
        orbiter.position.set(Math.cos(t * 1.2) * 2.2, 1, Math.sin(t * 1.2) * 2.2);
        break;
      case 'pulse':
        knot.scale.setScalar(INIT.knotScale + 0.2 * Math.sin(t * 3));
        break;
      case 'all':
        cube.rotation.y += delta * 1.5;
        sphere.position.y = INIT.sphereY + 0.6 * Math.abs(Math.sin(t * 2.4));
        orbiter.position.set(Math.cos(t * 1.2) * 2.2, 1, Math.sin(t * 1.2) * 2.2);
        knot.scale.setScalar(INIT.knotScale + 0.2 * Math.sin(t * 3));
        break;
    }
  },
});

function resetAll() {
  if (!cube || !sphere || !orbiter || !knot) return;
  cube.rotation.set(0, 0, 0);
  sphere.position.set(0, INIT.sphereY, 0);
  orbiter.position.set(2.2, 1, 0);
  knot.scale.setScalar(INIT.knotScale);
}

/* ================= 场景内容 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x4a9eff, roughness: 0.4 })
  );
  cube.name = '旋转立方体';
  cube.position.set(0, 1, 0);
  s.add(cube);

  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
  );
  sphere.name = '弹跳球体';
  sphere.position.set(0, INIT.sphereY, 0);
  s.add(sphere);

  orbiter = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 })
  );
  orbiter.name = '公转小球';
  orbiter.position.set(2.2, 1, 0);
  s.add(orbiter);

  knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.55, 0.18, 80, 12),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 })
  );
  knot.name = '脉冲环面结';
  knot.position.set(-2.2, 1, 0);
  s.add(knot);
});

/* ================= 动画模式切换 ================= */
const ANIMS: Record<string, { label: string; desc: string }> = {
  rotate: { label: '旋转动画', desc: '当前动画：旋转（每帧 rotation.y += delta × 速度）' },
  bounce: { label: '弹跳动画', desc: '当前动画：弹跳（正弦函数驱动 y 坐标）' },
  orbit: { label: '公转动画', desc: '当前动画：公转（cos/sin 参数方程画圆）' },
  pulse: { label: '脉冲缩放', desc: '当前动画：脉冲（正弦驱动 scale 呼吸）' },
  all: { label: '组合动画', desc: '当前动画：四物体同时运动' },
};

function applyAnim(key: string) {
  activeAnim.value = key;
  resetAll();
  statusText.value = ANIMS[key]!.desc;
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  rotate: () => `// ① 旋转动画：每帧累加角度
function animate(delta) {
  cube.rotation.y += delta * 1.5 // 每秒 1.5 弧度
}
// delta = 上一帧到本帧的秒数
// 用 delta 保证速度与帧率无关
// （60fps 和 30fps 下旋转速度一致）
// three.js 便捷方式：
renderer.setAnimationLoop(animate)`,
  bounce: () => `// ② 弹跳动画：正弦函数
const t = clock.getElapsedTime() // 累计秒数
sphere.position.y = 1 + 0.6 * Math.abs(
  Math.sin(t * 2.4)
)
// sin 值域 [-1,1] 自然上下往返
// 取绝对值 abs → 0~1 的"反弹"曲线
// 调整频率 2.4 控制弹跳快慢`,
  orbit: () => `// ③ 公转动画：参数方程画圆
const t = clock.getElapsedTime()
const r = 2.2 // 轨道半径
orbiter.position.x = Math.cos(t * 1.2) * r
orbiter.position.z = Math.sin(t * 1.2) * r
// (cosθ, sinθ) 是单位圆参数方程
// 频率 1.2 控制公转速度
// 想有椭圆轨道：x/z 半径不同即可`,
  pulse: () => `// ④ 脉冲缩放：正弦呼吸
const t = clock.getElapsedTime()
const s = 1 + 0.2 * Math.sin(t * 3)
knot.scale.setScalar(s)
// scale 分量同步变化
// 0.8 ~ 1.2 之间平滑呼吸
// 心脏跳动感：用 |sin| 或 easing 函数`,
  all: () => `// ⑤ 组合动画：多物体同时驱动
function animate(delta) {
  const t = clock.getElapsedTime()
  cube.rotation.y += delta * 1.5
  sphere.position.y = 1 + 0.6 * Math.abs(Math.sin(t * 2.4))
  orbiter.position.set(
    Math.cos(t * 1.2) * 2.2, 1,
    Math.sin(t * 1.2) * 2.2
  )
  knot.scale.setScalar(1 + 0.2 * Math.sin(t * 3))
}
// 同一帧内可驱动任意多个物体
// 每类动画用不同参数独立控制`,
};

const explainMap: Record<string, () => string> = {
  rotate: () =>
    `【原理】动画本质是"每帧修改属性 + 重绘"。renderer.setAnimationLoop(cb) 每帧调用回调，cb 中更新物体属性即产生动画。\n【关键】使用 delta（帧间隔秒数）累加角度，保证不同帧率下速度一致——不用 delta 的话 144Hz 会比 60Hz 快 2.4 倍。\n【对比】requestAnimationFrame 手写循环与 setAnimationLoop 效果相同，后者还能和 XR/WebGPU 兼容。`,
  bounce: () =>
    `【原理】sin(t) 是连续平滑的周期函数，天然适合往返运动。取绝对值 |sin| 产生"碰地反弹"的 V 形曲线。\n【参数】频率（2.4）控制快慢；振幅（0.6）控制高度；基准值（1）控制弹跳中心。\n【进阶】结合 easeOutBounce 等缓动函数可做更真实的落地反弹。`,
  orbit: () =>
    `【原理】圆的参数方程 x=r·cosθ、z=r·sinθ，让 θ 随时间增长即画出圆周轨迹。\n【参数】半径 r 控制轨道大小；角速度（1.2）控制公转速度。\n【进阶】椭圆轨道（x/z 半径不同）、轨道倾斜（旋转轨道 Group）、行星自转+公转组合。`,
  pulse: () =>
    `【原理】scale.setScalar(s) 让物体在 0.8~1.2 之间周期性缩放，模拟呼吸/心跳/脉冲。\n【要点】缩放同样用正弦驱动，只是作用于 scale 而非 position。\n【进阶】结合透明度（材质 transparent + opacity）可做淡入淡出；结合 rotation 可做"心脏跳动的加旋"效果。`,
  all: () =>
    `【原理】动画循环只有一个，但可以在其中同时驱动任意多个物体的任意属性——这是"场景动画"的核心模式。\n【组织】物体多了以后建议拆分为独立函数（updateCube/updateSphere...）或使用状态机管理动画状态。\n【进阶】正式项目用 three.js AnimationClip + AnimationMixer 管理复杂骨骼/属性动画（模型加载页已演示）。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeAnim);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(item, key) in ANIMS"
        :key="key"
        size="small"
        :type="activeAnim === key ? 'primary' : 'default'"
        @click="applyAnim(key)"
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

      <CodePanel :title="activeAnim" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
