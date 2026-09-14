<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

// 自管灯光（hook 不添加默认光，便于切换演示）
const activeLight = ref('directional');

const { scene } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 50, near: 0.1, far: 100, position: [4, 3, 5], lookAt: [0, 0.8, 0] },
  controls: { target: [0, 0.8, 0] },
  grid: { size: 6, divisions: 12 },
  axes: 2,
  lights: false, // 灯光由本页自管
  shadow: { enabled: true, mapSize: 1024, cameraBounds: 8 },
  onDispose: () => {
    lights.forEach((l) => {
      if (l instanceof THREE.Light) l.dispose();
    });
    lights.length = 0;
  },
});

// 存放当前光源与其辅助对象，切换时统一清理
const lights: (THREE.Light | THREE.Object3D)[] = [];

/* ================= 场景内容 ================= */
onMounted(() => {
  const s = scene.value;
  if (!s) return;

  // 地面（接收阴影）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.001;
  ground.receiveShadow = true;
  s.add(ground);

  // 演示物体：立方体 / 球体 / 圆柱（全部投射阴影）
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x4a9eff, roughness: 0.35 })
  );
  cube.name = '立方体';
  cube.position.set(-1.6, 0.45, 0);
  cube.castShadow = true;
  s.add(cube);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  sphere.name = '球体';
  sphere.position.set(0, 0.55, 0);
  sphere.castShadow = true;
  s.add(sphere);

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.1, 32),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 })
  );
  cylinder.name = '圆柱';
  cylinder.position.set(1.6, 0.55, 0);
  cylinder.castShadow = true;
  s.add(cylinder);

  // 默认：平行光
  applyLight('directional');
});

/* ================= 光源切换 ================= */
function clearLights() {
  const s = scene.value;
  if (!s) return;
  lights.forEach((l) => s.remove(l));
  lights.length = 0;
}

const LIGHTS: Record<string, { label: string; make: () => THREE.Light }> = {
  ambient: {
    label: '环境光',
    make: () => new THREE.AmbientLight(0xffffff, 0.5),
  },
  directional: {
    label: '平行光',
    make: () => {
      const light = new THREE.DirectionalLight(0xffffff, 1.6);
      light.position.set(3, 6, 4);
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      return light;
    },
  },
  point: {
    label: '点光源',
    make: () => {
      const light = new THREE.PointLight(0xfff5d1, 1.6, 14, 1.2);
      light.position.set(2, 3, 2.5);
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      return light;
    },
  },
  spot: {
    label: '聚光灯',
    make: () => {
      const light = new THREE.SpotLight(0xffffff, 2, 18, 0.5, 0.45, 1.2);
      light.position.set(1.5, 5, 3);
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      return light;
    },
  },
};

function applyLight(key: string) {
  activeLight.value = key;
  const s = scene.value;
  if (!s) return;
  clearLights();

  const light = LIGHTS[key]!.make();
  s.add(light);
  lights.push(light);

  // 点光源 / 聚光灯：添加位置标记小球 + 辅助器，直观看到光源位置
  if (light instanceof THREE.PointLight) {
    const mark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd700 })
    );
    mark.position.copy(light.position);
    s.add(mark);
    lights.push(mark);
  } else if (light instanceof THREE.SpotLight) {
    // 聚光灯目标指向原点
    light.target.position.set(0, 0, 0);
    s.add(light.target);
    lights.push(light.target);
    const helper = new THREE.SpotLightHelper(light, 0xffd700);
    s.add(helper);
    lights.push(helper);
  } else if (light instanceof THREE.DirectionalLight) {
    const helper = new THREE.DirectionalLightHelper(light, 0.5, 0xffd700);
    s.add(helper);
    lights.push(helper);
  }
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<string, () => string> = {
  ambient: () => `// ① 环境光 AmbientLight：全局均匀照亮
const light = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(light)
// 特点：无位置、无方向，所有面同亮度
// 作用：模拟天光/间接光，提亮暗部
// 注意：无法产生阴影（没有方向）`,
  directional: () => `// ② 平行光 DirectionalLight：模拟太阳
const light = new THREE.DirectionalLight(0xffffff, 1.6)
light.position.set(3, 6, 4) // 只关心方向
light.castShadow = true     // 开启投射阴影
light.shadow.mapSize.set(1024, 1024)
scene.add(light)
// 特点：光线平行，阴影清晰，范围无限
// 用途：室外场景、主光源、太阳`,
  point: () => `// ③ 点光源 PointLight：灯泡效果
const light = new THREE.PointLight(0xfff5d1, 1.6, 14, 1.2)
light.position.set(2, 3, 2.5)
light.castShadow = true
scene.add(light)
// 参数：color 颜色, intensity 强度
//       distance 衰减距离, decay 衰减系数
// 特点：向四周辐射，近亮远暗（灯光球体可显示位置）`,
  spot: () => `// ④ 聚光灯 SpotLight：锥形光束
const light = new THREE.SpotLight(0xffffff, 2, 18, 0.5, 0.45, 1.2)
light.position.set(1.5, 5, 3)
light.target.position.set(0, 0, 0) // 照射目标
light.castShadow = true
scene.add(light)
scene.add(light.target)
// 参数：angle 光束半角, penumbra 边缘柔化
//       distance 最远距离, decay 衰减系数
// 用途：舞台灯、手电筒、展厅射灯`,
};

const explainMap: Record<string, () => string> = {
  ambient: () =>
    `【原理】环境光不来自任何具体位置，而是对整个场景的每个面加同一亮度，模拟光线在环境中多次反弹后的均匀照明。\n【特点】无方向 → 看不到明暗交界，物体像"剪影"；无法投射阴影。\n【用法】通常作为辅助光提亮暗部，配合主光源使用，强度不宜过高（否则画面发灰）。`,
  directional: () =>
    `【原理】光源在无穷远处，发出的光线全部平行，所以只有方向（由 position 指向原点）决定明暗，与距离无关。\n【特点】阴影边缘清晰、锐利，适合室外场景模拟太阳。\n【阴影】castShadow = true 后物体投出投影；阴影范围由 light.shadow.camera 的六个边界决定。`,
  point: () =>
    `【原理】从一个点向四面八方辐射，亮度随距离衰减（decay 控制衰减速度，距离越远越暗）。\n【特点】光影柔和、有近亮远暗的自然衰减，适合灯泡、火把、蜡烛。\n【注意】多盏点光源开销较大；可用距离参数 distance 限制影响范围优化性能。`,
  spot: () =>
    `【原理】点光源 + 圆锥形方向限制：只在 angle 半角内的锥体范围发光，锥外无光。\n【参数】angle 光束半角（弧度）；penumbra 边缘半影柔化（0 硬边 ~ 1 全柔）；distance 照射距离；decay 衰减。\n【用途】舞台追光、展厅射灯、手电筒，能做出很强的明暗对比氛围。`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeLight);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(light, key) in LIGHTS"
        :key="key"
        size="small"
        :type="activeLight === key ? 'primary' : 'default'"
        @click="applyLight(key)"
        >{{ light.label }}</n-button
      >
    </div>

    <!-- 主体：左 3D 场景 / 右 代码+讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div
        ref="containerRef"
        class="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      ></div>

      <CodePanel :title="activeLight" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
