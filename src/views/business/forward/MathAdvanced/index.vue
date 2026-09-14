<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap gap-2">
      <n-button
        v-for="b in buttons"
        :key="b.key"
        :type="activeMode === b.key ? 'primary' : 'default'"
        size="small"
        @click="onButtonClick(b.key)"
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
      <CodePanel title="数学进阶 · Vector3 / Matrix4 / Quaternion" :code="code" :explanation="explanation" />
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
const activeMode = ref('dot');

// 动态演示对象
let arrowA: THREE.ArrowHelper | null = null;
let arrowB: THREE.ArrowHelper | null = null;
let arrowCross: THREE.ArrowHelper | null = null;
let demoMesh: THREE.Mesh | null = null;
let parentGroup: THREE.Group | null = null;
let childMesh: THREE.Mesh | null = null;

// 万向锁
let gimbalPitch = 0;
let gimbalYaw = 0;
let gimbalQuatMode = false;
let gimbalMesh: THREE.Group | null = null;

// slerp
let slerpFrom = new THREE.Quaternion();
let slerpTo = new THREE.Quaternion();
let slerpT = 0;
let slerpMesh: THREE.Mesh | null = null;

const buttons = [
  { key: 'dot', label: '点积 dot' },
  { key: 'cross', label: '叉积 cross' },
  { key: 'matrix', label: '矩阵变换' },
  { key: 'slerp', label: '四元数 slerp' },
  { key: 'gimbal', label: '万向锁' },
  { key: 'gimbal-90', label: '升到 90°' },
  { key: 'gimbal-quat', label: '切换四元数' },
  { key: 'local-world', label: '局部 vs 世界' },
];

const { scene, camera } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 50, position: [5, 3.5, 6], lookAt: [0, 0, 0] },
  controls: { target: [0, 0, 0] },
  grid: { size: 8, divisions: 16 },
  axes: 2.5,
  lights: { ambient: 0.7, directional: 1.3, dirPosition: [5, 10, 7] },
  animate: (delta, time) => {
    const t = time / 1000;
    if (activeMode.value === 'dot') {
      // 向量 B 绕 Y 轴缓慢旋转，实时计算点积与夹角
      const angle = t * 0.8;
      const dirB = new THREE.Vector3(Math.cos(angle), 0.3, Math.sin(angle)).normalize();
      if (arrowB) {
        arrowB.setDirection(dirB.clone());
        arrowB.setLength(2.4);
      }
      const dirA = new THREE.Vector3(1, 0.3, 0).normalize();
      const dot = dirA.dot(dirB);
      const deg = (Math.acos(THREE.MathUtils.clamp(dot, -1, 1)) * 180) / Math.PI;
      statusText.value = `点积 a·b = ${dot.toFixed(3)}｜夹角 θ = ${deg.toFixed(1)}°｜b=(${dirB.x.toFixed(2)}, ${dirB.y.toFixed(2)}, ${dirB.z.toFixed(2)})`;
    } else if (activeMode.value === 'slerp') {
      // 四元数球面插值动画：0→1 循环
      slerpT = (t * 0.5) % 1;
      const q = new THREE.Quaternion().slerpQuaternions(slerpFrom, slerpTo, slerpT);
      slerpMesh?.quaternion.copy(q);
      const deg = 2 * Math.acos(Math.min(1, Math.max(-1, q.w))) * (180 / Math.PI);
      statusText.value = `slerp 进度 ${(slerpT * 100).toFixed(0)}%｜绕轴旋转 ${deg.toFixed(0)}°｜四元数 (${q.x.toFixed(3)}, ${q.y.toFixed(3)}, ${q.z.toFixed(3)}, ${q.w.toFixed(3)})`;
    } else if (activeMode.value === 'gimbal') {
      // 万向锁演示：欧拉角模式 pitch→90° 后 yaw 失效
      if (gimbalMesh) {
        if (gimbalQuatMode) {
          // 四元数模式：欧拉 yaw 依然有效
          gimbalYaw = (gimbalYaw + delta * 1.2) % (Math.PI * 2);
          gimbalMesh.quaternion.setFromEuler(new THREE.Euler(gimbalPitch, gimbalYaw, 0));
        } else {
          gimbalMesh.rotation.set(gimbalPitch, gimbalYaw, 0);
        }
      }
    } else if (activeMode.value === 'local-world') {
      // 父组旋转，子物体世界坐标实时显示
      if (parentGroup) {
        parentGroup.rotation.y = Math.sin(t * 0.8) * 1.2;
      }
      if (childMesh) {
        const wp = new THREE.Vector3();
        childMesh.getWorldPosition(wp);
        statusText.value = `子物体 local=(1.5, 0, 0)｜world=(${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)})｜父组旋转 ${((parentGroup?.rotation.y ?? 0) * 180 / Math.PI).toFixed(0)}°`;
      }
    }
  },
});

