<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 场景内状态提示（黑底白字，实时显示当前变换值）
const statusText = ref('初始状态：position(0,1,0) rotation(0,0,0) scale(1,1,1)');
const activeTransform = ref('position');

const { scene } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 50, near: 0.1, far: 100, position: [4, 2.6, 5], lookAt: [0, 1, 0] },
  controls: { target: [0, 1, 0] },
  grid: { size: 6, divisions: 12 },
  axes: 3,
  lights: { ambient: 0.65, directional: 1.3, dirPosition: [5, 8, 6] },
});

// 父级（大立方体）+ 子级（小球，演示局部坐标继承）
let parentGroup: THREE.Group | null = null;
let cube: THREE.Mesh | null = null;
let childSphere: THREE.Mesh | null = null;
let childLine: THREE.Line | null = null;

const ORIGIN = { pos: new THREE.Vector3(0, 1, 0), rot: new THREE.Euler(0, 0, 0), scl: new THREE.Vector3(1, 1, 1) };

/* ================= 场景内容 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  parentGroup = new THREE.Group();
  parentGroup.name = '父级组';
  s.add(parentGroup);

  cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.1, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
  );
  cube.name = '红色立方体';
  cube.position.copy(ORIGIN.pos);
  parentGroup.add(cube);

  // 子物体：位于立方体正上方，演示局部坐标
  childSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 })
  );
  childSphere.name = '绿色小球';
  childSphere.position.set(0, 0.95, 0);
  parentGroup.add(childSphere);

  // 辅助线：子物体的局部 x 轴方向（从立方体中心到子物体）
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1.2, 0, 0),
  ]);
  childLine = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.6 })
  );
  parentGroup.add(childLine);

  applyTransform('position');
});

/* ================= 变换切换 ================= */
function resetAll() {
  if (!parentGroup || !cube || !childSphere) return;
  parentGroup.rotation.copy(ORIGIN.rot);
  parentGroup.scale.copy(ORIGIN.scl);
  parentGroup.position.set(0, 0, 0);
  cube.position.copy(ORIGIN.pos);
  cube.rotation.copy(ORIGIN.rot);
  cube.scale.copy(ORIGIN.scl);
  childSphere.position.set(0, 0.95, 0);
}

const TRANSFORMS: Record<string, { label: string; apply: () => void }> = {
  position: {
    label: '平移 position',
    apply: () => {
      if (!cube) return;
      cube.position.set(1.6, 1.2, 0.4);
      statusText.value = `position.set(1.6, 1.2, 0.4) → 世界坐标移动`;
    },
  },
  rotation: {
    label: '旋转 rotation',
    apply: () => {
      if (!cube) return;
      cube.rotation.set(0.3, Math.PI / 4, 0.2);
      statusText.value = `rotation = (0.3, π/4, 0.2) → 弧度制（90° = π/2）`;
    },
  },
  scale: {
    label: '缩放 scale',
    apply: () => {
      if (!cube) return;
      cube.scale.set(1.5, 0.8, 1.5);
      statusText.value = `scale = (1.5, 0.8, 1.5) → 各轴独立缩放`;
    },
  },
  combine: {
    label: '组合变换',
    apply: () => {
      if (!cube) return;
      cube.position.set(0.8, 1.4, 0.6);
      cube.rotation.set(0.4, Math.PI / 3, 0.1);
      cube.scale.set(1.3, 1.1, 1.3);
      statusText.value = `position + rotation + scale 叠加，先缩放→再旋转→最后平移`;
    },
  },
  local: {
    label: '子级局部坐标',
    apply: () => {
      if (!parentGroup || !cube || !childSphere) return;
      resetAll();
      // 父级旋转 45°，子物体沿自身局部 x 轴偏移 → 跟随父级方向
      parentGroup.rotation.y = Math.PI / 4;
      childSphere.position.set(1.2, 0.95, 0);
      statusText.value = `父级旋转 45° 后，子物体沿局部 x 轴移动 → 跟随父级方向`;
    },
  },
  reset: {
    label: '重置',
    apply: () => {
      resetAll();
      statusText.value = '初始状态：position(0,1,0) rotation(0,0,0) scale(1,1,1)';
    },
  },
};

