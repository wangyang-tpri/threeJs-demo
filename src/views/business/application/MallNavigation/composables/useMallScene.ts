import * as THREE from 'three';
import { onMounted, ref, watch, type Ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import {
  COLORS,
  ENTRANCE,
  FLOORS,
  FLOOR_HEIGHT,
  METERS_PER_UNIT,
  PLACES,
  floorIndex,
  type FloorKey,
  type Place,
  type RouteNode,
} from '../mall';
import type { MallRoute, NavigationStatus } from '../types';

interface MallSceneOptions {
  activeFloor: Ref<FloorKey | 'all'>;
  exploded: Ref<boolean>;
  topView: Ref<boolean>;
  selectedId: Ref<string>;
  plannedRoute: Ref<MallRoute | null>;
  traveled: Ref<number>;
  status: Ref<NavigationStatus>;
  onSelectPlace: (place: Place) => void;
  onAnimate: (delta: number) => void;
}

/** 场景、拾取、路线绘制和资源生命周期由地图组件独立持有。 */
export function useMallScene(options: MallSceneOptions) {
  const { activeFloor, exploded, topView, selectedId, plannedRoute, traveled, status } = options;
  const containerRef = ref<HTMLDivElement | null>(null);
  const mall = new THREE.Group();
  const routeGroup = new THREE.Group();
  const floorGroups = new Map<FloorKey, THREE.Group>();
  const shopMeshes = new Map<string, THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>>();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let marker: THREE.Mesh | null = null;

  let pointerStart = { x: 0, y: 0 };
  let hoveredId = '';
  let sceneCanvas: HTMLCanvasElement | null = null;
  const { scene, camera, controls, renderer } = useThreeScene(containerRef, {
    background: 0xf1f5f7,
    camera: { fov: 45, position: [24, 27, 30] },
    controls: { target: [0, 0, 0] },
    grid: false,
    axes: false,
    lights: { ambient: 1.4, directional: 2.1, dirPosition: [8, 20, 10] },
    shadow: { enabled: true, mapSize: 2048, cameraBounds: 30 },
    animate: (delta) => {
      if (status.value === 'playing') options.onAnimate(delta);
    },
    onResize: () => fitCamera(),
    onDispose: () => {
      sceneCanvas?.removeEventListener('pointerdown', onPointerDown);
      sceneCanvas?.removeEventListener('pointerup', onPointerUp);
      sceneCanvas?.removeEventListener('pointermove', onPointerMove);
      sceneCanvas?.removeEventListener('pointerleave', onPointerLeave);
      sceneCanvas = null;
      disposeGroup(mall);
      disposeGroup(routeGroup);
      shopMeshes.clear();
      floorGroups.clear();
    },
  });

  function disposeGroup(group: THREE.Group) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material: THREE.Material & { map?: THREE.Texture | null }) => {
          materials.add(material);
          if (material.map) textures.add(material.map);
        });
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    group.clear();
  }

  function box(
    parent: THREE.Group,
    size: [number, number, number],
    position: [number, number, number],
    color: string | number
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function label(text: string, color = '#334155', width = 3.1) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 120, 24);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = '600 42px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64, 480);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true }));
    sprite.scale.set(width, width / 4, 1);
    return sprite;
  }

  function floorY(floor: FloorKey) {
    return floorIndex(floor) * (FLOOR_HEIGHT + (exploded.value ? 4 : 0));
  }

  function nodePosition(node: RouteNode) {
    return new THREE.Vector3(node.x, floorY(node.floor) + 0.26, node.z);
  }

  function buildMall() {
    for (const floor of FLOORS) {
      const group = new THREE.Group();
      floorGroups.set(floor.key, group);
      mall.add(group);
      box(group, [22, 0.22, 16], [0, -0.11, 0], '#dce5e9');
      box(group, [21.7, 0.05, 15.7], [0, 0.025, 0], '#fcfcf9');
      for (const z of [-2.5, 2.5]) box(group, [19, 0.025, 1.15], [0, 0.065, z], '#e6edef');
      for (const x of [-9, 0, 9]) box(group, [1.15, 0.025, 6], [x, 0.065, 0], '#e6edef');
      box(group, [1.15, 0.025, 5], [0, 0.065, 5], '#e6edef');
      for (const place of PLACES.filter((p) => p.floor === floor.key)) {
        const mesh = box(group, [3, 0.85, 3.5], [place.x, 0.48, place.z], COLORS[place.category]);
        mesh.userData.placeId = place.id;
        shopMeshes.set(place.id, mesh);
        const roof = box(
          group,
          [2.5, 0.035, 3],
          [place.x, 0.925, place.z],
          new THREE.Color(COLORS[place.category]).lerp(new THREE.Color('white'), 0.35).getHex()
        );
        roof.userData.placeId = place.id;
        // 店铺门口朝向走廊，导航到门口，不穿过店铺实体。
        box(group, [0.8, 0.08, 0.25], [place.x, 0.12, Math.sign(place.z) * 3.2], '#ffffff');
        const name = label(place.name);
        name.position.set(place.x, 1.5, place.z);
        name.userData.placeId = place.id;
        group.add(name);
      }
      box(group, [1.2, 0.8, 1.2], [9, 0.5, 0], '#5b8f8c');
      const elevatorLabel = label('↕ 电梯', '#397570', 2);
      elevatorLabel.position.set(9, 1.6, 0);
      group.add(elevatorLabel);
      const floorLabel = label(`${floor.key} · ${floor.name}`, '#177f76', 4);
      floorLabel.position.set(-8, 0.8, 8.4);
      group.add(floorLabel);
      for (const x of [-5, 5]) {
        box(group, [1.6, 0.28, 1.2], [x, 0.18, 0], '#d4dfd8');
        const plant = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 12, 10),
          new THREE.MeshStandardMaterial({ color: '#79a98d' })
        );
        plant.position.set(x, 0.75, 0);
        group.add(plant);
      }
    }
    const entrance = label('● 南门入口', '#177f76', 2.8);
    entrance.position.set(0, 0.6, 7.5);
    floorGroups.get('1F')!.add(entrance);
    scene.value?.add(mall, routeGroup);
    updateFloors();
    highlightShops();
  }

  function updateFloors() {
    floorGroups.forEach((group, key) => {
      group.position.y = floorY(key);
      group.visible = activeFloor.value === 'all' || activeFloor.value === key;
    });
    drawRoute();
    fitCamera();
  }

  function fitCamera() {
    if (!camera.value || !controls.value) return;
    const y = activeFloor.value === 'all' ? floorY('3F') / 2 : floorY(activeFloor.value);
    controls.value.target.set(0, y, 0);
    const aspect = renderer.value
      ? renderer.value.domElement.clientWidth / Math.max(renderer.value.domElement.clientHeight, 1)
      : 1;
    const scale = Math.max(1, 1 / aspect);
    if (topView.value) camera.value.position.set(0, y + 32 * scale, 0.01);
    else
      camera.value.position.set(
        25 * scale,
        y + (activeFloor.value === 'all' ? 31 : 24) * scale,
        29 * scale
      );
    controls.value.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.value.minDistance = 10;
    controls.value.maxDistance = 150;
    controls.value.update();
  }

  function highlightShops() {
    shopMeshes.forEach((mesh, id) => {
      const active = id === selectedId.value || id === hoveredId;
      mesh.material.emissive.set(active ? '#247e79' : '#000000');
      mesh.material.emissiveIntensity = active ? 0.3 : 0;
    });
  }

  function hitPlace(event: PointerEvent) {
    const canvas = renderer.value?.domElement;
    if (!canvas || !camera.value) return undefined;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1
    );
    scene.value?.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera.value);
    // 同时拾取楼板等遮挡物，避免点击上层时误选被遮住的下层店铺。
    const visible = [...floorGroups.values()].filter((group) => group.visible);
    const hit = raycaster.intersectObjects(visible, true)[0];
    return PLACES.find((p) => p.id === hit?.object.userData.placeId);
  }

  function onPointerDown(event: PointerEvent) {
    pointerStart = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: PointerEvent) {
    if (
      event.button !== 0 ||
      Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5
    )
      return;
    const place = hitPlace(event);
    if (place) options.onSelectPlace(place);
  }

  function onPointerMove(event: PointerEvent) {
    hoveredId = hitPlace(event)?.id ?? '';
    highlightShops();
    if (renderer.value) renderer.value.domElement.style.cursor = hoveredId ? 'pointer' : 'grab';
  }

  function onPointerLeave() {
    hoveredId = '';
    highlightShops();
  }

  function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, color: string) {
    const direction = b.clone().sub(a);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, direction.length(), 8),
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    routeGroup.add(mesh);
  }

  function drawRoute() {
    disposeGroup(routeGroup);
    marker = null;
    const nodes = plannedRoute.value?.nodes;
    if (!nodes?.length) return;
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1]!;
      const b = nodes[i]!;
      if (
        activeFloor.value !== 'all' &&
        (a.floor !== activeFloor.value || b.floor !== activeFloor.value)
      )
        continue;
      cylinderBetween(
        nodePosition(a),
        nodePosition(b),
        a.floor === b.floor ? '#188a80' : '#e99c46'
      );
    }
    for (const [i, node] of [nodes[0]!, nodes[nodes.length - 1]!].entries()) {
      if (activeFloor.value !== 'all' && activeFloor.value !== node.floor) continue;
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.12, 24),
        new THREE.MeshBasicMaterial({ color: i === 0 ? '#188a80' : '#ef8755' })
      );
      pin.position.copy(nodePosition(node));
      routeGroup.add(pin);
      const title = label(i === 0 ? '起点' : '终点', i === 0 ? '#188a80' : '#dc7441', 1.3);
      title.position.copy(nodePosition(node)).add(new THREE.Vector3(0, 0.7, 0));
      routeGroup.add(title);
    }
    marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#188a80', transparent: true, opacity: 0.3 })
    );
    marker.add(halo);
    routeGroup.add(marker);
    updateMarker();
  }

  function segmentLength(a: RouteNode, b: RouteNode) {
    return a.floor === b.floor
      ? Math.hypot(a.x - b.x, a.z - b.z) * METERS_PER_UNIT
      : FLOOR_HEIGHT * METERS_PER_UNIT;
  }

  function updateMarker() {
    const nodes = plannedRoute.value?.nodes;
    if (!nodes?.length || !marker) return;
    let remaining = traveled.value;
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i - 1]!;
      const b = nodes[i]!;
      const length = segmentLength(a, b);
      if (remaining <= length || i === nodes.length - 1) {
        const t = Math.min(remaining / length, 1);
        marker.position.copy(nodePosition(a)).lerp(nodePosition(b), t);
        marker.position.y += 0.12;
        marker.visible =
          activeFloor.value === 'all' ||
          (a.floor === activeFloor.value && b.floor === activeFloor.value);
        return;
      }
      remaining -= length;
    }
  }
  watch([activeFloor, exploded], updateFloors);
  watch(topView, fitCamera);
  watch(selectedId, highlightShops);
  watch(plannedRoute, drawRoute);
  watch(traveled, updateMarker);
  onMounted(() => {
    buildMall();
    sceneCanvas = renderer.value?.domElement ?? null;
    sceneCanvas?.addEventListener('pointerdown', onPointerDown);
    sceneCanvas?.addEventListener('pointerup', onPointerUp);
    sceneCanvas?.addEventListener('pointermove', onPointerMove);
    sceneCanvas?.addEventListener('pointerleave', onPointerLeave);
  });
  return { containerRef, fitCamera };
}