/* ============ 点积演示 ============ */
function buildDot() {
  const s = scene.value;
  if (!s) return;
  const dirA = new THREE.Vector3(1, 0.3, 0).normalize();
  arrowA = new THREE.ArrowHelper(dirA, new THREE.Vector3(0, 0, 0), 2.4, 0xef4444, 0.25, 0.15);
  arrowB = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 2.4, 0x3b82f6, 0.25, 0.15);
  arrowA.name = 'vectorA';
  arrowB.name = 'vectorB';
  s.add(arrowA, arrowB);
}

/* ============ 叉积演示 ============ */
function buildCross() {
  const s = scene.value;
  if (!s) return;
  const a = new THREE.Vector3(2, 0, 0);
  const b = new THREE.Vector3(0, 2, 0);
  const c = new THREE.Vector3().crossVectors(a, b); // (0,0,4)
  arrowA = new THREE.ArrowHelper(a.clone().normalize(), new THREE.Vector3(0, 0, 0), 2.2, 0xef4444, 0.25, 0.15);
  arrowB = new THREE.ArrowHelper(b.clone().normalize(), new THREE.Vector3(0, 0, 0), 2.2, 0x3b82f6, 0.25, 0.15);
  arrowCross = new THREE.ArrowHelper(c.clone().normalize(), new THREE.Vector3(0, 0, 0), 2.2, 0x22c55e, 0.3, 0.2);
  arrowA.name = 'vectorA';
  arrowB.name = 'vectorB';
  arrowCross.name = 'cross';
  s.add(arrowA, arrowB, arrowCross);
}

/* ============ 矩阵复合变换 ============ */
function buildMatrix() {
  const s = scene.value;
  if (!s) return;
  demoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x8b5cf6 })
  );
  s.add(demoMesh);
  const mat = new THREE.Matrix4()
    .makeTranslation(1.8, 1.2, 0)
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 4))
    .multiply(new THREE.Matrix4().makeScale(1.4, 1.4, 1.4));
  demoMesh.applyMatrix4(mat);
  const e = mat.elements;
  statusText.value = `T(1.8,1.2)·Rz(45°)·S(1.4) 复合矩阵：\n[${e[0].toFixed(2)} ${e[4].toFixed(2)} ${e[8].toFixed(2)} ${e[12].toFixed(2)}]`;
}

/* ============ 四元数 slerp ============ */
function buildSlerp() {
  const s = scene.value;
  if (!s) return;
  slerpMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.1, 4),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4 })
  );
  slerpMesh.position.set(0, 0.6, 0);
  slerpMesh.quaternion.identity();
  s.add(slerpMesh);
  slerpFrom = new THREE.Quaternion(); // 绕 Y 轴 0°
  slerpTo = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0.5, 0).normalize(), Math.PI * 1.5); // 绕斜轴 270°
  slerpT = 0;
}

