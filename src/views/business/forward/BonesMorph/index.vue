<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap gap-2">
      <n-button
        v-for="b in buttons"
        :key="b.key"
        :type="activeMode === b.key ? 'primary' : 'default'"
        size="small"
        @click="applyMode(b.key)"
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
      <CodePanel title="骨骼与变形动画" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);
const statusText = ref('加载中…');
const activeMode = ref('arm');

// ---- 骨骼 ----
let skinnedMesh: THREE.SkinnedMesh | null = null;
let skeleton: THREE.Skeleton | null = null;
let mixer: THREE.AnimationMixer | null = null;
let armAction: THREE.AnimationAction | null = null;
let armGroup: THREE.Group | null = null;

// ---- Morph 变形 ----
let morphMesh: THREE.Mesh | null = null;
let morphMixer: THREE.AnimationMixer | null = null;
let stretchAction: THREE.AnimationAction | null = null;
let squashAction: THREE.AnimationAction | null = null;
let morphGroup: THREE.Group | null = null;

const buttons = [
  { key: 'arm', label: '骨骼动画（机械臂）' },
  { key: 'arm-pause', label: '暂停骨骼' },
  { key: 'morph-stretch', label: 'Morph 拉伸' },
  { key: 'morph-squash', label: 'Morph 压扁' },
  { key: 'morph-blend', label: 'Morph 混合' },
  { key: 'reset', label: '复位' },
];

const { scene, camera } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 50, position: [5, 4, 6], lookAt: [0, 1.2, 0] },
  controls: { target: [0, 1.2, 0] },
  grid: { size: 8, divisions: 16 },
  axes: 2,
  lights: { ambient: 0.7, directional: 1.3, dirPosition: [5, 10, 7] },
  animate: (delta) => {
    mixer?.update(delta);
    morphMixer?.update(delta);
  },
  onDispose: () => {
    mixer?.stopAllAction();
    morphMixer?.stopAllAction();
  },
});

/* ============ 骨骼动画：程序化机械臂 ============ */
function buildArm() {
  const s = scene.value;
  if (!s) return;

  // 1. 创建骨骼层级：底座 → 上臂 → 下臂
  const b0 = new THREE.Bone();
  b0.name = 'baseBone';
  const b1 = new THREE.Bone();
  b1.name = 'upperBone';
  b1.position.set(0, 0.9, 0); // 相对父骨骼位置：上臂起始于 y=0.9
  const b2 = new THREE.Bone();
  b2.name = 'lowerBone';
  b2.position.set(0, 0.9, 0); // 下臂起始于 y=1.8
  b0.add(b1);
  b1.add(b2);

  // 2. 几何体：一根 1×2.8×0.45 的"手臂"，顶点按 y 分段绑定骨骼
  const geo = new THREE.BoxGeometry(0.45, 2.8, 0.45, 1, 8, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // y∈[0,0.9)→底座(bone0)；[0.9,1.8)→上臂(bone1)；[1.8,2.8]→下臂(bone2)
    let bone = 0;
    if (y >= 0.9 && y < 1.8) bone = 1;
    else if (y >= 1.8) bone = 2;
    skinIndices.push(bone, 0, 0, 0);
    skinWeights.push(1, 0, 0, 0);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  // 3. 材质 + SkinnedMesh + Skeleton（骨骼系统核心）
  const mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35, metalness: 0.15 });
  skinnedMesh = new THREE.SkinnedMesh(geo, mat);
  skeleton = new THREE.Skeleton([b0, b1, b2]);
  skinnedMesh.add(b0); // 骨骼树挂到网格上
  skinnedMesh.bind(skeleton);

  // 4. 底座 + 末端小球（装饰，非骨骼）
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
  base.position.y = -0.18;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  tip.position.y = 2.8;

  armGroup = new THREE.Group();
  armGroup.add(skinnedMesh, base, tip);
  armGroup.position.y = 0.2;
  s.add(armGroup);

  // 5. AnimationClip：关键帧驱动骨骼旋转（注意 track 名用骨骼 name）
  const times = [0, 1, 2];
  const clip = new THREE.AnimationClip('armWave', 2, [
    new THREE.VectorKeyframeTrack('upperBone.rotation', times, [0, 0, 0.9, 0, 0, -0.9, 0, 0, 0]),
    new THREE.VectorKeyframeTrack('lowerBone.rotation', times, [0, 0, -1.2, 0, 0, 1.2, 0, 0, -1.2]),
  ]);
  mixer = new THREE.AnimationMixer(skinnedMesh);
  armAction = mixer.clipAction(clip);
  armAction.setLoop(THREE.LoopPingPong, Infinity);
  armAction.play();
}

