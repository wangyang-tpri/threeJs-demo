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
      <CodePanel title="物理引擎 · cannon-es" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);
const statusText = ref('加载中…');
const activeMode = ref('fall');

// cannon 世界与同步对象
let world: CANNON.World | null = null;
const bodyList: { mesh: THREE.Object3D; body: CANNON.Body }[] = [];
let demoGroup: THREE.Group | null = null;
// 线缆/辅助更新器（每帧调用）
const lineUpdaters: (() => void)[] = [];

const buttons = [
  { key: 'fall', label: '自由落体' },
  { key: 'stack', label: '方块堆叠' },
  { key: 'pendulum', label: '约束摆' },
  { key: 'reset', label: '重置' },
];

const { scene, camera } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 55, position: [4, 3.5, 7], lookAt: [0, 1.5, 0] },
  controls: { target: [0, 1.5, 0] },
  grid: { size: 10, divisions: 20 },
  axes: 2,
  lights: { ambient: 0.7, directional: 1.3, dirPosition: [5, 10, 7] },
  animate: (delta) => {
    // 物理世界步进（固定时间步长 + 最多 3 次子步，保证稳定）
    world?.step(1 / 60, Math.min(delta, 0.05), 3);
    // 将 cannon 刚体变换同步到 three 物体
    for (const { mesh, body } of bodyList) {
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }
    for (const u of lineUpdaters) u();
  },
  onDispose: () => {
    bodyList.length = 0;
  },
});

/* ============ 物理世界（创建一次，场景反复清空） ============ */
function initWorld() {
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true; // 物体静止后进入睡眠，大幅节省计算
  (world.solver as CANNON.GSSolver).iterations = 10;

  // 地面：cannon Plane（无限平面），绕 X 轴 -90° 让法线朝上
  const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);
}

/* ============ 场景与刚体 ============ */
function clearDemo() {
  const s = scene.value;
  if (!s) return;
  if (demoGroup) {
    s.remove(demoGroup);
    demoGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
  }
  // 移除所有动态刚体与约束（保留静态地面）
  if (world) {
    for (const c of [...world.constraints]) world.removeConstraint(c);
    for (const b of [...world.bodies]) {
      if (b.mass !== 0) world.removeBody(b);
    }
  }
  bodyList.length = 0;
  lineUpdaters.length = 0;
  demoGroup = new THREE.Group();
  s.add(demoGroup);
}

function addSphere(x: number, y: number, z: number, r: number, color: number) {
  if (!world || !demoGroup) return;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 })
  );
  demoGroup.add(mesh);
  const body = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(r),
    position: new CANNON.Vec3(x, y, z),
  });
  world.addBody(body);
  bodyList.push({ mesh, body });
}

function addBox(x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
  if (!world || !demoGroup) return;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
  );
  demoGroup.add(mesh);
  const body = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
    position: new CANNON.Vec3(x, y, z),
  });
  world.addBody(body);
  bodyList.push({ mesh, body });
}

/* ============ 三个演示 ============ */
function buildFall() {
  const colors = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0x06b6d4];
  for (let i = 0; i < 12; i++) {
    const r = 0.25 + Math.random() * 0.35;
    addSphere((Math.random() - 0.5) * 5, 3 + Math.random() * 6, (Math.random() - 0.5) * 5, r, colors[i % colors.length]!);
  }
}

function buildStack() {
  // 5 层金字塔塔
  for (let layer = 0; layer < 5; layer++) {
    const y = 0.5 + layer * 1.02;
    const count = 4 - layer;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 1.05;
      addBox(x, y + 0.5, 0, 1, 1, 1, 0x3b82f6);
    }
  }
}