/* ============ 万向锁 ============ */
function buildGimbal() {
  const s = scene.value;
  if (!s) return;
  // 用三个嵌套圆环表示三轴旋转环
  const mat = new THREE.MeshStandardMaterial({ color: 0x64748b, wireframe: false, transparent: true, opacity: 0.35 });
  const ringX = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.03, 8, 48), mat);
  const ringY = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.03, 8, 48), mat);
  const ringZ = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.03, 8, 48), mat);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
  gimbalMesh = new THREE.Group();
  gimbalMesh.add(ringX, ringY, ringZ, box);
  s.add(gimbalMesh);
  gimbalPitch = 0;
  gimbalYaw = 0;
  gimbalQuatMode = false;
  statusText.value = '万向锁演示：当前欧拉角 (pitch=0°, yaw=0°)——点击「升到 90°」观察锁死';
}

/* ============ 局部 vs 世界坐标 ============ */
function buildLocalWorld() {
  const s = scene.value;
  if (!s) return;
  parentGroup = new THREE.Group();
  s.add(parentGroup);
  childMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.45, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b })
  );
  childMesh.position.set(1.5, 0, 0);
  parentGroup.add(childMesh);
  // 父组辅助线
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.5, 0, 0)]);
  parentGroup.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x94a3b8 })));
  const origin = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
  parentGroup.add(origin);
}

/* ============ 清理与切换 ============ */
function clearDemos() {
  const s = scene.value;
  if (!s) return;
  const list = [arrowA, arrowB, arrowCross, demoMesh, gimbalMesh, slerpMesh, parentGroup, childMesh];
  for (const obj of list) {
    if (obj) s.remove(obj);
  }
  arrowA = arrowB = arrowCross = demoMesh = gimbalMesh = slerpMesh = parentGroup = childMesh = null;
}

function applyMode(key: string) {
  clearDemos();
  activeMode.value = key;
  if (key === 'dot') {
    buildDot();
  } else if (key === 'cross') {
    buildCross();
    statusText.value = '叉积 a×b：a=(2,0,0)（红）, b=(0,2,0)（蓝）→ c=(0,0,4)（绿），右手定则判定方向';
  } else if (key === 'matrix') {
    buildMatrix();
  } else if (key === 'slerp') {
    buildSlerp();
  } else if (key === 'gimbal') {
    buildGimbal();
  } else if (key === 'local-world') {
    buildLocalWorld();
  }
}

// 万向锁的两个附加按钮用全局点击处理
const GIMBAL_KEYS = ['gimbal-90', 'gimbal-quat'];
function handleGimbal(key: string) {
  if (key === 'gimbal-90') {
    gimbalPitch = Math.PI / 2; // 升到 90°
    if (gimbalMesh) {
      if (gimbalQuatMode) gimbalMesh.quaternion.setFromEuler(new THREE.Euler(gimbalPitch, gimbalYaw, 0));
      else gimbalMesh.rotation.set(gimbalPitch, gimbalYaw, 0);
    }
    statusText.value = gimbalQuatMode
      ? '四元数模式 pitch=90°：继续旋转 yaw 依然有效（四元数无万向锁）'
      : '欧拉角模式 pitch=90°：现在点击「旋转 yaw」——注意箱子绕世界轴转，yaw 不再独立生效（万向锁！）';
  } else if (key === 'gimbal-quat') {
    gimbalQuatMode = !gimbalQuatMode;
    gimbalYaw = 0;
    if (gimbalMesh) {
      if (gimbalQuatMode) gimbalMesh.quaternion.setFromEuler(new THREE.Euler(gimbalPitch, 0, 0));
      else gimbalMesh.rotation.set(gimbalPitch, 0, 0);
    }
    statusText.value = gimbalQuatMode
      ? '已切换四元数模式：即使 pitch=90°，yaw 旋转依旧正常（旋转由四元数直接表示）'
      : '已切回欧拉角模式：pitch=90° 时 yaw 发生万向锁';
  }
}

