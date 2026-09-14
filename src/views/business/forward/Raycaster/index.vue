<script setup lang="ts">
import * as THREE from 'three';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const containerRef = ref<HTMLDivElement | null>(null);

/* ================= 状态 ================= */
type Feature = 'click' | 'hover' | 'nearest' | 'all' | 'recursive' | 'ground';
const activeFeature = ref<Feature>('click');
const recursiveMode = ref(false); // 递归检测开关（recursive 演示）
const pickInfo = ref('点击场景中的物体体验射线拾取');

const FEATURE_LABELS: Record<Feature, string> = {
  click: '点击拾取',
  hover: '悬停检测',
  nearest: '最近拾取',
  all: '拾取全部',
  recursive: '递归检测',
  ground: '射线置地',
};

/* ================= 场景（hook 已初始化，此处添加可拾取物体） ================= */
const raycaster = new THREE.Raycaster();
let pickables: THREE.Object3D[] = []; // 参与拾取的顶层对象（含嵌套 Group）
let highlightMap = new Map<THREE.Mesh, THREE.Color>(); // 高亮中的物体及其原色
let marker: THREE.Mesh | null = null; // 射线置地的标记点

const { scene, camera, renderer } = useThreeScene(containerRef, {
  background: 0xf5f7fa,
  camera: { fov: 55, near: 0.1, far: 100, position: [4, 3.5, 6], lookAt: [0, 0.8, 0] },
  controls: { target: [0, 0.8, 0] },
  grid: { size: 8, divisions: 12 },
  axes: 2,
  lights: { ambient: 0.7, directional: 1.2, dirPosition: [5, 10, 7] },
  onDispose: () => {
    highlightMap.clear();
    pickables = [];
    marker = null;
  },
});

function makeMesh(
  geo: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
  name: string
) {
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
  mesh.name = name;
  mesh.position.set(x, y, z);
  return mesh;
}

onMounted(() => {
  const s = scene.value;
  const rdr = renderer.value;
  if (!s || !rdr) return;

  // 地面（半透明，不参与拾取；用于"射线置地"求交）
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xcfd6e2,
      roughness: 0.95,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  s.add(ground);

  // 可拾取物体组
  const cube = makeMesh(new THREE.BoxGeometry(1, 1, 1), 0xef4444, -2.4, 0.6, 0, '红色立方体');
  const sphere = makeMesh(new THREE.SphereGeometry(0.7, 32, 32), 0x3b82f6, 0, 0.8, 0, '蓝色球体');
  const cylinder = makeMesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1.3, 32),
    0xf97316,
    2.4,
    0.8,
    0,
    '橙色圆柱'
  );
  const torus = makeMesh(
    new THREE.TorusGeometry(0.5, 0.2, 16, 48),
    0x8b5cf6,
    -1.5,
    1.6,
    -2.5,
    '紫色圆环'
  );
  s.add(cube, sphere, cylinder, torus);

  // 嵌套 Group：演示 recursive 递归检测（子物体不在顶层数组时仍可被拾取）
  const nestedGroup = new THREE.Group();
  nestedGroup.name = '绿色圆锥组';
  nestedGroup.position.set(2.6, 0.8, 2.2);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.6, 32),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5 })
  );
  cone.name = '绿色圆锥';
  cone.position.y = 0.8;
  const childBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 })
  );
  childBox.name = '天蓝小方块';
  childBox.position.set(0.55, 0.55, 0.45);
  nestedGroup.add(cone, childBox);
  s.add(nestedGroup);

  // 射线置地的标记点（金色小球，默认隐藏）
  marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xb8860b, emissiveIntensity: 0.4 })
  );
  marker.visible = false;
  s.add(marker);

  // 顶层可拾取对象（Group 需 recursive=true 才能命中内部子物体）
  pickables = [cube, sphere, cylinder, torus, nestedGroup];

  // 绑定交互事件
  rdr.domElement.addEventListener('pointerdown', onPointerDown);
  rdr.domElement.addEventListener('pointermove', onPointerMove);
});