/* ============ Morph 变形动画 ============ */
function buildMorph() {
  const s = scene.value;
  if (!s) return;

  // 1. 基础几何体：立方体
  const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4, 8, 8, 8);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  // 2. 计算两个 MorphTarget：拉伸（y×2.2）与压扁（y×0.4）
  const stretchPos: number[] = [];
  const squashPos: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    stretchPos.push(x, y * 2.2, z);
    squashPos.push(x, y * 0.4, z);
  }
  geo.morphAttributes.position = [
    new THREE.Float32BufferAttribute(stretchPos, 3),
    new THREE.Float32BufferAttribute(squashPos, 3),
  ];

  // 3. 材质必须开启 morphTargets（three r185 材质属性类型未含，运行时存在）
  const mat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.3 }) as THREE.MeshStandardMaterial & { morphTargets: boolean };
  mat.morphTargets = true;
  morphMesh = new THREE.Mesh(geo, mat);
  morphGroup = new THREE.Group();
  morphGroup.add(morphMesh);
  morphGroup.position.y = 1.5;
  s.add(morphGroup);

  // 4. AnimationClip 驱动 morphTargetInfluences（0→1→0）
  const times = [0, 1, 2];
  morphMixer = new THREE.AnimationMixer(morphMesh);
  const stretchClip = new THREE.AnimationClip('stretch', 2, [
    new THREE.NumberKeyframeTrack('.morphTargetInfluences[0]', times, [0, 1, 0]),
  ]);
  const squashClip = new THREE.AnimationClip('squash', 2, [
    new THREE.NumberKeyframeTrack('.morphTargetInfluences[1]', times, [0, 1, 0]),
  ]);
  stretchAction = morphMixer.clipAction(stretchClip);
  squashAction = morphMixer.clipAction(squashClip);
}

/* ============ 模式切换 ============ */
function resetMorph() {
  morphMixer?.stopAllAction();
  if (morphMesh) {
    morphMesh.morphTargetInfluences = [0, 0];
  }
}

function applyMode(key: string) {
  activeMode.value = key;
  switch (key) {
    case 'arm': {
      armAction?.play();
      statusText.value = '骨骼动画：AnimationMixer 播放关键帧，驱动 upperBone/lowerBone 旋转（PingPong）';
      break;
    }
    case 'arm-pause': {
      armAction?.stop();
      statusText.value = '骨骼已暂停：骨骼停在当前姿态，顶点跟随骨骼矩阵变换';
      break;
    }
    case 'morph-stretch': {
      resetMorph();
      stretchAction?.play();
      statusText.value = 'Morph 拉伸：morphTargetInfluences[0] 0→1→0，顶点向拉伸目标插值';
      break;
    }
    case 'morph-squash': {
      resetMorph();
      squashAction?.play();
      statusText.value = 'Morph 压扁：morphTargetInfluences[1] 0→1→0，顶点向压扁目标插值';
      break;
    }
    case 'morph-blend': {
      resetMorph();
      stretchAction?.play();
      squashAction?.play();
      statusText.value = 'Morph 混合：两个 MorphTarget 同时生效（influences 各自独立）';
      break;
    }
    case 'reset': {
      armAction?.stop();
      resetMorph();
      if (armGroup) armGroup.rotation.y = 0;
      statusText.value = '已复位：停止全部动画，恢复初始姿态';
      break;
    }
  }
}

