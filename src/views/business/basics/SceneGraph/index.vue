<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 场景内状态提示
const statusText = ref('场景树：太阳系组 → 太阳 / 地月系 → 地球 / 月球轨道 → 月球');
const activeFeature = ref('tree');

// 场景图节点引用
let solarGroup: THREE.Group | null = null;
let earthOrbit: THREE.Group | null = null;
let moonOrbit: THREE.Group | null = null;
let sun: THREE.Mesh | null = null;
let earth: THREE.Mesh | null = null;
let moon: THREE.Mesh | null = null;

const { scene } = useThreeScene(containerRef, {
  background: 0x101830,
  camera: { fov: 50, near: 0.1, far: 100, position: [6, 4, 7], lookAt: [0, 0.6, 0] },
  controls: { target: [0, 0.6, 0] },
  grid: false,
  axes: 2,
  lights: { ambient: 0.5, directional: 1.1, dirPosition: [5, 8, 6] },
  animate: (delta) => {
    if (!sun || !earthOrbit || !moonOrbit) return;
    // 默认演示层级传播：太阳自转 → 地月系公转 → 月球绕地球转
    sun.rotation.y += delta * 0.6;
    earthOrbit.rotation.y += delta * 0.9;
    moonOrbit.rotation.y += delta * 2.4;
  },
});

/* ================= 场景内容：太阳系三层场景图 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  // 场景图根节点：太阳系
  solarGroup = new THREE.Group();
  solarGroup.name = '太阳系';
  s.add(solarGroup);

  // 第一层：太阳（自转）
  sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffc93c, emissive: 0xb8860b, emissiveIntensity: 0.5 })
  );
  sun.name = '太阳';
  solarGroup.add(sun);

  // 第二层：地月系 Group（绕太阳公转）
  earthOrbit = new THREE.Group();
  earthOrbit.name = '地月系';
  solarGroup.add(earthOrbit);

  // 地球：在地月系组内偏移，随组公转
  earth = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 })
  );
  earth.name = '地球';
  earth.position.set(2.6, 0, 0);
  earthOrbit.add(earth);

  // 第三层：月球轨道 Group（绕地球公转）
  moonOrbit = new THREE.Group();
  moonOrbit.name = '月球轨道';
  earth.position.z = 0.6; // 地球偏转，让轨道平面可见
  earthOrbit.add(moonOrbit);

  moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 })
  );
  moon.name = '月球';
  moon.position.set(0.9, 0, 0);
  moonOrbit.add(moon);

  // 轨道线：地月系公转轨道
  const orbitLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 65 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6);
      })
    ),
    new THREE.LineBasicMaterial({ color: 0x4a5568, transparent: true, opacity: 0.5 })
  );
  solarGroup.add(orbitLine);

  applyFeature('tree');
});

/* ================= 功能切换 ================= */
const FEATURES: Record<string, { label: string; run: () => void }> = {
  tree: {
    label: '层级结构',
    run: () => {
      statusText.value = '场景树：太阳系 → 太阳 / 地月系 → 地球 / 月球轨道 → 月球（三层嵌套）';
    },
  },
  rotate: {
    label: '旋转地月系',
    run: () => {
      if (!earthOrbit) return;
      earthOrbit.rotation.y += Math.PI / 6; // 单步转 30°
      statusText.value = `地月系旋转 += 30°（π/6），月球随父级一起转（变换继承）`;
    },
  },
  move: {
    label: '整体移动',
    run: () => {
      if (!solarGroup) return;
      solarGroup.position.x = solarGroup.position.x === 0 ? 1.6 : 0;
      statusText.value = solarGroup.position.x === 1.6 ? '太阳系整体平移 x += 1.6，所有子节点跟随' : '太阳系归位（子节点跟随）';
    },
  },
  hide: {
    label: '隐藏月球',
    run: () => {
      if (!moon) return;
      moon.visible = !moon.visible;
      statusText.value = moon.visible ? '月球 visible = true（显示）' : '月球 visible = false（隐藏，仍参与场景树）';
    },
  },
  find: {
    label: '按名查找',
    run: () => {
      if (!solarGroup || !earth) return;
      // getObjectByName 深度优先查找
      const found = solarGroup.getObjectByName('地球') as THREE.Mesh | null;
      if (found) {
        (earth.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
        (earth.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x3b82f6);
        statusText.value = `getObjectByName('地球') 命中 → 高亮显示（不再需要手动持有引用）`;
        const target = earth; // 闭包内捕获局部引用，避免类型收窄失效
        setTimeout(() => {
          if (target) (target.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
        }, 2000);
      } else {
        statusText.value = '未找到（场景树中无此名字的节点）';
      }
    },
  },
  count: {
    label: '遍历统计',
    run: () => {
      if (!solarGroup) return;
      let meshCount = 0;
      let groupCount = 0;
      solarGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshCount++;
        if (obj instanceof THREE.Group) groupCount++;
      });
      statusText.value = `traverse 统计：Group × ${groupCount}，Mesh × ${meshCount}（含隐藏的月球）`;
    },
  },
};