function buildPendulum() {
  if (!world || !demoGroup) return;
  // 锚点（固定，质量 0）
  const anchor = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(0.15), position: new CANNON.Vec3(0, 4.6, 0) });
  world.addBody(anchor);
  // 摆球 1 / 摆球 2
  const b1 = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.35), position: new CANNON.Vec3(0, 3.2, 0) });
  world.addBody(b1);
  const b2 = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3), position: new CANNON.Vec3(1.4, 2.6, 0) });
  world.addBody(b2);

  // 约束：锚点-球1 用 ConeTwist（关节），球1-球2 用 PointToPoint（球铰）
  world.addConstraint(new CANNON.ConeTwistConstraint(anchor, b1, { pivotA: new CANNON.Vec3(0, -0.2, 0), pivotB: new CANNON.Vec3(0, 0.1, 0) }));
  world.addConstraint(new CANNON.PointToPointConstraint(b1, new CANNON.Vec3(0, 0, 0), b2, new CANNON.Vec3(0, 0, 0)));

  // three 可视化
  const mAnchor = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshStandardMaterial({ color: 0x64748b }));
  mAnchor.position.set(0, 4.6, 0);
  demoGroup.add(mAnchor);
  const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
  const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
  demoGroup.add(m1, m2);
  bodyList.push({ mesh: m1, body: b1 }, { mesh: m2, body: b2 });

  // 连接线：锚点 → 球1（每帧更新顶点）
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 4.6, 0), new THREE.Vector3(0, 4.6, 0)]),
    new THREE.LineBasicMaterial({ color: 0x94a3b8 })
  );
  demoGroup.add(line);
  const lineMesh = line;
  lineUpdaters.push(() => {
    const p = lineMesh.geometry.attributes.position as THREE.BufferAttribute;
    p.setXYZ(0, 0, 4.6, 0);
    p.setXYZ(1, b1.position.x, b1.position.y, b1.position.z);
    p.needsUpdate = true;
  });
}

/* ============ 模式切换 ============ */
function applyMode(key: string) {
  activeMode.value = key;
  clearDemo();
  if (key === 'fall') {
    buildFall();
    statusText.value = '自由落体：12 个球从高空下落，与地面碰撞后弹跳、滚动、静止（allowSleep 生效）';
  } else if (key === 'stack') {
    buildStack();
    statusText.value = '方块堆叠：金字塔塔自然塌落，验证接触稳定性与求解器迭代';
  } else if (key === 'pendulum') {
    buildPendulum();
    statusText.value = '约束摆：锚点 + ConeTwistConstraint + PointToPointConstraint 串联双摆';
  } else if (key === 'reset') {
    statusText.value = '已重置：清空全部刚体，场景恢复初始状态';
  }
}

/* ============ 代码讲解 ============ */
const CODE = {
  world: () => `// ===== 1. 创建物理世界 =====
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0),
})
world.broadphase = new CANNON.SAPBroadphase(world) // 宽相碰撞检测
world.allowSleep = true   // 静止物体进入睡眠，节省 CPU
world.solver.iterations = 10  // 求解器迭代次数（越高越稳）

// ===== 2. 刚体 =====
// mass=0 为静态（不受力）；mass>0 为动态
const body = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Sphere(0.5),      // 碰撞形状（三棱锥简化）
  position: new CANNON.Vec3(0, 5, 0),
})
world.addBody(body)

// ===== 3. 步进 + 同步 =====
// 固定步长推进物理世界
world.step(1 / 60, delta, 3)
// 把刚体变换回填到 three 物体（渲染只认 three）
mesh.position.copy(body.position)
mesh.quaternion.copy(body.quaternion)`,
  fall: () => `// 自由落体：重力 + 碰撞弹跳
// 1. 动态刚体（mass=1）受重力作用
const body = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Sphere(0.5),
  position: new CANNON.Vec3(0, 5, 0),
})
world.addBody(body)

// 2. 静态地面（mass=0）不参与运动
const ground = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Plane(),
})
ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(ground)

// 3. 每帧固定步长推进 + 回填 three 渲染
world.step(1 / 60, delta, 3)
mesh.position.copy(body.position)
mesh.quaternion.copy(body.quaternion)

// 球落地 → 碰撞检测 → 冲量求解 → 弹跳，
// 能量逐渐损失后静止并进入睡眠（allowSleep）`,
  stack: () => `// 方块碰撞体：Box 用半尺寸
const body = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
})

// 堆叠稳定性三要素：
// 1. solver.iterations（迭代次数，10+）
// 2. 固定时间步长 world.step(1/60, ...)
//    —— 不能用真实帧间隔直接步进，否则高速碰撞穿透
// 3. allowSleep：静止堆叠自动休眠，避免每帧重复求解

// 宽相（Broadphase）：SAPBroadphase 按物体在
// 排序轴上的区间做粗筛，只对可能碰撞的对做细检测`,
  pendulum: () => `// 约束（Constraint）：限制两个刚体之间的相对运动
// 1. ConeTwistConstraint（圆锥扭摆约束）：
//    允许绕轴向旋转 + 锥形摆动，模拟"关节"
world.addConstraint(new CANNON.ConeTwistConstraint(
  anchor, ball1,
  { pivotA: new CANNON.Vec3(0,-0.2,0), pivotB: new CANNON.Vec3(0,0.1,0) }
))

// 2. PointToPointConstraint（点对点约束/球铰）：
//    两物体指定点必须重合，可自由旋转
world.addConstraint(new CANNON.PointToPointConstraint(
  ball1, new CANNON.Vec3(0,0,0),
  ball2, new CANNON.Vec3(0,0,0)
))

// 约束是物理引擎"关节"的基础：
// 铰链=旋转约束、弹簧=距离约束+力、车辆=多约束组合`,
  reset: () => `// 重置：清空动态刚体，保留静态地面
for (const c of [...world.constraints]) world.removeConstraint(c)
for (const b of [...world.bodies]) {
  if (b.mass !== 0) world.removeBody(b)
}

// 同时清理 three 侧的物体与 GPU 资源
group.traverse((obj) => {
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose()
    obj.material.dispose()
  }
})

// 物理世界三件套：body（刚体）→ constraint（约束）→ solver（求解）
// 重置 = 清 body + 清 constraint + 重新填充场景`,
};