onBeforeUnmount(() => {
  const rdr = renderer.value;
  if (rdr) {
    rdr.domElement.removeEventListener('pointerdown', onPointerDown);
    rdr.domElement.removeEventListener('pointermove', onPointerMove);
  }
  highlightMap.clear();
});

/* ================= 射线拾取核心 ================= */
function toNDC(e: PointerEvent): THREE.Vector2 | null {
  const canvas = renderer.value?.domElement;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
}

/** 拾取相交物体（按距离排序，recursive 控制是否检测子物体） */
function pick(e: PointerEvent): THREE.Intersection[] {
  const cam = camera.value;
  const ndc = toNDC(e);
  if (!cam || !ndc) return [];
  raycaster.setFromCamera(ndc, cam);
  return raycaster.intersectObjects(pickables, recursiveMode.value);
}

/** 高亮一个物体（记录原色），并清除上一次高亮 */
function highlight(mesh: THREE.Mesh) {
  clearHighlight();
  const mat = mesh.material as THREE.MeshStandardMaterial;
  if (!highlightMap.has(mesh)) highlightMap.set(mesh, mat.color.clone());
  mat.color.set(0xffd700);
}

function clearHighlight() {
  highlightMap.forEach((orig, mesh) => {
    (mesh.material as THREE.MeshStandardMaterial).color.copy(orig);
  });
  highlightMap.clear();
}

function hitName(hit: THREE.Intersection): string {
  return hit.object.name || '未命名物体';
}

/* ================= 交互事件 ================= */
function onPointerDown(e: PointerEvent) {
  const hits = pick(e);
  switch (activeFeature.value) {
    case 'ground': {
      // 射线与地面平面求交 → 放置标记点，显示世界坐标
      const cam = camera.value;
      const ndc = toNDC(e);
      if (!cam || !ndc || !marker) return;
      raycaster.setFromCamera(ndc, cam);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, target)) {
        marker.visible = true;
        marker.position.copy(target);
        pickInfo.value = `标记点放置于 (${target.x.toFixed(2)}, 0, ${target.z.toFixed(2)})`;
      }
      return;
    }
    case 'all': {
      // 拾取全部相交物体
      const list = hits.map((h) => `${hitName(h)} @ ${h.distance.toFixed(2)}m`).join('、');
      hits.forEach((h) => {
        if ((h.object as THREE.Mesh).isMesh) highlight(h.object as THREE.Mesh);
      });
      pickInfo.value = hits.length ? `命中 ${hits.length} 个：${list}` : '未命中任何物体';
      return;
    }
    case 'recursive': {
      // 递归开关下拾取：命中 group 子物体说明 recursive=true 生效
      if (hits.length === 0) {
        pickInfo.value = recursiveMode.value
          ? '未命中（recursive 已开）'
          : '未命中（recursive 关闭，Group 子物体不可拾取）';
        clearHighlight();
        return;
      }
      const h = hits[0]!;
      if ((h.object as THREE.Mesh).isMesh) highlight(h.object as THREE.Mesh);
      pickInfo.value = `命中：${hitName(h)}（${recursiveMode.value ? 'recursive=true 递归检测到子物体' : 'recursive=false 仅顶层'}）`;
      return;
    }
    default: {
      // click / nearest：拾取最近物体
      if (hits.length === 0) {
        pickInfo.value = '未命中任何物体';
        clearHighlight();
        return;
      }
      const h = hits[0]!;
      if ((h.object as THREE.Mesh).isMesh) highlight(h.object as THREE.Mesh);
      pickInfo.value = `命中：${hitName(h)}｜距离 ${h.distance.toFixed(2)}m｜${activeFeature.value === 'nearest' ? '（最近相交物体）' : '（已高亮）'}`;
    }
  }
}

function onPointerMove(e: PointerEvent) {
  if (activeFeature.value !== 'hover') return;
  const hits = pick(e);
  const canvas = renderer.value?.domElement;
  if (hits.length > 0 && (hits[0]!.object as THREE.Mesh).isMesh) {
    highlight(hits[0]!.object as THREE.Mesh);
    if (canvas) canvas.style.cursor = 'pointer';
    pickInfo.value = `悬停：${hitName(hits[0]!)}｜距离 ${hits[0]!.distance.toFixed(2)}m`;
  } else {
    clearHighlight();
    if (canvas) canvas.style.cursor = 'default';
    pickInfo.value = '悬停中…未命中物体';
  }
}

