import * as THREE from 'three';
import { onMounted, type Ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { LANE_WIDTH, step } from '../game';
import type { RunnerState } from './useRunner';
export function useRunnerScene(container: Ref<HTMLDivElement | null>, state: RunnerState) {
  const root = new THREE.Group(),
    player = new THREE.Group(),
    stripes: THREE.Mesh[] = [],
    buildings: THREE.Mesh[] = [],
    objects = new Map<number, THREE.Group>();
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Map<string, THREE.MeshStandardMaterial>();
  let accumulator = 0,
    lastRound = state.round.value,
    lastPhase = state.game.phase;
  function material(color: string) {
    if (!materials.has(color))
      materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
    return materials.get(color)!;
  }
  const box = new THREE.BoxGeometry(1, 1, 1),
    coin = new THREE.TorusGeometry(0.26, 0.075, 8, 16);
  geometries.add(box);
  geometries.add(coin);
  function cube(
    parent: THREE.Group,
    color: string,
    size: [number, number, number],
    position: [number, number, number]
  ) {
    const mesh = new THREE.Mesh(box, material(color));
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const api = useThreeScene(container, {
    background: 0x10182f,
    grid: false,
    axes: false,
    controls: { enabled: false, target: [0, 1, -12] },
    camera: { fov: 52, position: [0, 7, 11], lookAt: [0, 1, -12] },
    lights: { ambient: 1.4, directional: 2, dirPosition: [5, 12, 8] },
    shadow: { enabled: true, mapSize: 1024, cameraBounds: 18 },
    onResize: (width, height) => {
      if (api.camera.value) {
        api.camera.value.position.set(0, 7, 11 + Math.max(0, height / width - 1) * 5);
        api.camera.value.lookAt(0, 1, -12);
      }
    },
    animate: (delta) => {
      const g = state.game;
      if (state.round.value !== lastRound) {
        for (const object of objects.values()) root.remove(object);
        objects.clear();
        accumulator = 0;
        lastRound = state.round.value;
      }
      if (g.phase !== lastPhase) {
        accumulator = 0;
        lastPhase = g.phase;
      }
      if (g.phase === 'running') {
        accumulator += Math.min(Math.max(delta, 0), 0.1);
        while (accumulator >= 1 / 120) {
          step(g, 1 / 120);
          accumulator -= 1 / 120;
        }
        if (g.phase !== 'running') state.record();
      } else accumulator = 0;
      player.position.set(g.x, g.height, 0);
      player.rotation.z = THREE.MathUtils.clamp((g.lane * LANE_WIDTH - g.x) * -0.12, -0.15, 0.15);
      player.visible = !(g.invincible > 0 && Math.floor(g.elapsed * 12) % 2 === 0);
      const bob = g.phase === 'running' && g.height === 0 ? Math.sin(g.elapsed * 18) * 0.04 : 0;
      player.position.y += bob;
      for (let i = 0; i < stripes.length; i++)
        stripes[i]!.position.z = -90 + Math.floor(i / 2) * 4 + (g.distance % 4);
      for (let i = 0; i < buildings.length; i++)
        buildings[i]!.position.z = -105 + Math.floor(i / 2) * 7 + (g.distance % 7);
      const live = new Set<number>();
      for (const entity of g.entities) {
        live.add(entity.id);
        let group = objects.get(entity.id);
        if (!group) {
          group = new THREE.Group();
          if (entity.kind === 'coin') {
            const mesh = new THREE.Mesh(coin, material('#ffd36a'));
            group.add(mesh);
          } else if (entity.kind === 'hurdle') {
            cube(group, '#ffb064', [1.45, 1.05, 0.6], [0, 0.525, 0]);
            cube(group, '#ffe4ba', [1.5, 0.12, 0.65], [0, 0.9, 0]);
          } else {
            cube(group, '#e56d86', [1.5, 2.8, 1.2], [0, 1.4, 0]);
            cube(group, '#ffbdcb', [1.55, 0.18, 1.25], [0, 2.5, 0]);
          }
          root.add(group);
          objects.set(entity.id, group);
        }
        group.position.set(
          entity.lane * LANE_WIDTH,
          entity.kind === 'coin' ? 0.8 : 0,
          -(entity.at - g.distance)
        );
        if (entity.kind === 'coin') group.rotation.y = g.elapsed * 2;
      }
      for (const [id, obj] of objects)
        if (!live.has(id)) {
          root.remove(obj);
          objects.delete(id);
        }
    },
    onDispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      objects.clear();
      root.clear();
    },
  });
  onMounted(() => {
    if (api.scene.value) api.scene.value.fog = new THREE.Fog(0x10182f, 35, 100);
    api.scene.value?.add(root);
    cube(root, '#283657', [7.4, 0.15, 130], [0, -0.13, -50]);
    for (const x of [-3.85, 3.85]) cube(root, '#46c7c5', [0.15, 0.25, 130], [x, 0, -50]);
    for (let i = 0; i < 24; i++)
      for (const x of [-LANE_WIDTH / 2, LANE_WIDTH / 2])
        stripes.push(cube(root, '#7585ab', [0.065, 0.02, 1.6], [x, 0.005, -i * 4]));
    for (let i = 0; i < 32; i++) {
      const side = i % 2 === 0 ? -1 : 1,
        height = 2 + ((i * 7) % 11);
      buildings.push(
        cube(
          root,
          i % 3 === 0 ? '#334c75' : '#243756',
          [2 + (i % 3), height, 3],
          [side * (7 + (i % 3)), height / 2, -Math.floor(i / 2) * 7]
        )
      );
    }
    cube(player, '#55d5c9', [0.65, 0.75, 0.45], [0, 0.85, 0]);
    cube(player, '#f6d4b6', [0.45, 0.42, 0.45], [0, 1.43, 0]);
    cube(player, '#234966', [0.2, 0.5, 0.25], [-0.2, 0.25, 0]);
    cube(player, '#234966', [0.2, 0.5, 0.25], [0.2, 0.25, 0]);
    cube(player, '#e8f5f2', [0.28, 0.12, 0.42], [-0.2, 0.08, 0.08]);
    cube(player, '#e8f5f2', [0.28, 0.12, 0.42], [0.2, 0.08, 0.08]);
    root.add(player);
  });
  return api;
}