/* ============ 代码讲解 ============ */
const CODE = {
  dot: () => `// 点积：反映两向量"方向重合程度"
const a = new THREE.Vector3(1, 0.3, 0).normalize()
const b = new THREE.Vector3(0.8, 0.3, 0.6).normalize()

const dot = a.dot(b)      // 标量
// a·b = |a||b|cosθ  （归一化后 = cosθ）
const angle = Math.acos(dot)  // 反推出夹角

// 用途：光照（法线·光线方向）、
// 判断前后（>0 同向，<0 反向）、
// 投影计算`,
  cross: () => `// 叉积：生成垂直于两向量的第三向量
const a = new THREE.Vector3(2, 0, 0)   // X 轴
const b = new THREE.Vector3(0, 2, 0)   // Y 轴

const c = new THREE.Vector3()
  .crossVectors(a, b)   // c = a × b

// a×b = (0, 0, 4) —— 指向 Z 轴！
// 方向由右手定则决定：a 向 b 握拳，拇指即 c

// 用途：求法线、判定左右/内外、
// 计算旋转轴（slerp 需要）`,
  matrix: () => `// Matrix4：4×4 矩阵，描述三维空间的
// 平移 / 旋转 / 缩放 / 透视 组合变换
const m = new THREE.Matrix4()

// 链式复合（注意：从右往左应用）
m.makeTranslation(1.8, 1.2, 0)          // 平移
  .multiply(new THREE.Matrix4().makeRotationZ(Math.PI/4)) // 旋转45°
  .multiply(new THREE.Matrix4().makeScale(1.4, 1.4, 1.4)) // 缩放1.4

// 顶点变换：v' = M · v
// 顺序是：先缩放 → 再旋转 → 最后平移
mesh.applyMatrix4(m)

// 矩阵为什么是 4×4 不是 3×3？
// —— 平移不是线性变换，需要齐次坐标扩维`,
  slerp: () => `// 四元数：避免万向锁的旋转表示
// q = (x, y, z, w)，w 表示旋转角，xyz 表示旋转轴
const from = new THREE.Quaternion()          // 无旋转
const to = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(1, 0.5, 0).normalize(), Math.PI * 1.5)

// 球面插值：在两个旋转间走"最短路径"
// 与 lerp（线性插值）不同，slerp 在四维球面上插值，
// 保证旋转速度均匀、路径最短
const q = new THREE.Quaternion()
  .slerpQuaternions(from, to, t)   // t: 0→1

mesh.quaternion.copy(q)`,
  gimbal: () => `// ===== 欧拉角（万向锁的根源）=====
// 用三个绕轴角度表示旋转，本质是三次独立旋转
mesh.rotation.set(pitch, yaw, roll)

// 当 pitch = 90° 时：
// 旋转坐标系发生退化——yaw 轴与 roll 轴重合，
// 失去一个自由度，这就是"万向锁"！
// 表现：无法再沿某个方向独立旋转

// ===== 四元数（解决方案）=====
// 一次旋转直接由"旋转轴 + 角度"表示，
// 不依赖坐标系分解，因此没有万向锁
const q = new THREE.Quaternion()
  .setFromAxisAngle(axis, angle)
mesh.quaternion.copy(q)

// three.js 内部（骨骼、动画、slerp）都用四元数`,
  'local-world': () => `// 局部坐标 vs 世界坐标
const parent = new THREE.Group()
scene.add(parent)

const child = new THREE.Mesh(...)
child.position.set(1.5, 0, 0)   // 局部坐标（相对父组）
parent.add(child)

// 获取世界坐标（考虑父组所有变换）
const wp = new THREE.Vector3()
child.getWorldPosition(wp)      // world = 父矩阵 × 局部

// 矩阵链：worldMatrix = parent.worldMatrix × localMatrix
// 局部坐标在层级变换（骨骼/场景图）中无处不在`,
};

