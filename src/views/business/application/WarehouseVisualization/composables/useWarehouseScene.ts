import * as THREE from 'three';
import { onMounted, ref, watch } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { COLORS, RACKS, stockStatus, type Bin } from '../warehouse';
import type { useWarehouse } from './useWarehouse';

export function useWarehouseScene(state: ReturnType<typeof useWarehouse>) {
  const containerRef = ref<HTMLDivElement | null>(null);
  const structure = new THREE.Group(),
    stock = new THREE.Group(),
    route = new THREE.Group(),
    vehicle = new THREE.Group();
  const captions: THREE.Sprite[] = [];
  const raycaster = new THREE.Raycaster();
  const maps = new Map<THREE.InstancedMesh, Bin[]>();
  let cargo: THREE.Mesh | null = null,
    canvas: HTMLCanvasElement | null = null,
    mounted = false;
  const down = new THREE.Vector2();
  let lastPosition = new THREE.Vector3(0, 0, 10);
  const { scene, camera, controls, renderer } = useThreeScene(containerRef, {
    background: 0xf1f5f8,
    grid: false,
    axes: false,
    camera: { fov: 44, position: [23, 22, 26] },
    controls: { target: [0, 1.7, 0] },
    lights: { ambient: 1.5, directional: 2.5, dirPosition: [9, 20, 8] },
    shadow: { enabled: true, mapSize: 2048, cameraBounds: 25 },
    animate: (delta) => {
      state.advance(delta);
      const p = state.vehiclePoint.value;
      const position = new THREE.Vector3(p[0], 0, p[1]);
      const direction = position.clone().sub(lastPosition);
      if (direction.lengthSq() > 1e-8) vehicle.rotation.y = Math.atan2(direction.x, direction.z);
      vehicle.position.copy(position);
      lastPosition.copy(position);
      if (cargo) cargo.visible = state.hasCargo.value;
    },
    onResize: () => fitView(),
    onDispose: () => {
      mounted = false;
      canvas?.removeEventListener('pointerdown', pointerDown);
      canvas?.removeEventListener('pointerup', pointerUp);
      canvas = null;
      [structure, stock, route, vehicle].forEach(dispose);
      maps.clear();
      captions.length = 0;
    },
  });
  function dispose(group: THREE.Group) {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    group.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Sprite
      ) {
        if ('geometry' in object) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          materials.add(material);
          const map = (material as THREE.MeshBasicMaterial).map;
          if (map) textures.add(map);
        }
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
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
    color: string
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function label(text: string, width = 2.1) {
    const image = document.createElement('canvas');
    image.width = 512;
    image.height = 128;
    const ctx = image.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#44746f';
    ctx.font = '600 56px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const map = new THREE.CanvasTexture(image);
    map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, depthTest: false, toneMapped: false })
    );
    sprite.scale.set(width, width / 4, 1);
    sprite.renderOrder = 5;
    return sprite;
  }
  function build() {
    box(structure, [25, 0.15, 25], [0, -0.1, 0.5], '#e2e9ed');
    for (const x of [-10, -5, 0, 5, 10]) box(structure, [1.1, 0.03, 17], [x, 0, 0], '#f8fafb');
    for (const z of [-8, 0, 8]) box(structure, [22, 0.035, 1.2], [0, 0.005, z], '#f8fafb');
    box(structure, [3.4, 0.035, 2.5], [0, 0.01, 10], '#a1c9ba');
    const dock = label('出入库作业区', 3);
    dock.position.set(0, 0.7, 11.5);
    structure.add(dock);
    for (const rack of RACKS) {
      for (const dx of [-1, 1])
        for (const dz of [-3, 3])
          box(structure, [0.12, 5.3, 0.12], [rack.x + dx, 2.65, rack.z + dz], '#6c8291');
      for (const y of [0.4, 1.9, 3.4]) {
        box(structure, [2.12, 0.09, 6.25], [rack.x, y, rack.z], '#c6d3da');
        for (const dx of [-1, 1])
          box(structure, [0.09, 0.19, 6.25], [rack.x + dx, y, rack.z], '#dba571');
      }
      const title = label(rack.id, 1.4);
      title.position.set(rack.x, 5.5, rack.z);
      structure.add(title);
      captions.push(title);
    }
    box(vehicle, [1.25, 0.35, 1.5], [0, 0.3, 0], '#e5b75b');
    box(vehicle, [0.8, 0.35, 0.65], [0, 0.63, -0.32], '#405e71');
    for (const x of [-0.5, 0.5])
      for (const z of [-0.5, 0.5]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.17, 0.1, 16),
          new THREE.MeshStandardMaterial({ color: '#394957' })
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.18, z);
        vehicle.add(wheel);
      }
    cargo = box(vehicle, [0.8, 0.55, 0.7], [0, 0.8, 0.4], '#82aaa3');
    cargo.visible = false;
    scene.value?.add(structure, stock, route, vehicle);
    redrawStock();
    redrawRoute();
    fitView();
  }
  function redrawStock() {
    if (!mounted) return;
    dispose(stock);
    maps.clear();
    for (const empty of [false, true]) {
      const bins = state.filteredBins.value.filter((b) => (b.quantity === 0) === empty);
      if (!bins.length) continue;
      const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ roughness: 0.8 }),
        bins.length
      );
      const dummy = new THREE.Object3D();
      bins.forEach((bin, index) => {
        dummy.position.set(bin.x, 0.4 + (bin.level - 1) * 1.5 + (empty ? 0.12 : 0.48), bin.z);
        dummy.scale.set(1.5, empty ? 0.15 : 0.86, 1.65);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.castShadow = !empty;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      maps.set(mesh, bins);
      stock.add(mesh);
    }
    updateColors();
  }
  function updateColors() {
    maps.forEach((bins, mesh) => {
      bins.forEach((bin, i) =>
        mesh.setColorAt(
          i,
          new THREE.Color(bin.id === state.selectedId.value ? '#55b5a2' : COLORS[stockStatus(bin)])
        )
      );
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }
  function redrawRoute() {
    if (!mounted) return;
    dispose(route);
    const points = state.job.value?.route;
    if (!points) return;
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(points[i - 1]![0], 0.13, points[i - 1]![1]),
        b = new THREE.Vector3(points[i]![0], 0.13, points[i]![1]);
      const d = b.clone().sub(a);
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, d.length(), 8),
        new THREE.MeshBasicMaterial({ color: '#208e80' })
      );
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      route.add(mesh);
    }
    const bin = state.bins.value.find((b) => b.id === state.job.value!.binId)!;
    const target = label(bin.id, 2.3);
    target.position.set(points.at(-1)![0], 1.3, points.at(-1)![1]);
    route.add(target);
  }
  function fitView(focus = false) {
    if (!mounted || !camera.value || !controls.value) return;
    const center =
      focus && state.selected.value
        ? new THREE.Vector3(
            state.selected.value.x,
            0.9 + (state.selected.value.level - 1) * 1.5,
            state.selected.value.z
          )
        : new THREE.Vector3(0, 1.5, 1);
    const aspect = renderer.value
      ? renderer.value.domElement.clientWidth / Math.max(renderer.value.domElement.clientHeight, 1)
      : 1;
    const scale = Math.max(1, 1 / aspect),
      radius = focus ? 7 : 31;
    camera.value.position
      .copy(center)
      .add(
        state.topView.value
          ? new THREE.Vector3(0, radius * scale * 1.2, 0.01)
          : new THREE.Vector3(radius * 0.65 * scale, radius * 0.75 * scale, radius * 0.85 * scale)
      );
    controls.value.target.copy(center);
    controls.value.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.value.minDistance = 3;
    controls.value.maxDistance = 120;
    controls.value.update();
  }
  function pointerDown(event: PointerEvent) {
    down.set(event.clientX, event.clientY);
  }
  function pointerUp(event: PointerEvent) {
    if (
      !canvas ||
      !camera.value ||
      event.button !== 0 ||
      down.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5
    )
      return;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1
      ),
      camera.value
    );
    scene.value?.updateMatrixWorld(true);
    const hit = raycaster.intersectObjects([structure, ...maps.keys()], true)[0];
    if (hit?.instanceId === undefined) return;
    const bin = maps.get(hit.object as THREE.InstancedMesh)?.[hit.instanceId];
    if (bin) state.select(bin);
  }
  function capture(): Promise<Blob | null> {
    if (!scene.value || !camera.value || !renderer.value) return Promise.resolve(null);
    renderer.value.render(scene.value, camera.value);
    return new Promise((resolve) => renderer.value!.domElement.toBlob(resolve, 'image/png'));
  }
  watch(state.filteredBins, redrawStock, { deep: true });
  watch(state.selectedId, updateColors);
  watch(state.job, redrawRoute);
  watch(state.topView, () => fitView());
  watch(state.labels, (value) => captions.forEach((label) => (label.visible = value)));
  onMounted(() => {
    mounted = true;
    build();
    canvas = renderer.value?.domElement ?? null;
    canvas?.addEventListener('pointerdown', pointerDown);
    canvas?.addEventListener('pointerup', pointerUp);
  });
  return { containerRef, fitView, capture };
}
