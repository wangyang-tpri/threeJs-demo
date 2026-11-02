import * as THREE from 'three';
import { onMounted, ref, watch } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { CONNECTIONS, deviceStatus, STATUS_COLOR } from '../monitoring';
import type { useMonitoring } from './useMonitoring';
export function useMonitoringScene(state: ReturnType<typeof useMonitoring>) {
  const containerRef = ref<HTMLDivElement | null>(null),
    root = new THREE.Group();
  const groups = new Map<string, THREE.Group>(),
    surfaces = new Map<string, THREE.MeshStandardMaterial[]>(),
    captions: THREE.Sprite[] = [];
  const streams: { curve: THREE.Curve<THREE.Vector3>; dots: THREE.Mesh[]; length: number }[] = [];
  const raycaster = new THREE.Raycaster(),
    down = new THREE.Vector2();
  let mounted = false,
    canvas: HTMLCanvasElement | null = null;
  const { scene, camera, renderer, controls } = useThreeScene(containerRef, {
    background: 0xf0f5f8,
    grid: false,
    axes: false,
    camera: { fov: 43, position: [15, 14, 18] },
    controls: { target: [0, 1, 0] },
    lights: { ambient: 1.7, directional: 2.7, dirPosition: [6, 15, 9] },
    shadow: { enabled: true, mapSize: 2048, cameraBounds: 20 },
    animate: (delta) => {
      state.advance(delta);
      streams.forEach((stream) =>
        stream.dots.forEach((dot, i) => {
          dot.visible = state.circulating.value;
          dot.position.copy(
            stream.curve.getPoint(
              ((state.clock.value * 1.2) / stream.length + i / stream.dots.length) % 1
            )
          );
        })
      );
    },
    onResize: () => fitView(),
    onDispose: () => {
      mounted = false;
      canvas?.removeEventListener('pointerdown', pointerDown);
      canvas?.removeEventListener('pointerup', pointerUp);
      canvas = null;
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>(),
        textures = new Set<THREE.Texture>();
      root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          if (object instanceof THREE.Mesh) geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            materials.add(material);
            const map = (material as THREE.MeshBasicMaterial).map;
            if (map) textures.add(map);
          }
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      root.clear();
      groups.clear();
      surfaces.clear();
      streams.length = 0;
      captions.length = 0;
    },
  });
  function add(
    group: THREE.Group,
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    color: string,
    id?: string
  ) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.3 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (id) {
      mesh.userData.deviceId = id;
      surfaces.get(id)!.push(material);
    }
    group.add(mesh);
    return mesh;
  }
  function box(
    group: THREE.Group,
    size: [number, number, number],
    position: [number, number, number],
    color: string,
    id?: string
  ) {
    return add(group, new THREE.BoxGeometry(...size), position, color, id);
  }
  function caption(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = '#387a70';
    ctx.font = '600 70px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 64);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, depthTest: false, toneMapped: false })
    );
    sprite.scale.set(3.2, 0.53, 1);
    sprite.renderOrder = 8;
    return sprite;
  }
  function build() {
    box(root, [22, 0.15, 15], [0, -0.12, 0], '#dfe8ed');
    for (const device of state.devices.value) {
      const group = new THREE.Group();
      group.position.set(device.position[0], 0, device.position[1]);
      groups.set(device.id, group);
      surfaces.set(device.id, []);
      root.add(group);
      box(group, [device.kind === 'tank' ? 2.7 : 2.4, 0.15, 2.1], [0, 0.1, 0], '#bdced7');
      let height = 2.7;
      if (device.kind === 'tank') {
        add(
          group,
          new THREE.CylinderGeometry(1.05, 1.05, 3.2, 48),
          [0, 2, 0],
          '#81aaa8',
          device.id
        );
        add(
          group,
          new THREE.SphereGeometry(1.04, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          [0, 3.6, 0],
          '#81aaa8',
          device.id
        );
        for (const y of [0.5, 3.4]) {
          const ring = add(
            group,
            new THREE.TorusGeometry(1.08, 0.055, 8, 48),
            [0, y, 0],
            '#c5d9df',
            device.id
          );
          ring.rotation.x = Math.PI / 2;
        }
        height = 5;
      } else if (device.kind === 'pump') {
        const motor = add(
          group,
          new THREE.CylinderGeometry(0.65, 0.65, 1.45, 32),
          [0, 1.05, 0],
          '#81aaa8',
          device.id
        );
        motor.rotation.z = Math.PI / 2;
        box(group, [1.55, 0.25, 1.0], [0, 0.38, 0], '#557b89', device.id);
        box(group, [0.5, 0.45, 0.65], [0, 1.75, 0], '#81aaa8', device.id);
      } else if (device.kind === 'exchanger') {
        box(group, [2.1, 2.4, 1.25], [0, 1.5, 0], '#81aaa8', device.id);
        for (let i = 0; i < 10; i++)
          box(group, [0.055, 2.2, 1.45], [-0.9 + i * 0.2, 1.5, 0], '#b7ccd6', device.id);
        height = 3.5;
      } else {
        const valve = add(
          group,
          new THREE.CylinderGeometry(0.45, 0.45, 1.3, 32),
          [0, 1.1, 0],
          '#81aaa8',
          device.id
        );
        valve.rotation.z = Math.PI / 2;
        add(
          group,
          new THREE.CylinderGeometry(0.09, 0.09, 0.9, 16),
          [0, 1.7, 0],
          '#9fbbc5',
          device.id
        );
        const wheel = add(
          group,
          new THREE.TorusGeometry(0.55, 0.09, 12, 36),
          [0, 2.15, 0],
          '#d5ad72',
          device.id
        );
        wheel.rotation.x = Math.PI / 2;
        box(group, [1.0, 0.06, 0.06], [0, 2.15, 0], '#d5ad72', device.id);
      }
      const title = caption(`${device.id} ${device.name}`);
      title.position.set(0, height, 0);
      group.add(title);
      captions.push(title);
    }
    const dotGeometry = new THREE.SphereGeometry(0.13, 10, 8),
      dotMaterial = new THREE.MeshBasicMaterial({ color: '#ffd489' });
    for (const [from, to] of CONNECTIONS) {
      const a = state.devices.value.find((d) => d.id === from)!.position,
        b = state.devices.value.find((d) => d.id === to)!.position;
      const points = [
        new THREE.Vector3(a[0], 1.1, a[1]),
        new THREE.Vector3(b[0], 1.1, a[1]),
        new THREE.Vector3(b[0], 1.1, b[1]),
      ].filter((p, i, array) => !i || p.distanceTo(array[i - 1]!) > 0.001);
      const curve: THREE.Curve<THREE.Vector3> =
        points.length === 2
          ? new THREE.LineCurve3(points[0]!, points[1]!)
          : new THREE.CatmullRomCurve3(points);
      const pipe = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.12, 8, false),
        new THREE.MeshStandardMaterial({ color: '#96b8c5', metalness: 0.55, roughness: 0.4 })
      );
      pipe.castShadow = true;
      root.add(pipe);
      const dots = Array.from({ length: 7 }, () => {
        const mesh = new THREE.Mesh(dotGeometry, dotMaterial);
        root.add(mesh);
        return mesh;
      });
      streams.push({ curve, dots, length: curve.getLength() });
    }
    scene.value?.add(root);
    updateColors();
    fitView();
  }
  function updateColors() {
    state.devices.value.forEach((device) =>
      surfaces.get(device.id)?.forEach((material) => {
        material.color.set(STATUS_COLOR[deviceStatus(device)]);
        material.emissive.set(device.id === state.selectedId.value ? '#235f4e' : '#000000');
        material.emissiveIntensity = 0.3;
      })
    );
  }
  function fitView(focus = false) {
    if (!mounted || !camera.value || !controls.value) return;
    const center = focus
      ? new THREE.Vector3(state.selected.value.position[0], 1.5, state.selected.value.position[1])
      : new THREE.Vector3(0, 1.3, 0);
    const aspect = renderer.value
        ? renderer.value.domElement.clientWidth /
          Math.max(renderer.value.domElement.clientHeight, 1)
        : 1,
      distance = (focus ? 6 : 20) * Math.max(1, 1 / aspect);
    camera.value.position
      .copy(center)
      .add(
        state.topView.value
          ? new THREE.Vector3(0, distance * 1.3, 0.01)
          : new THREE.Vector3(distance * 0.65, distance * 0.85, distance)
      );
    controls.value.target.copy(center);
    controls.value.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.value.minDistance = 2;
    controls.value.maxDistance = 90;
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
    const hit = raycaster
      .intersectObjects([...groups.values()], true)
      .find((hit) => hit.object instanceof THREE.Mesh && hit.object.userData.deviceId);
    if (hit) state.select(hit.object.userData.deviceId);
  }
  function capture(): Promise<Blob | null> {
    if (!scene.value || !camera.value || !renderer.value) return Promise.resolve(null);
    renderer.value.render(scene.value, camera.value);
    return new Promise((resolve) => renderer.value!.domElement.toBlob(resolve, 'image/png'));
  }
  watch(
    () => state.devices.value.map((d) => [d.running, ...Object.values(d.reading)]),
    updateColors,
    { deep: true }
  );
  watch(state.selectedId, updateColors);
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
