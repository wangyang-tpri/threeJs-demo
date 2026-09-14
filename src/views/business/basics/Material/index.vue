<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 当前演示的材质（切换类型时释放旧的）
let currentMaterial: THREE.Material | null = null;

const activeMaterial = ref('standard');

const { scene } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 50, near: 0.1, far: 100, position: [3.6, 2.4, 5.2], lookAt: [0.8, 0.9, 0] },
  controls: { target: [0.8, 0.9, 0] },
  grid: { size: 6, divisions: 12 },
  axes: 2,
  lights: { ambient: 0.6, directional: 1.2, dirPosition: [5, 8, 6] },
  shadow: { enabled: true, mapSize: 1024, cameraBounds: 8 },
  onDispose: () => {
    currentMaterial?.dispose();
    currentMaterial = null;
  },
});

/* ================= 场景内容 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  // 环面结：细节丰富，最能体现材质差异（高光、反射、PBR）
  const knot: THREE.Mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.75, 0.24, 120, 20),
    new THREE.MeshStandardMaterial({ color: 0x4a9eff, roughness: 0.35, metalness: 0.1 })
  );
  knot.name = '环面结';
  knot.position.set(0, 1.15, 0);
  knot.castShadow = true;
  s.add(knot);

  // 球体：对比不同形状上的材质表现
  const sphere: THREE.Mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x4a9eff, roughness: 0.35, metalness: 0.1 })
  );
  sphere.name = '球体';
  sphere.position.set(2.1, 0.85, 0.2);
  sphere.castShadow = true;
  s.add(sphere);

  // 地面：承接阴影（与网格线重叠，微抬避免 z-fighting）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.001;
  ground.receiveShadow = true;
  s.add(ground);

  currentMaterial = (knot.material as THREE.MeshStandardMaterial).clone();
  sphere.material = currentMaterial;
  knot.material = currentMaterial;
});

/* ================= 切换材质类型 ================= */
const MATERIALS: Record<string, { label: string; make: () => THREE.Material }> = {
  basic: {
    label: '基础材质',
    make: () => new THREE.MeshBasicMaterial({ color: 0x4a9eff }),
  },
  lambert: {
    label: '兰伯特',
    make: () => new THREE.MeshLambertMaterial({ color: 0x4a9eff }),
  },
  phong: {
    label: '冯氏',
    make: () =>
      new THREE.MeshPhongMaterial({
        color: 0x4a9eff,
        specular: 0xffffff,
        shininess: 80,
      }),
  },
  standard: {
    label: '标准PBR',
    make: () =>
      new THREE.MeshStandardMaterial({
        color: 0x4a9eff,
        roughness: 0.35,
        metalness: 0.1,
      }),
  },
  physical: {
    label: '物理材质',
    make: () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x4a9eff,
        roughness: 0.3,
        metalness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
        sheen: 0.5,
      }),
  },
};

function applyMaterial(key: string) {
  activeMaterial.value = key;
  const s = scene.value;
  if (!s) return;
  // 释放旧材质，替换为新材料
  currentMaterial?.dispose();
  currentMaterial = MATERIALS[key]!.make();
  s.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name) obj.material = currentMaterial as THREE.Material;
  });
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  basic: () => `// ① 基础材质 Basic：不受光照影响
const material = new THREE.MeshBasicMaterial({
  color: 0x4a9eff,   // 纯色直出
})
// 特点：没有光照反应，像"自发光"色块
// 用途：UI 元素、调试线框、小地图、天空盒`,
  lambert: () => `// ② 兰伯特材质 Lambert：漫反射受光
const material = new THREE.MeshLambertMaterial({
  color: 0x4a9eff,
})
// 特点：只计算漫反射（diffuse），无镜面高光
// 性能：逐顶点光照，开销小，适合低配场景
// 局限：表面没有高光点，塑料/金属感弱`,
  phong: () => `// ③ 冯氏材质 Phong：漫反射 + 镜面高光
const material = new THREE.MeshPhongMaterial({
  color: 0x4a9eff,
  specular: 0xffffff, // 高光颜色
  shininess: 80,      // 高光锐度（越大越集中）
})
// 特点：有亮斑高光，可表现玻璃/塑料反光`,
  standard: () => `// ④ 标准PBR材质 Standard：物理渲染基准
const material = new THREE.MeshStandardMaterial({
  color: 0x4a9eff,
  roughness: 0.35,  // 粗糙度 0光滑 ~ 1粗糙
  metalness: 0.1,   // 金属度 0非金属 ~ 1金属
})
// 特点：基于物理光照模型，真实感强
// 用法：roughness/metalness 两个参数即可调出
//       绝大部分真实材质效果`,
  physical: () => `// ⑤ 物理材质 Physical：标准材质的高级扩展
const material = new THREE.MeshPhysicalMaterial({
  color: 0x4a9eff,
  roughness: 0.3,
  metalness: 0.2,
  clearcoat: 1,           // 清漆层强度（车漆/手机后盖）
  clearcoatRoughness: 0.15, // 清漆层粗糙度
  sheen: 0.5,             // 织物绒毛感（天鹅绒）
})
// 特点：多一层透明清漆，可表现车漆、陶瓷`,
};

const explainMap: Record<string, () => string> = {
  basic: () =>
    `【原理】不参与任何光照计算，直接把 color / map 的颜色画到屏幕上，物体像"自发光"。\n【对比】在相同光照下，Basic 材质最亮但最"假"；其余材质由光照决定明暗。\n【用途】调试辅助、UI 元素、天空盒、线框；性能开销最低。`,
  lambert: () =>
    `【原理】基于兰伯特余弦定律：表面亮度 = 光源强度 × cos(入射角)。只计算漫反射，无镜面高光。\n【性能】逐顶点光照，比 Phong 快，是移动端低配首选。\n【局限】表面看起来"哑光"，没有高光点。`,
  phong: () =>
    `【原理】在漫反射基础上增加镜面高光项：\n亮度 = 漫反射 + 镜面反射 × pow(cos(反射角), shininess)\n【参数】specular 高光颜色；shininess 高光锐度（越大光斑越小越亮）。\n【特点】经典材质，适合塑料、陶瓷、釉面。`,
  standard: () =>
    `【原理】基于 PBR（物理渲染）：粗糙度 roughness 控制微表面散射，金属度 metalness 控制反射特性。金属度高的表面反射环境色，非金属反射漫反射色。\n【参数】roughness 0（镜面）~1（哑光）；metalness 0（非金属）~1（金属）。\n【要点】three.js 默认推荐材质，大部分真实物体都能用它调出。`,
  physical: () =>
    `【原理】在 Standard 基础上扩展了透明层（clearcoat）与织物绒毛（sheen）等物理属性。\n【参数】clearcoat 清漆强度，clearcoatRoughness 清漆粗糙度；sheen 绒毛强度。\n【用途】汽车漆、手机后盖、瓷器、天鹅绒等需要"多层表面"的材质。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeMaterial);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(mat, key) in MATERIALS"
        :key="key"
        size="small"
        :type="activeMaterial === key ? 'primary' : 'default'"
        @click="applyMaterial(key)"
        >{{ mat.label }}</n-button
      >
    </div>

    <!-- 主体：左 3D 场景 / 右 代码+讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div
        ref="containerRef"
        class="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      ></div>

      <CodePanel :title="activeMaterial" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