function applyFeature(key: string) {
  activeFeature.value = key;
  FEATURES[key]!.run();
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  tree: () => `// ① 场景图：Object3D 树形层级
const solarGroup = new THREE.Group()  // 根
scene.add(solarGroup)

const sun = new THREE.Mesh(...)
solarGroup.add(sun)          // 第 1 层

const earthOrbit = new THREE.Group()
solarGroup.add(earthOrbit)   // 第 2 层
earthOrbit.add(earth)

const moonOrbit = new THREE.Group()
earthOrbit.add(moonOrbit)    // 第 3 层
moonOrbit.add(moon)
// 子节点继承父节点全部变换`,
  rotate: () => `// ② 变换继承：转父级，子级跟随
earthOrbit.rotation.y += Math.PI / 6
// 月球虽未直接操作，
// 但随 earthOrbit 一起转动
// —— 父级矩阵叠加到子级
// 层级越深，矩阵嵌套越多`,
  move: () => `// ③ 整体移动：移动根节点
solarGroup.position.x += 1.6
// 太阳/地球/月球全部跟随
// 应用：整个模型组整体平移、
//       场景切换淡出、整体复位`,
  hide: () => `// ④ 隐藏/显示：visible 属性
moon.visible = false   // 隐藏（不渲染）
moon.visible = true    // 恢复
// 注意：visible 只影响自身
// 和后代，不影响父级
// 隐藏的物体仍在场景树中
// 仍可被 getObjectByName 找到`,
  find: () => `// ⑤ 按名查找：getObjectByName
const earth = solarGroup.getObjectByName('地球')
// 深度优先遍历整棵子树，
// 返回第一个匹配 name 的节点
// 前置：创建时设置 obj.name = '地球'
// 场景复杂时无需手动持有引用`,
  count: () => `// ⑥ 遍历整棵树：traverse
solarGroup.traverse((obj) => {
  if (obj instanceof THREE.Mesh) meshCount++
  if (obj instanceof THREE.Group) groupCount++
})
// 深度优先遍历所有后代节点
// 常用场景：
//  - 批量设置 castShadow / visible
//  - 统计模型资源数量
//  - 递归查找/修改材质`,
};

const explainMap: Record<string, () => string> = {
  tree: () =>
    `【原理】three.js 所有可渲染对象都继承 Object3D，构成一棵"场景图"树：scene 是根，Group/Mesh/Light 都是节点。\n【特性】子节点继承父节点的位置/旋转/缩放矩阵（局部坐标叠加到世界坐标）。\n【本页】太阳系三层嵌套：太阳系 → 地月系 → 月球轨道，是理解场景图的标准模型。`,
  rotate: () =>
    `【原理】每帧执行 sun.rotation / earthOrbit.rotation / moonOrbit.rotation 累加——太阳自转、地月系公转、月球绕地球转，全部由"父级矩阵传播"实现，无需手动计算月球的世界坐标。\n【优势】层级嵌套让复杂运动分解为简单旋转的叠加。`,
  move: () =>
    `【原理】移动根节点 = 整棵子树一起移动，因为子级世界坐标 = 父级矩阵 × 子级局部坐标。\n【应用】模型整体定位、多楼层整体位移、场景重置。`,
  hide: () =>
    `【原理】visible=false 时渲染器跳过该节点及其后代（不绘制、不参与拾取），但对象仍保留在场景树中，属性不变。\n【对比】remove() 是从场景树中彻底移除节点；visible 只是"关灯"。\n【应用】楼层切换、物体显隐控制。`,
  find: () =>
    `【原理】getObjectByName 在调用节点的整棵子树中做深度优先搜索，按 name 匹配返回第一个命中。\n【实践】模型加载后（GLTF）常用 getObjectByName 定位"门/窗户/阀门"等部件进行交互——与射线拾取配合做部件点选。`,
  count: () =>
    `【原理】traverse(cb) 深度优先遍历所有后代（含自身），回调中按类型（Mesh/Group/Light...）分类统计或批量操作。\n【实践】批量设置阴影（traverse 内 castShadow=true）、统一换材质、统计 draw call 前的网格数量。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeFeature);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(item, key) in FEATURES"
        :key="key"
        size="small"
        :type="activeFeature === key ? 'primary' : 'default'"
        @click="applyFeature(key)"
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

      <CodePanel :title="activeFeature" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