/* ============ 代码讲解 ============ */
const CODE = {
  arm: () => `// ===== 1. 创建骨骼层级（Bone 继承 Object3D，可嵌套）=====
const b0 = new THREE.Bone()      // 底座
const b1 = new THREE.Bone()      // 上臂
b1.position.set(0, 0.9, 0)       // 相对父骨骼偏移
const b2 = new THREE.Bone()      // 下臂
b2.position.set(0, 0.9, 0)
b0.add(b1); b1.add(b2)

// ===== 2. 每个顶点记录"受哪根骨骼影响" =====
// skinIndex: 顶点所属骨骼序号（0/1/2）
// skinWeight: 影响权重（1 = 完全跟随）
geo.setAttribute('skinIndex', ...)
geo.setAttribute('skinWeight', ...)

// ===== 3. SkinnedMesh 绑定 Skeleton =====
const mesh = new THREE.SkinnedMesh(geo, mat)
const skeleton = new THREE.Skeleton([b0, b1, b2])
mesh.add(b0)
mesh.bind(skeleton)

// ===== 4. 动画 =====
// track 名 = 骨骼 name + 属性路径
const track = new THREE.VectorKeyframeTrack(
  'upperBone.rotation', [0, 1, 2], [0,0,0.9, 0,0,-0.9, 0,0,0])
const clip = new THREE.AnimationClip('armWave', 2, [track])
const mixer = new THREE.AnimationMixer(mesh)
mixer.clipAction(clip).play()   // 每帧 mixer.update(dt)`,
  morph: () => `// ===== 1. 定义 MorphTarget（顶点位置的目标值）=====
// 拉伸：所有顶点 y × 2.2
const stretch = new THREE.Float32BufferAttribute(stretchPos, 3)
geo.morphAttributes.position = [stretch, squash]

// ===== 2. 材质开启 morphTargets =====
const mat = new THREE.MeshStandardMaterial({
  morphTargets: true,
})

// ===== 3. 通过 influences 控制混合程度 =====
// 0 = 原始形状，1 = 完全变形成目标
mesh.morphTargetInfluences = [0, 0]

// ===== 4. 动画化影响度 =====
// 注意 track 名以 "." 开头 = 绑定 mixer 根对象自身
const track = new THREE.NumberKeyframeTrack(
  '.morphTargetInfluences[0]',   // 第 0 个 target 的影响度
  [0, 1, 2], [0, 1, 0])
const clip = new THREE.AnimationClip('stretch', 2, [track])
const mixer = new THREE.AnimationMixer(mesh)
mixer.clipAction(clip).play()`,
  'arm-pause': () => `// 暂停动画：mixer.stopAllAction() 或 action.stop()
armAction.stop()
// 骨骼停留在当前姿态——顶点仍按骨骼矩阵变换，
// 只是不再随时间更新。

// 继续播放：
armAction.play()

// AnimationMixer 的核心 API：
// - clipAction(clip)：获取/创建动作
// - play() / stop() / pause() / reset()
// - update(delta)：推进时间轴（必须在渲染循环每帧调用）
// - 多个 Action 可叠加播放（权重混合）`,
  'morph-stretch': () => `// 只播放拉伸动画（influences[0]）
stretchAction.play()

// 等价于手动控制：
// mesh.morphTargetInfluences[0] 随时间 0→1→0
// 顶点位置 = 原始 + (拉伸目标 - 原始) × 影响度

// 注意：MorphTarget 0 对应 geometry.morphAttributes.position[0]
// influences 数组下标与 morphAttributes 数组一一对应`,
  'morph-squash': () => `// 只播放压扁动画（influences[1]）
squashAction.play()

// 与拉伸的区别：用的是第 1 个 MorphTarget
// mesh.morphTargetInfluences[1] 随时间 0→1→0

// 顶点位置 = 原始 + Σ(target[i] - 原始) × influences[i]
// 多个 MorphTarget 各自独立、可任意组合`,
  'morph-blend': () => `// 同时播放两个 Morph 动画：混合效果
stretchAction.play()
squashAction.play()

// 两个 influences 同时驱动：
// influences[0]（拉伸）与 influences[1]（压扁）
// 可分别达到任意值——这就是"表情混合"的原理：
// 眼睛睁大 + 嘴角上扬 = 两个 MorphTarget 叠加

// 生产中的 Morph 角色（人脸）常有几十个 target，
// 混合器逐顶点累加所有 target 的位移`,
  reset: () => `// 复位：停止全部动画并恢复初始状态
mixer.stopAllAction()   // 停止骨骼动作
morphMixer.stopAllAction() // 停止 Morph 动作
mesh.morphTargetInfluences = [0, 0] // 形状归零
group.rotation.y = 0    // 姿态归位

// 动画系统清理三板斧：
// 1. stopAllAction() 停止所有动作
// 2. 属性复位（influences / rotation 等）
// 3. 按需 dispose() 几何体与材质`,
};