const EXPLAIN = {
  world: () => `物理引擎 = 数值模拟刚体运动。cannon-es 是 three.js 社区最常用的轻量物理库（WebAssembly 的 ammo.js/rapier 用于重型场景）。

工作流程四步：
1. World：包含重力、碰撞检测、求解器
2. Body：刚体 = 碰撞形状（Sphere/Box/Plane）+ 质量（0=静态）
3. step()：以固定时间步长推进物理仿真（不是每帧一大步）
4. 同步：物理在 cannon 坐标系算，渲染在 three 坐标系画——每帧把 body 的 position/quaternion 复制给 mesh

关键点：world.step(1/60, delta, 3) 中 3 是最大子步数，物理落后太多时会拆成多个 1/60 秒的小步，防止高速物体穿透薄墙。`,
  fall: () => `自由落体是物理引擎最基础的演示，覆盖三大概念：

1. 重力：World 的 gravity 向量施加到所有动态刚体（mass>0）
2. 碰撞检测：宽相（SAP 粗筛）→ 窄相（形状求交）→ 接触点
3. 冲量求解：碰撞瞬间按恢复系数（restitution）计算反弹速度

关键点：cannon 只计算"数值"，three 只负责"画"。
每帧把 body 的 position/quaternion 复制给 mesh，
两者坐标系完全一致（本页没有缩放单位换算）。`,
  stack: () => `堆叠是物理引擎的"压力测试"：几十个物体互相挤压，需要求解器反复迭代才能稳定不抖动。

- mass=0 的物体是静态（地面），动态物体堆在上面
- 接触求解器每次迭代都试图消除穿透，迭代次数越多越稳定（也越慢）
- allowSleep：速度低于阈值一段时间后自动休眠，醒着时再激活——大规模场景性能关键

本页金字塔塔生成后立即受重力下落、互相碰撞、塌落堆叠，最终进入睡眠状态，观察物体之间没有穿透。`,
  pendulum: () => `约束是物理引擎连接物体的机制，用"方程"表达：

ConeTwistConstraint：像肩膀关节——一个物体相对另一个物体，绕轴可转、可锥形摆动，但长度固定。
PointToPointConstraint：像绳子两端——两点的世界位置必须重合，方向自由。

约束在求解器里表现为"位置约束 + 速度约束"方程，与碰撞求解同一套迭代机制。

（提示：真实世界的"双摆"就是混沌系统，本页双摆初始条件微小时就会产生完全不同的运动轨迹。）`,
  reset: () => `重置演示"物理世界的生命周期管理"：

- 刚体（Body）和约束（Constraint）属于 cannon World，
  切换场景时必须显式移除，否则残留刚体会继续参与仿真
- three 侧的 Mesh 与几何体材质需要 dispose() 释放 GPU 内存
- 静态地面（mass=0）保留复用——它不运动，无需重建

生产项目中通常封装 resetWorld() 统一管理：
清刚体 → 清约束 → 重建场景 → 重新 addBody。`,
};

const { code, explanation } = useCodeExplain(CODE, EXPLAIN, activeMode);

onMounted(() => {
  initWorld();
  applyMode('fall');
});
</script>
