<script setup lang="ts">
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 场景内状态提示：实时 draw calls / triangles
const statusText = ref('加载中…');
const activeMode = ref('regular');
const count = ref(500);

let sceneGroup: THREE.Group | null = null;
let frameCount = 0;
let building = false;

const { scene, renderer } = useThreeScene(containerRef, {
  background: 0x0f172a,
  camera: { fov: 50, near: 0.1, far: 100, position: [0, 6, 9], lookAt: [0, 0, 0] },
  controls: { target: [0, 0, 0] },
  grid: false,
  axes: 2,
  lights: { ambient: 0.6, directional: 1.2, dirPosition: [5, 10, 7] },
  animate: (delta) => {
    // 整体缓慢旋转，直观看到全部物体
    if (sceneGroup) sceneGroup.rotation.y += delta * 0.12;
    // 每 12 帧刷新一次性能统计
    frameCount++;
    if (frameCount % 12 === 0) {
      const info = renderer.value?.info.render;
      if (info) {
        statusText.value = `模式：${MODE_LABEL[activeMode.value] ?? ''}｜物体 × ${count.value}｜draw calls：${info.calls}｜三角形：${info.triangles.toLocaleString()}`;
      }
    }
  },
});

const MODE_LABEL: Record<string, string> = {
  regular: '普通独立网格',
  instanced: '实例化 InstancedMesh',
  merged: '几何体合并',
};

/* ================= 场景构建 ================= */
// 随机生成 count 个变换矩阵（位置/旋转/缩放）
function makeTransforms(n: number): THREE.Matrix4[] {
  const mats: THREE.Matrix4[] = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 7
    );
    const quat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    );
    const scl = new THREE.Vector3(0.35 + Math.random() * 0.5, 0.35 + Math.random() * 0.5, 0.35 + Math.random() * 0.5);
    m.compose(pos, quat, scl);
    mats.push(m);
  }
  return mats;
}

function clearSceneGroup() {
  if (!sceneGroup) return;
  scene.value?.remove(sceneGroup);
  sceneGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
  sceneGroup = null;
}

// 模式一：普通独立 Mesh（N 个物体 = N 次 draw call）
function buildRegular(n: number) {
  const group = new THREE.Group();
  group.name = '普通模式';
  const mats = makeTransforms(n);
  for (let i = 0; i < n; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL((i / n) * 0.8, 0.8, 0.55),
        roughness: 0.4,
      })
    );
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(mats[i]!);
    mesh.frustumCulled = false; // 关闭视锥剔除，保证 500 个全部参与渲染（统计完整对比）
    group.add(mesh);
  }
  return group;
}

// 模式二：InstancedMesh（N 个物体 = 1 次 draw call）
function buildInstanced(n: number) {
  const group = new THREE.Group();
  group.name = '实例化模式';
  const instanced = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 0.55, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x4a9eff, roughness: 0.4 }),
    n
  );
  const mats = makeTransforms(n);
  const dummy = new THREE.Object3D();
  mats.forEach((m, i) => {
    dummy.matrix.copy(m);
    instanced.setMatrixAt(i, dummy.matrix);
  });
  instanced.instanceMatrix.needsUpdate = true;
  group.add(instanced);
  return group;
}

// 模式三：mergeGeometries 合并（把变换烘焙进几何体，1 个 Mesh = 1 次 draw call）
function buildMerged(n: number) {
  const group = new THREE.Group();
  group.name = '合并模式';
  const mats = makeTransforms(n);
  const geos: THREE.BufferGeometry[] = mats.map((m) => {
    const g = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    g.applyMatrix4(m); // 变换烘焙进顶点
    return g;
  });
  const merged = mergeGeometries(geos);
  if (merged) {
    const mesh = new THREE.Mesh(
      merged,
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 })
    );
    group.add(mesh);
  }
  return group;
}

/* ================= 场景内容 ================= */
onMounted(() => {
  buildMode('regular');
});

/* ================= 模式切换 ================= */
const MODES: Record<string, { label: string; build: (n: number) => THREE.Group }> = {
  regular: { label: '普通独立网格', build: buildRegular },
  instanced: { label: '实例化渲染', build: buildInstanced },
  merged: { label: '几何体合并', build: buildMerged },
};