const EXPLAIN = {
  arm: () => `骨骼动画（Skinning）分三步理解：

1. 骨骼树：Bone 就是带层级关系的 Object3D，父骨骼旋转会带动子骨骼。
2. 蒙皮权重：几何体每个顶点记录 skinIndex（哪根骨骼）和 skinWeight（权重）。顶点位置 = Σ 骨骼矩阵 × 权重。
3. 绑定：SkinnedMesh.bind(skeleton) 建立"骨骼矩阵 → 顶点"的绑定关系。

渲染时 GPU 通过骨骼矩阵（boneMatrix）变换顶点：
  gl_Position = 投影矩阵 × 骨骼矩阵 × 顶点位置

动画的本质是 AnimationMixer 按时间插值关键帧，写入骨骼的 rotation/position，顶点自动跟随。这比逐顶点动画高效得多——游戏角色动作几乎都用骨骼。`,
  morph: () => `Morph Targets（混合变形/形状关键帧）是另一种顶点动画：

1. 几何体保存多个"目标形状"（同一数量、同一顺序的顶点集）
2. morphTargetInfluences 数组控制每个目标的混合权重
3. 最终顶点 = 原始位置 + Σ (目标位移 × 影响度)

对比：
- 骨骼动画：顶点跟随骨骼旋转，适合肢体/角色动作
- Morph 动画：顶点直接插值，适合表情、嘴型、肌肉鼓胀
- 两者可同时使用（游戏角色 = 骨骼走路 + Morph 表情）

注意：Morph 的每个 target 需要与原始几何体顶点一一对应，数据量大；因此通常只在局部区域（如面部）使用。`,
  'arm-pause': () => `暂停 vs 播放：
- Action.stop()：停止动作，骨骼停留在当前关键帧位置
- Action.play()：从当前时间继续播放
- mixer.update(delta)：每帧推进动画时间轴（必须在渲染循环里调用）

动画系统三件套：
- AnimationClip：关键帧数据（轨道 + 时长）
- AnimationAction：一次"播放"（循环方式、速度、权重）
- AnimationMixer：管理多个 Action 并驱动更新

一个 mixer 可以同时播放多个动作（走路 + 挥剑），通过 action.crossFadeTo() 平滑过渡。`,
  'morph-stretch': () => `拉伸只动第 0 个 MorphTarget：
- influences[0] 0 → 1 → 0，立方体沿 Y 轴拉长 2.2 倍再回弹
- 顶点插值发生在 GPU：每帧上传 morphTargetInfluences uniform

MorphTarget 的本质：一个"目标顶点数组"。GPU 计算：
  finalPos = basePos + (targetPos - basePos) × influence
多个 target 叠加求和。`,
  'morph-squash': () => `压扁用第 1 个 MorphTarget：
- influences[1] 0 → 1 → 0，立方体压扁到 40% 高度

观察与拉伸的对比：同一个基础几何体，
两个 target 分别往"长"和"扁"两个方向变形——
动画控制器只改影响度数字，几何体本身不变。`,
  'morph-blend': () => `混合模式同时驱动两个 MorphTarget：
- 拉伸与压扁同时进行，形状 = 两个方向变形的叠加
- 这正是游戏角色表情系统的基础（blend shapes）

Blend Shapes 工业标准：
- 3D 建模软件（Blender/Maya）里捏好基础形 + 目标形
- 导出时 morphAttributes 与 morphTargetDictionary
- 运行时按权重混合——嘴型/皱眉/眨眼各占一个 target`,
  reset: () => `复位动作 = 动画系统的"归零"操作：
- 停止所有 Action（骨骼 + Morph）
- 重置 morphTargetInfluences 为 0
- 旋转归位

教学站中每个页面的"复位"按钮都是这套思路：
先停动画，再恢复初始状态，最后（必要时）释放 GPU 资源。`,
};

const { code, explanation } = useCodeExplain(CODE, EXPLAIN, activeMode);

onMounted(() => {
  buildArm();
  buildMorph();
  applyMode('arm');
});
</script>