function applyTransform(key: string) {
  activeTransform.value = key;
  resetAll();
  TRANSFORMS[key]!.apply();
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  position: () => `// ① 平移 position：物体在场景中的位置
mesh.position.set(x, y, z)      // 世界坐标
mesh.position.x += 1            // 单独改一轴
// 单位：与场景尺寸一致（米/格）
// 注意：position 是 Vector3，
// 支持 add / copy / lerp 等向量运算`,
  rotation: () => `// ② 旋转 rotation：欧拉角（弧度制）
mesh.rotation.set(0.3, Math.PI / 4, 0.2)
// 单位是弧度，不是角度！
// 90° = π/2 ≈ 1.5708
// 换算：rad = deg * Math.PI / 180
// 顺序：rotation.order 默认 XYZ
//  （先绕 X、再绕 Y、最后绕 Z）`,
  scale: () => `// ③ 缩放 scale：各轴独立缩放
mesh.scale.set(1.5, 0.8, 1.5)
// 1 = 原始大小；>1 放大；<1 缩小
// 负值 = 镜像翻转
// 注意：缩放会连带影响子物体与法线`,
  combine: () => `// ④ 组合变换：缩放→旋转→平移
mesh.position.set(0.8, 1.4, 0.6)
mesh.rotation.set(0.4, Math.PI / 3, 0.1)
mesh.scale.set(1.3, 1.1, 1.3)
// 实际执行顺序（TRS）：
// 先缩放 scale → 再旋转 rotation → 最后平移 position
// 矩阵 = T × R × S，顺序不能随意`,
  local: () => `// ⑤ 子级局部坐标：继承父级变换
parentGroup.rotation.y = Math.PI / 4
child.position.set(1.2, 0.95, 0)
// 子物体的位置是相对父级的"局部坐标"
// 父级旋转 → 子物体方向跟随旋转
// 获取世界坐标：
// child.getWorldPosition(targetVec3)`,
  reset: () => `// ⑥ 重置：恢复初始变换
mesh.position.set(0, 1, 0)
mesh.rotation.set(0, 0, 0)
mesh.scale.set(1, 1, 1)
// 组合变换后逐项归位即可
// 也可以 clone 初始值后 copy 回来`,
};

const explainMap: Record<string, () => string> = {
  position: () =>
    `【原理】position 保存物体在世界空间的位置（Vector3），渲染时被写入模型矩阵的平移分量。\n【要点】修改 x/y/z 即移动物体；支持向量运算（add、lerp 等），可用于补间与路径动画。\n【易错】子物体的 position 是相对父级的局部坐标，不是世界坐标。`,
  rotation: () =>
    `【原理】rotation 是欧拉角 Euler（弧度制），渲染时转换为旋转矩阵；默认顺序 XYZ（先绕 X 轴）。\n【换算】弧度 = 角度 × π/180；three.js 所有角度参数（含相机 fov 外的角度）都是弧度。\n【易错】万向锁问题：两个旋转轴重合时丢失一个自由度，复杂旋转建议用四元数 quaternion。`,
  scale: () =>
    `【原理】scale 各分量独立缩放模型矩阵的缩放部分；缩放会影响子物体（连带缩放）。\n【注意】非等比缩放（如 y=0.8）会改变法线方向，PBR 光照可能出现异常，通常需要 normalMatrix 修正（three 已自动处理）。\n【用途】缩放动画、压扁/拉伸效果、镜像（负值）。`,
  combine: () =>
    `【原理】最终矩阵 = T × R × S：先缩放、再旋转、最后平移（TRS 顺序）。\n【验证】先旋转再平移 vs 先平移再旋转结果不同——前者物体沿旋转后的轴移动，后者沿世界轴移动。\n【用途】理解矩阵顺序是掌握复杂变换（父子嵌套、相机跟随）的前提。`,
  local: () =>
    `【原理】场景图按层级传播变换：父级的位置/旋转/缩放会叠加到所有子级。子物体的 position 是相对父级的局部坐标。\n【演示】父级旋转 45° 后，子物体沿"自身局部 x 轴"偏移——方向随父级一起转。\n【API】getWorldPosition(vec) 取世界坐标；updateWorldMatrix(true, true) 强制刷新矩阵。`,
  reset: () =>
    `【原理】所有变换都存储在 position/rotation/scale 三个属性上，重置即恢复三者的初始值。\n【实践】动画/交互后常需要回到初始状态，可以保存初始 Vector3/Euler 快照，用 copy() 恢复。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeTransform);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(item, key) in TRANSFORMS"
        :key="key"
        size="small"
        :type="activeTransform === key ? 'primary' : 'default'"
        @click="applyTransform(key)"
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

      <CodePanel :title="activeTransform" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