const EXPLAIN = {
  dot: () => `点积（内积）：a·b = |a||b|cosθ，结果是标量。

几何意义：
- 两向量方向越一致，点积越大（cos0°=1）
- 垂直时点积为 0（cos90°=0）——**判断垂直**的利器
- 反向时点积为负

three.js 中的经典应用：
1. 光照计算：漫反射 = max(dot(N, L), 0)，N 是法线，L 是光线方向
2. 判断目标前后：相机 forward 与目标方向的点积符号
3. 投影：a 在 b 上的投影长度 = a·b / |b|

本页红向量固定，蓝向量绕 Y 轴旋转，夹角从 0° 到 180° 往复，观察点积随 cosθ 变化。`,
  cross: () => `叉积（外积）：a×b 得到一个新向量，垂直于 a 和 b，模长 = |a||b|sinθ。

方向用右手定则：右手四指从 a 弯向 b，拇指指向就是 a×b。

three.js 中的经典应用：
1. 求平面法线：三角形两条边叉积 = 法线
2. 判断左右：物体在视线左侧还是右侧
3. 求旋转轴：从方向 A 转到方向 B 的轴 = A×B（配合四元数）

本页：a=(2,0,0) 红箭头，b=(0,2,0) 蓝箭头，c=a×b=(0,0,4) 绿箭头——直观看到"垂直 + 右手定则"。`,
  matrix: () => `矩阵是 3D 图形学的核心：任何变换都是矩阵乘法。

为什么 4×4？
- 平移不是线性变换（v + t），无法用 3×3 矩阵表示
- 用齐次坐标 (x, y, z, 1) 扩维后，平移变成矩阵乘法
- 所以所有变换统一为矩阵乘法，可以任意复合

复合顺序（重要！）：
M = T · R · S，顶点变换 v' = M·v = T·(R·(S·v))
**先缩放 → 再旋转 → 最后平移**（矩阵右乘先作用）

GPU 中每个顶点都要乘投影×视图×模型矩阵，矩阵乘法是 3D 渲染最频繁的运算。`,
  slerp: () => `四元数是三维旋转的"最佳表示"：
- 4 个分量 (x,y,z,w)，无冗余
- 避免万向锁
- 插值平滑（slerp 走球面最短路径）

对比：
- 欧拉角：直观但会锁死、插值不自然
- 矩阵：通用但冗余（9 个旋转相关元素）、插值难
- 四元数：紧凑、可插值、可拼接——动画和骨骼的标准

slerp（球面线性插值）数学本质：
q = (q0·sin((1-t)θ) + q1·sin(tθ)) / sinθ
即在四维单位球面上沿大圆弧插值。

three.js 中四元数无处不在：骨骼动画、相机旋转、OrbitControls、物理引擎同步。`,
  gimbal: () => `万向锁（Gimbal Lock）是欧拉角表示旋转的固有缺陷：

当中间轴（pitch）旋转到 ±90° 时，yaw 与 roll 的旋转平面重合，三轴退化为两轴，丢失一个自由度。现实中航天器姿态控制就曾因此出过事故。

为什么四元数能解决？
欧拉角 = 三次"绕坐标轴"旋转的叠加（依赖坐标系）
四元数 = 一次"绕任意轴旋转 θ"（不依赖坐标系分解）

观察方法：先把 pitch 升到 90°，再点 yaw 旋转——欧拉角模式下 yaw 不再改变箱子的朝向（锁死）；切到四元数模式后 yaw 正常。`,
  'local-world': () => `局部坐标（Local）与 世界坐标（World）是理解 3D 层级的关键：

- 局部坐标：相对父物体的坐标（child.position 就是父空间坐标）
- 世界坐标：相对场景原点（getWorldPosition 经过所有祖先矩阵变换）

变换链：worldMatrix = parent.worldMatrix × localMatrix
每个 Object3D 的 matrixWorld 在每帧 updateMatrixWorld 时从父级级联计算。

这正是"场景图"（Scene Graph）的数学基础——本教程"场景图"章节的太阳系，就是嵌套 Group + 局部坐标。骨骼动画同样依赖局部坐标层级。`,
};

const { code, explanation } = useCodeExplain(CODE, EXPLAIN, activeMode);

// 处理包含附加动作的点击
function onButtonClick(key: string) {
  if (GIMBAL_KEYS.includes(key)) {
    handleGimbal(key);
  } else {
    applyMode(key);
  }
}

onMounted(() => {
  applyMode('dot');
});
</script>
