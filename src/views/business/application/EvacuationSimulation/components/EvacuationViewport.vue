<script setup lang="ts">
import * as THREE from 'three';
import { onMounted, ref, watch } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import {
  advance,
  WIDTH,
  DEPTH,
  wall,
  dangerous,
  exits,
  key,
  neighbors,
  walkable,
  reachable,
} from '../simulation';
import type { EvacuationState } from '../composables/useEvacuation';
const props = defineProps<{ state: EvacuationState }>(),
  container = ref<HTMLDivElement | null>(null);
const root = new THREE.Group(),
  tiles: THREE.Mesh[] = [],
  exitMeshes: THREE.Mesh[] = [];
const geo = new THREE.BoxGeometry(1, 1, 1),
  personGeo = new THREE.CapsuleGeometry(0.19, 0.5, 3, 6),
  materials: THREE.Material[] = [];
let people: THREE.InstancedMesh | undefined,
  path: THREE.Line | undefined,
  canvas: HTMLCanvasElement | undefined,
  down = [0, 0],
  accumulator = 0;
function mat(color: string) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  materials.push(m);
  return m;
}
const personMaterial = mat('#ffffff');
function box(
  size: [number, number, number],
  pos: [number, number, number],
  material: THREE.Material
) {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(...size);
  m.position.set(...pos);
  root.add(m);
  return m;
}
const api = useThreeScene(container, {
  background: 0xeaf0f4,
  grid: false,
  axes: false,
  controls: { target: [12, 0, 9] },
  camera: { fov: 45, position: [35, 34, 39], lookAt: [12, 0, 9] },
  lights: { ambient: 1.6, directional: 2 },
  onResize: () => fit(),
  animate: (delta) => {
    const state = props.state,
      s = state.simulation.value;
    if (s.phase === 'running') {
      accumulator += Math.min(delta, 0.1) * state.rate.value;
      while (accumulator >= 0.05) {
        advance(s, 0.05);
        accumulator -= 0.05;
      }
    } else accumulator = 0;
    if (people) {
      const dummy = new THREE.Object3D();
      for (const a of s.agents) {
        dummy.position.set(
          THREE.MathUtils.lerp(a.from[0], a.cell[0], a.progress),
          0.65,
          THREE.MathUtils.lerp(a.from[1], a.cell[1], a.progress)
        );
        dummy.scale.setScalar(a.evacuated ? 0 : 1);
        dummy.updateMatrix();
        people.setMatrixAt(a.id, dummy.matrix);
        people.setColorAt(
          a.id,
          new THREE.Color(
            a.id === state.selectedId.value
              ? '#efad3e'
              : !reachable(s, a.cell)
                ? '#e36766'
                : '#338fab'
          )
        );
      }
      people.instanceMatrix.needsUpdate = true;
      if (people.instanceColor) people.instanceColor.needsUpdate = true;
    }
  },
  onDispose: () => {
    canvas?.removeEventListener('pointerdown', pointerDown);
    canvas?.removeEventListener('pointerup', pick);
    people?.dispose();
    geo.dispose();
    personGeo.dispose();
    path?.geometry.dispose();
    materials.forEach((m) => m.dispose());
    root.clear();
  },
});
function fit(top = false) {
  const aspect =
      (container.value?.clientWidth ?? 1) / Math.max(1, container.value?.clientHeight ?? 1),
    scale = Math.max(1, 1 / aspect);
  api.controls.value?.target.set(12, 0, 9);
  api.camera.value?.position.set(
    12 + (top ? 0 : 25) * scale,
    (top ? 43 : 34) * scale,
    9 + (top ? 0.01 : 30) * scale
  );
  api.camera.value?.lookAt(12, 0, 9);
  api.controls.value?.update();
}
function update() {
  const state = props.state,
    s = state.simulation.value;
  for (const tile of tiles) {
    const cell = tile.userData.cell as [number, number],
      d = s.distances[key(cell)]!;
    const color = dangerous(cell, s.config.hazard)
      ? new THREE.Color('#e89986')
      : state.heatmap.value && Number.isFinite(d)
        ? new THREE.Color().setHSL(0.45 - Math.min(1, d / 40) * 0.4, 0.45, 0.78)
        : new THREE.Color('#f4f6ee');
    (tile.material as THREE.MeshStandardMaterial).color.copy(color);
  }
  exits.forEach((e, i) =>
    (exitMeshes[i]!.material as THREE.MeshStandardMaterial).color.set(
      s.config.open.includes(e.id) ? '#43bd8e' : '#d16f6d'
    )
  );
  const points: THREE.Vector3[] = [];
  const selected = state.selected.value;
  if (selected && !selected.evacuated && state.routes.value) {
    let cell = selected.cell;
    points.push(new THREE.Vector3(...([cell[0], 0.15, cell[1]] as [number, number, number])));
    for (let i = 0; i < WIDTH * DEPTH; i++) {
      const next = neighbors(cell).find(
        (n) => walkable(n, s.config) && s.distances[key(n)]! < s.distances[key(cell)]!
      );
      if (!next) break;
      points.push(new THREE.Vector3(next[0], 0.15, next[1]));
      cell = next;
    }
  }
  if (path) {
    path.geometry.dispose();
    path.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
}
function rebuildPeople() {
  if (people) {
    root.remove(people);
    people.dispose();
  }
  people = new THREE.InstancedMesh(
    personGeo,
    personMaterial,
    props.state.simulation.value.agents.length
  );
  people.frustumCulled = false;
  root.add(people);
  update();
}
function pointerDown(e: PointerEvent) {
  down = [e.clientX, e.clientY];
}
function pick(e: PointerEvent) {
  if (
    !canvas ||
    !api.camera.value ||
    !people ||
    Math.hypot(e.clientX - down[0]!, e.clientY - down[1]!) > 5
  )
    return;
  const r = canvas.getBoundingClientRect(),
    ray = new THREE.Raycaster();
  ray.setFromCamera(
    new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1
    ),
    api.camera.value
  );
  people.updateMatrixWorld();
  people.computeBoundingSphere();
  const id = ray.intersectObject(people)[0]?.instanceId;
  props.state.selectedId.value = id ?? null;
}
async function capture(): Promise<Blob | null> {
  if (!api.renderer.value || !api.scene.value || !api.camera.value) return null;
  api.renderer.value.render(api.scene.value, api.camera.value);
  return new Promise((resolve) => api.renderer.value!.domElement.toBlob(resolve));
}
onMounted(() => {
  api.scene.value?.add(root);
  const wallMat = mat('#a2b5c4');
  for (let z = 0; z < DEPTH; z++)
    for (let x = 0; x < WIDTH; x++) {
      if (wall([x, z])) box([0.96, 1.1, 0.96], [x, 0.55, z], wallMat);
      else {
        const tile = box([0.97, 0.08, 0.97], [x, -0.06, z], mat('#f4f6ee'));
        tile.userData.cell = [x, z];
        tiles.push(tile);
      }
    }
  for (const e of exits)
    exitMeshes.push(box([0.95, 0.12, 0.95], [e.cell[0], 0.04, e.cell[1]], mat('#43bd8e')));
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#efab3d', depthTest: false });
  materials.push(lineMaterial);
  path = new THREE.Line(new THREE.BufferGeometry(), lineMaterial);
  root.add(path);
  if (api.controls.value) {
    api.controls.value.maxPolarAngle = Math.PI / 2 - 0.05;
    api.controls.value.maxDistance = 180;
  }
  rebuildPeople();
  fit();
});
watch(() => props.state.simulation.value, rebuildPeople);
watch(
  [
    props.state.open,
    props.state.hazard,
    props.state.heatmap,
    props.state.selectedId,
    props.state.routes,
  ],
  update,
  { deep: true }
);
watch(() => props.state.selected.value?.cell, update);
defineExpose({ capture, fit });
</script>
<template>
  <section class="evac-viewport relative rounded-xl overflow-hidden min-h-[600px] bg-[#eaf0f4]">
    <div ref="container" class="evac-canvas absolute inset-0 [&_canvas]:block touch-none"></div>
    <div class="absolute left-4 top-4 right-4 flex justify-between gap-2">
      <div class="bg-white/90 rounded px-3 py-2 text-xs">三分区示例建筑 · 25 × 19 格</div>
      <div class="flex gap-2">
        <n-button size="small" @click="fit(true)">俯视</n-button
        ><n-button size="small" @click="fit()">全景</n-button>
      </div>
    </div>
    <div
      class="absolute left-4 bottom-4 right-4 bg-white/95 p-3 rounded text-[11px] text-slate-500"
    >
      绿色出口可用 · 红色出口关闭 · 橙色地面为危险区<br />点击人员查看路线 · 拖动旋转 · 滚轮缩放<br />{{
        state.selected.value
          ? `人员 #${state.selected.value.id + 1}：${state.selected.value.evacuated ? '已疏散' : !reachable(state.simulation.value, state.selected.value.cell) ? '当前无可达出口' : '正在等待 / 前往出口'}`
          : '蓝色为可达人员，红色为暂时无路可达人员。'
      }}
    </div>
  </section>
</template>