/* ================= 功能按钮 ================= */
function switchFeature(key: Feature) {
  activeFeature.value = key;
  clearHighlight();
  pickInfo.value = '';
  if (key === 'recursive') {
    recursiveMode.value = !recursiveMode.value; // 切换递归开关
    pickInfo.value = recursiveMode.value
      ? '已开启递归检测（true）：可命中嵌套 Group 内部子物体'
      : '已关闭递归检测（false）：仅检测顶层对象，Group 子物体不可拾取';
  } else if (key === 'hover') {
    pickInfo.value = '移动鼠标到物体上，实时悬停高亮';
  } else if (key === 'ground') {
    pickInfo.value = '点击地面任意位置，放置金色标记点并显示坐标';
  } else if (key === 'all') {
    pickInfo.value = '点击物体，列出所有相交物体及距离';
  } else if (key === 'nearest') {
    pickInfo.value = '点击物体，显示最近相交物体';
  } else {
    pickInfo.value = '点击场景中的物体，拾取并高亮';
  }
}

/* ================= 代码与讲解（函数式动态生成） ================= */
const codeMap: Record<Feature, () => string> = {
  click: () => `// ① 点击拾取：鼠标 → 射线 → 相交检测
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

canvas.addEventListener('pointerdown', (e) => {
  // 1. 屏幕坐标 → 标准化设备坐标 NDC [-1, 1]
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  // 2. 从相机经鼠标位置发射射线
  raycaster.setFromCamera(mouse, camera)

  // 3. 检测与物体的相交（按距离升序）
  const hits = raycaster.intersectObjects(objects)
  if (hits.length > 0) {
    hits[0].object.material.color.set(0xffd700)  // 高亮最近物体
  }
})`,

  hover: () => `// ② 悬停检测：pointermove 实时拾取
canvas.addEventListener('pointermove', (e) => {
  // 同上的 NDC 换算 + setFromCamera
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(objects)

  if (hits.length > 0) {
    canvas.style.cursor = 'pointer'   // 光标反馈
    highlight(hits[0].object)         // 悬停高亮
  } else {
    canvas.style.cursor = 'default'
    clearHighlight()
  }
})`,

  nearest: () => `// ③ 最近拾取：hits 按距离升序，取 [0]
const hits = raycaster.intersectObjects(objects)
if (hits.length > 0) {
  const nearest = hits[0]
  console.log(nearest.object.name, nearest.distance)
  // hits[i].distance：射线起点到命中点的距离
  // 多个物体重叠时，[0] 永远是最近的
}`,

  all: () => `// ④ 拾取全部：遍历 hits 处理每个相交
const hits = raycaster.intersectObjects(objects)
hits.forEach((hit) => {
  console.log(hit.object.name, hit.distance)
  // hit.face / hit.point：命中面与精确交点
  // hit.object：被命中的物体
})
// ★ hits 已按 distance 升序排序`,

  recursive: () => `// ⑤ 递归检测 recursive（当前 ${recursiveMode.value}）
// 默认 false：只检测 objects 数组里的对象本身
const hits1 = raycaster.intersectObjects(objects, false)

// true：递归遍历每个对象的子节点
const hits2 = raycaster.intersectObjects(objects, true)
// ★ Group 内部子物体只有 recursive=true 才能命中`,
  ground: () => `// ⑥ 射线与平面求交：射线置地/落点定位
const groundPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0),  // 法线朝上
  0                             // 到原点距离（y=0 平面）
)
raycaster.setFromCamera(mouse, camera)
const target = new THREE.Vector3()
if (raycaster.ray.intersectPlane(groundPlane, target)) {
  marker.position.copy(target)  // 把标记放到交点
  console.log(target)           // 世界坐标
}
// ★ 常用来放置物体、绘制路径、测量距离`,
};

