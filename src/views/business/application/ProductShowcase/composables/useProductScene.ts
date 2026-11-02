import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { onMounted, ref, watch, type Ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { PARTS, type PartId, type ViewPreset } from '../product';

export interface SceneState {
  selectedId: Ref<PartId | null>;
  hiddenIds: Ref<PartId[]>;
  isolated: Ref<boolean>;
  explode: Ref<number>;
  finish: Ref<string>;
  roughness: Ref<number>;
  autoRotate: Ref<boolean>;
  labels: Ref<boolean>;
  wireframe: Ref<boolean>;
  theme: Ref<'light' | 'dark'>;
  preset: Ref<ViewPreset>;
}
export function useProductScene(
  state: SceneState,
  onSelect: (id: PartId | null) => void,
  onAdvance: (delta: number) => void
) {
  const containerRef = ref<HTMLDivElement | null>(null);
  const product = new THREE.Group(),
    stage = new THREE.Group();
  const groups = new Map<PartId, THREE.Group>();
  const sprites = new Map<PartId, THREE.Sprite>();
  const coloredMaterials: THREE.MeshStandardMaterial[] = [];
  const partMeshes = new Map<PartId, THREE.Mesh[]>();
  const labelPositions: Record<PartId, [number, number, number]> = {
    body: [1.7, 2.95, 0.15],
    front: [0.8, 3.05, 0.6],
    lens: [-0.35, 2.75, 1.8],
    sensor: [-1.15, 3.15, 0.3],
    board: [0.6, 2.85, -0.3],
    battery: [-1.13, 2.5, 0.2],
    screen: [1.1, 2.9, -0.85],
  };
  let progress = 0,
    mounted = false,
    canvas: HTMLCanvasElement | null = null;
  let down = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const { scene, camera, controls, renderer } = useThreeScene(containerRef, {
    background: 0xf0f4f7,
    axes: false,
    grid: false,
    camera: { fov: 38, position: [6, 4.5, 8] },
    controls: { target: [0, 1.5, 0] },
    lights: { ambient: 1.9, directional: 3.3, dirPosition: [6, 9, 7] },
    shadow: { enabled: true, mapSize: 2048, cameraBounds: 12 },
    animate: (delta) => {
      onAdvance(delta);
      progress = THREE.MathUtils.damp(progress, state.explode.value / 100, 9, Math.min(delta, 0.1));
      updatePositions();
    },
    onResize: () => fitView(),
    onDispose: () => {
      mounted = false;
      canvas?.removeEventListener('pointerdown', pointerDown);
      canvas?.removeEventListener('pointerup', pointerUp);
      canvas = null;
      dispose(product);
      dispose(stage);
      groups.clear();
      sprites.clear();
      partMeshes.clear();
      coloredMaterials.length = 0;
    },
  });
  function dispose(root: THREE.Group) {
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
          const map = (material as THREE.MeshStandardMaterial).map;
          if (map) textures.add(map);
        }
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    root.clear();
  }
  function mesh(
    id: PartId,
    geometry: THREE.BufferGeometry,
    color: string,
    position: [number, number, number],
    metalness = 0.1,
    coat = false
  ) {
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness: coat ? state.roughness.value : 0.45,
    });
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.partId = id;
    groups.get(id)!.add(object);
    partMeshes.get(id)!.push(object);
    if (coat) coloredMaterials.push(material);
    return object;
  }
  function box(
    id: PartId,
    size: [number, number, number],
    pos: [number, number, number],
    color: string,
    coat = false
  ) {
    return mesh(
      id,
      new RoundedBoxGeometry(...size, 3, Math.min(...size) * 0.12),
      color,
      pos,
      coat ? 0.6 : 0.15,
      coat
    );
  }
  function cylinder(
    id: PartId,
    radius: number,
    depth: number,
    pos: [number, number, number],
    color: string,
    metalness = 0.65
  ) {
    const object = mesh(
      id,
      new THREE.CylinderGeometry(radius, radius, depth, 64),
      color,
      pos,
      metalness
    );
    object.rotation.x = Math.PI / 2;
    return object;
  }
  function label(text: string) {
    const image = document.createElement('canvas');
    image.width = 512;
    image.height = 128;
    const ctx = image.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 120, 20);
    ctx.fill();
    ctx.fillStyle = '#36766f';
    ctx.font = '600 52px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const map = new THREE.CanvasTexture(image);
    map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, depthTest: false, toneMapped: false })
    );
    sprite.scale.set(1.6, 0.4, 1);
    sprite.renderOrder = 10;
    return sprite;
  }
  function build() {
    for (const part of PARTS) {
      const group = new THREE.Group();
      group.userData.partId = part.id;
      groups.set(part.id, group);
      partMeshes.set(part.id, []);
      product.add(group);
    }
    box('body', [3.2, 1.95, 0.8], [0, 1.55, 0], state.finish.value, true);
    box('body', [0.62, 1.8, 1.05], [1.3, 1.5, 0.2], '#252d36');
    box('body', [0.7, 0.27, 0.65], [-0.4, 2.66, 0], state.finish.value, true);
    const shutter = mesh(
      'body',
      new THREE.CylinderGeometry(0.15, 0.15, 0.08, 32),
      '#b4c6cc',
      [1.1, 2.58, 0.15],
      0.9
    );
    shutter.rotation.y = 0.2;
    box('front', [3.05, 1.8, 0.16], [0, 1.55, 0.51], state.finish.value, true);
    cylinder('front', 0.9, 0.14, [-0.35, 1.6, 0.65], '#b7bec4');
    cylinder('lens', 0.76, 0.85, [-0.35, 1.6, 1.15], '#293440');
    for (let i = 0; i < 6; i++)
      cylinder('lens', 0.79, 0.045, [-0.35, 1.6, 0.84 + i * 0.105], '#424c58');
    cylinder('lens', 0.79, 0.1, [-0.35, 1.6, 1.63], '#c4cacf');
    cylinder('lens', 0.68, 0.08, [-0.35, 1.6, 1.7], '#121d2a');
    const glass = cylinder('lens', 0.58, 0.028, [-0.35, 1.6, 1.75], '#235b77', 0.85);
    (glass.material as THREE.MeshStandardMaterial).roughness = 0.07;
    cylinder('lens', 0.25, 0.012, [-0.35, 1.6, 1.78], '#132a40');
    box('sensor', [1.3, 1.15, 0.1], [-0.35, 1.6, 0.28], '#c7ae72');
    box('sensor', [0.92, 0.76, 0.05], [-0.35, 1.6, 0.36], '#31517b');
    box('board', [2.35, 1.5, 0.08], [-0.15, 1.55, -0.22], '#347a5f');
    for (const [x, y, w] of [
      [-0.4, 1.65, 0.55],
      [0.45, 1.8, 0.42],
      [-0.75, 1.1, 0.25],
      [0.6, 1.1, 0.32],
    ])
      box('board', [w!, 0.28, 0.12], [x!, y!, -0.3], '#293846');
    for (let i = 0; i < 8; i++)
      box('board', [0.1, 0.17, 0.09], [-1.05 + i * 0.25, 2.13, -0.28], '#c5ae72');
    box('battery', [0.65, 1.2, 0.45], [-1.13, 1.35, -0.06], '#47596c');
    for (let i = 0; i < 3; i++)
      box('battery', [0.1, 0.06, 0.16], [-1.33 + i * 0.17, 1.98, -0.03], '#cbb77a');
    box('screen', [3.05, 1.8, 0.16], [0, 1.55, -0.52], state.finish.value, true);
    box('screen', [2.25, 1.38, 0.07], [-0.18, 1.55, -0.66], '#132434');
    const display = box('screen', [2.05, 1.18, 0.012], [-0.18, 1.55, -0.71], '#3e8390');
    (display.material as THREE.MeshStandardMaterial).emissive.set('#123b43');
    for (const y of [1.08, 1.45, 1.82]) cylinder('screen', 0.07, 0.035, [1.2, y, -0.65], '#9eaeb9');
    for (const part of PARTS) {
      const sprite = label(part.name);
      sprites.set(part.id, sprite);
      groups.get(part.id)!.add(sprite);
    }
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.3, 0.12, 96),
      new THREE.MeshStandardMaterial({ color: '#dde5eb', roughness: 0.85 })
    );
    platform.position.y = 0.14;
    platform.receiveShadow = true;
    stage.add(platform);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: '#edf2f5', roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    stage.add(floor);
    scene.value?.add(product, stage, new THREE.HemisphereLight('#d7edff', '#8d969a', 1.3));
    renderer.value!.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.value!.toneMappingExposure = 1.15;
    updateMaterials();
    updateVisibility();
    updatePositions();
    fitView();
  }
  function updatePositions() {
    PARTS.forEach((part) => {
      groups
        .get(part.id)
        ?.position.set(
          part.offset[0] * progress,
          part.offset[1] * progress,
          part.offset[2] * progress
        );
      const sprite = sprites.get(part.id);
      if (!sprite) return;
      sprite.visible = state.labels.value && (progress > 0.25 || state.isolated.value);
      sprite.position.set(...labelPositions[part.id]);
    });
  }
  function updateVisibility() {
    groups.forEach((group, id) => {
      group.visible =
        !state.hiddenIds.value.includes(id) &&
        (!state.isolated.value || state.selectedId.value === id);
    });
  }
  function updateMaterials() {
    coloredMaterials.forEach((material) => {
      material.color.set(state.finish.value);
      material.roughness = state.roughness.value;
    });
    partMeshes.forEach((meshes, id) =>
      meshes.forEach((object) => {
        const material = object.material as THREE.MeshStandardMaterial;
        material.wireframe = state.wireframe.value;
        material.emissive.set(id === state.selectedId.value ? '#4d967e' : '#000000');
        material.emissiveIntensity = 0.4;
      })
    );
  }
  function updateTheme() {
    const dark = state.theme.value === 'dark';
    if (scene.value) scene.value.background = new THREE.Color(dark ? '#18252f' : '#f0f4f7');
    stage.traverse((object) => {
      if (object instanceof THREE.Mesh)
        (object.material as THREE.MeshStandardMaterial).color.set(
          dark ? '#253641' : object.geometry instanceof THREE.PlaneGeometry ? '#edf2f5' : '#dde5eb'
        );
    });
  }
  function fitView(focus = false) {
    if (!mounted || !camera.value || !controls.value) return;
    const center = new THREE.Vector3(0, 1.6, state.explode.value > 1 ? 0.2 : 0.4);
    let radius = state.explode.value > 1 ? 5.2 : 2.7;
    if (focus && state.selectedId.value) {
      const group = groups.get(state.selectedId.value)!;
      product.updateMatrixWorld(true);
      const bounds = new THREE.Box3();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) bounds.expandByObject(object);
      });
      bounds.getCenter(center);
      radius = Math.max(bounds.getSize(new THREE.Vector3()).length() * 0.6, 2);
    }
    const aspect = renderer.value
      ? renderer.value.domElement.clientWidth / Math.max(renderer.value.domElement.clientHeight, 1)
      : 1;
    const distance = (radius / Math.sin((19 * Math.PI) / 180)) * Math.max(1, 1 / aspect) * 1.1;
    const direction =
      state.preset.value === 'front'
        ? new THREE.Vector3(0, 0.05, 1)
        : state.preset.value === 'back'
          ? new THREE.Vector3(0, 0.05, -1)
          : state.preset.value === 'top'
            ? new THREE.Vector3(0, 1, 0.001)
            : new THREE.Vector3(0.6, 0.38, 0.8);
    camera.value.position.copy(center).add(direction.normalize().multiplyScalar(distance));
    controls.value.target.copy(center);
    controls.value.autoRotate = state.autoRotate.value;
    controls.value.autoRotateSpeed = 0.8;
    controls.value.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.value.minDistance = 1;
    controls.value.maxDistance = 60;
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
    product.updateMatrixWorld(true);
    const objects = [...partMeshes.entries()]
      .filter(([id]) => groups.get(id)?.visible)
      .flatMap(([, objects]) => objects);
    const hit = raycaster.intersectObjects(objects, false)[0];
    onSelect(hit?.object.userData.partId ?? null);
  }
  function capture(): Promise<Blob | null> {
    if (!renderer.value || !scene.value || !camera.value) return Promise.resolve(null);
    renderer.value.render(scene.value, camera.value);
    return new Promise((resolve) => renderer.value!.domElement.toBlob(resolve, 'image/png'));
  }
  watch([state.selectedId, state.finish, state.roughness, state.wireframe], updateMaterials);
  watch([state.hiddenIds, state.isolated, state.selectedId], updateVisibility, { deep: true });
  watch(state.theme, updateTheme);
  watch(state.preset, () => fitView());
  watch(
    () => state.explode.value > 1,
    () => fitView()
  );
  watch(state.autoRotate, (value) => {
    if (controls.value) controls.value.autoRotate = value;
  });
  onMounted(() => {
    mounted = true;
    build();
    updateTheme();
    canvas = renderer.value?.domElement ?? null;
    canvas?.addEventListener('pointerdown', pointerDown);
    canvas?.addEventListener('pointerup', pointerUp);
  });
  return { containerRef, fitView, capture };
}