function buildMode(key: string) {
  if (building) return;
  building = true;
  try {
    activeMode.value = key;
    clearSceneGroup();
    sceneGroup = MODES[key]!.build(count.value);
    scene.value?.add(sceneGroup);
    statusText.value = `正在构建 ${count.value} 个物体…`;
    // 等两帧后渲染统计生效
    frameCount = 0;
    setTimeout(() => {
      const info = renderer.value?.info.render;
      if (info) {
        statusText.value = `模式：${MODE_LABEL[key] ?? ''}｜物体 × ${count.value}｜draw calls：${info.calls}｜三角形：${info.triangles.toLocaleString()}`;
      }
    }, 300);
  } finally {
    building = false;
  }
}

function applyCount(n: number) {
  count.value = n;
  buildMode(activeMode.value);
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  regular: () => `// ① 普通模式：N 个独立 Mesh
for (let i = 0; i < 500; i++) {
  const mesh = new THREE.Mesh(geo, material)
  mesh.matrix.copy(transform[i])
  mesh.matrixAutoUpdate = false
  scene.add(mesh)
}
// 每个 Mesh 单独提交一次 draw call
// 500 个物体 = 500+ 次 draw call
// 瓶颈：CPU 提交指令 + 状态切换`,
  instanced: () => `// ② 实例化：InstancedMesh
const instanced = new THREE.InstancedMesh(
  geometry, material, 500 // 实例数量
)
const dummy = new THREE.Object3D()
mats.forEach((m, i) => {
  dummy.matrix.copy(m)
  instanced.setMatrixAt(i, dummy.matrix)
})
instanced.instanceMatrix.needsUpdate = true
scene.add(instanced)
// 一次 draw call 渲染全部 500 个
// 相同几何体+材质时性能提升巨大`,
  merged: () => `// ③ 几何体合并：mergeGeometries
import { mergeGeometries } from
  'three/addons/utils/BufferGeometryUtils.js'

const geos = transforms.map((m) => {
  const g = new THREE.BoxGeometry(0.55, 0.55, 0.55)
  g.applyMatrix4(m) // 变换烘焙进顶点
  return g
})
const merged = mergeGeometries(geos)
scene.add(new THREE.Mesh(merged, material))
// 1 个 Mesh = 1 次 draw call
// 注意：合并后无法单独控制每个物体
//       （拾取/动画/显隐都失效）`,
};

const explainMap: Record<string, () => string> = {
  regular: () =>
    `【概念】draw call = CPU 向 GPU 提交的一次绘制指令。每帧 draw calls 越多，CPU 开销越大（状态切换、指令提交）。\n【本页】500 个独立 Mesh → 500+ 次 draw call。renderer.info.render.calls 可实时查看。\n【优化方向】把"相同几何体+材质"的物体合并/实例化，减少 draw call。`,
  instanced: () =>
    `【原理】InstancedMesh：一份几何体 + 一份材质 + 一组变换矩阵（instanceMatrix），GPU 按矩阵批量绘制 N 次，只提交 1 次 draw call。\n【适用】大量相同形状的物体：树木、路灯、弹壳、砖块、粒子替代品。\n【限制】每个实例只能通过矩阵变换（不能独立换材质）；需要单独显隐时用 setColorAt/setMatrixAt 置零。`,
  merged: () =>
    `【原理】mergeGeometries 把所有几何体顶点合并进一个 BufferGeometry（变换用 applyMatrix4 烘焙进顶点坐标），最终 1 个 Mesh 渲染。\n【优点】draw call 降至 1，适合静态大场景（地形、建筑群）。\n【缺点】合并后无法单独控制/拾取/动画单个物体——静态场景首选，动态物体用 InstancedMesh。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeMode);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(item, key) in MODES"
        :key="key"
        size="small"
        :type="activeMode === key ? 'primary' : 'default'"
        @click="buildMode(key)"
        >{{ item.label }}</n-button
      >
      <span class="mx-1 text-xs text-gray-400">物体数量：</span>
      <n-button
        v-for="n in [100, 500, 1000]"
        :key="n"
        size="small"
        :type="count === n ? 'primary' : 'default'"
        @click="applyCount(n)"
        >{{ n }}</n-button
      >
    </div>

    <!-- 主体：左 3D 场景 / 右 代码+讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div
        ref="containerRef"
        class="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      >
        <!-- 性能统计条（实时刷新） -->
        <div
          class="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/70 px-2 py-1 text-xs text-white"
        >
          {{ statusText }}
        </div>
      </div>

      <CodePanel :title="activeMode" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