const explainMap: Record<Feature, () => string> = {
  click: () =>
    `【原理】Raycaster（射线投射器）从相机位置发射一条射线，穿过鼠标所在的屏幕像素，检测射线与场景中物体的相交——这是 3D 拾取的核心机制。

【三步走】
1. 屏幕坐标 → NDC：((x-rect.left)/w)*2-1、-((y-rect.top)/h)*2+1
2. raycaster.setFromCamera(mouse, camera)：由相机+NDC 计算射线
3. intersectObjects(objects)：返回相交数组（按距离升序）

【要点】hits[0] 是最近物体；拾取必须发生在 canvas 的事件回调里，且相机/物体位置改变后射线会自动随 setFromCamera 重算。

【当前】${pickInfo.value}`,
  hover: () =>
    `【原理】pointermove 每帧触发拾取，实现"鼠标悬停识别物体"，配合光标样式与高亮形成即时反馈。

【实现】与点击拾取完全相同，只是事件换成 pointermove；每次移动都重建射线并重新检测。

【优化】悬停检测每秒触发数十次，物体多时建议只对"可拾取列表"检测，或用四叉树/包围盒预筛选加速。

【当前】${pickInfo.value}`,
  nearest: () =>
    `【原理】intersectObjects 返回的数组按 distance（射线起点到命中点距离）升序排列，hits[0] 即最近物体。

【场景】多个物体前后重叠时（如本页正方体后方的圆环），点击重叠区域会命中多个，[0] 保证拾取到最前面的那个。

【要点】distance 是射线原点（相机）到交点的距离，可用于判断遮挡、LOD 切换、目标锁定。

【当前】${pickInfo.value}`,
  all: () =>
    `【原理】一次射线可以与多个物体相交，hits 数组包含全部交点（按距离排序），可用于框选、穿透检测、射线列表。

【字段】每个 hit 包含：object 命中对象、distance 距离、point 交点世界坐标、face 命中的三角面、uv 交点 UV。

【注意】透明/半透明物体也会被命中，若需"只拾取最前面"就只取 hits[0]。

【当前】${pickInfo.value}`,
  recursive: () =>
    `【原理】intersectObjects 的第二个参数 recursive 控制是否递归检测子节点：false 只检测数组里的对象本身；true 会遍历每个对象的 children。

【演示】场景右侧的绿色圆锥组是 Group 对象——recursive=false 时点击它命中不了（Group 无几何体）；recursive=true 时其内部的圆锥/小方块可被拾取。

【当前】recursive = ${recursiveMode.value}｜${pickInfo.value}`,
  ground: () =>
    `【原理】射线还可以与数学平面求交（Ray.intersectPlane），不需要真实网格——常用于把物体放到地面上、路径规划、测距。

【实现】new THREE.Plane(normal, constant) 定义无限平面；ray.intersectPlane(plane, target) 把交点写入 target（未命中返回 null）。

【用途】放置建筑/角色、绘制点击落点、计算两点地面距离。

【当前】${pickInfo.value}`,
};

const { code, explanation } = useCodeExplain(codeMap, explainMap, activeFeature);
</script>

<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap items-center gap-2">
      <n-button
        v-for="(label, key) in FEATURE_LABELS"
        :key="key"
        size="small"
        :type="activeFeature === key ? 'primary' : 'default'"
        @click="switchFeature(key)"
        >{{
          key === 'recursive' && activeFeature === 'recursive'
            ? `${label}：${recursiveMode ? '开' : '关'}`
            : label
        }}</n-button
      >
    </div>

    <!-- 主体：左 3D 场景 / 右 代码+讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div
        ref="containerRef"
        class="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      >
        <!-- 拾取状态提示 -->
        <div
          class="absolute left-3 top-3 z-10 max-w-[70%] rounded-md bg-black/55 px-3 py-1.5 text-xs text-white"
        >
          {{ pickInfo || '点击物体体验射线拾取' }}
        </div>
      </div>

      <CodePanel :title="FEATURE_LABELS[activeFeature]" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>
