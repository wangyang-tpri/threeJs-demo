import * as THREE from 'three';
import { onMounted, watch, type Ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { buildings, patrolPath, routePoint, pathLength } from '../campus';
import type { CampusState } from './useCampus';
export function useCampusScene(container: Ref<HTMLDivElement | null>, state: CampusState) {
  const root = new THREE.Group(),
    route = new THREE.Group(),
    sensors = new THREE.Group(),
    labels = new THREE.Group(),
    patrol = new THREE.Group();
  const meshes = new Map<
    string,
    {
      group: THREE.Group;
      material: THREE.MeshStandardMaterial;
      outline: THREE.LineSegments;
      label: THREE.Sprite;
    }
  >();
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  let canvas: HTMLCanvasElement | undefined,
    down = [0, 0];
  const api = useThreeScene(container, {
    background: 0xe8f0f3,
    grid: false,
    axes: false,
    camera: { fov: 45, position: [52, 52, 62], lookAt: [0, 3, 0] },
    controls: { target: [0, 3, 0] },
    lights: { ambient: 1.6, directional: 2, dirPosition: [20, 50, 25] },
    shadow: { enabled: true, mapSize: 2048, cameraBounds: 40 },
    onResize: () => fit(),
    animate: (delta) => {
      if (state.patrolPlaying.value)
        state.patrolDistance.value =
          (state.patrolDistance.value + Math.min(delta, 0.1) * 6) % pathLength;
      const p = routePoint(state.patrolDistance.value),
        next = routePoint(state.patrolDistance.value + 0.2);
      patrol.position.set(p[0], 0.35, p[1]);
      patrol.rotation.y = Math.atan2(next[0] - p[0], next[1] - p[1]);
    },
    onDispose: () => {
      canvas?.removeEventListener('pointerdown', pointerDown);
      canvas?.removeEventListener('pointerup', pick);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      root.clear();
      meshes.clear();
    },
  });
  function mat(color: string) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
    materials.add(m);
    return m;
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  geometries.add(box);
  function cube(
    parent: THREE.Group,
    size: [number, number, number],
    pos: [number, number, number],
    material: THREE.Material
  ) {
    const mesh = new THREE.Mesh(box, material);
    mesh.scale.set(...size);
    mesh.position.set(...pos);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function label(text: string) {
    const image = document.createElement('canvas');
    image.width = 512;
    image.height = 128;
    const ctx = image.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    ctx.roundRect(3, 3, 506, 122, 20);
    ctx.fill();
    ctx.fillStyle = '#254d61';
    ctx.font = 'bold 42px Microsoft YaHei,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64, 490);
    const map = new THREE.CanvasTexture(image);
    map.colorSpace = THREE.SRGBColorSpace;
    textures.add(map);
    const m = new THREE.SpriteMaterial({ map, depthTest: false });
    materials.add(m);
    const sprite = new THREE.Sprite(m);
    sprite.scale.set(10, 2.5, 1);
    return sprite;
  }
  function build() {
    api.scene.value?.add(root);
    root.add(route, sensors, labels, patrol);
    cube(root, [60, 0.4, 52], [0, -0.3, 0], mat('#97b6a1'));
    cube(root, [54, 0.15, 46], [0, -0.05, 0], mat('#cbd9ce'));
    const road = mat('#6b7d87'),
      mark = mat('#dfe8e7');
    for (const z of [-20, 0, 20]) {
      cube(root, [51, 0.12, 3.4], [0, 0.04, z], road);
      for (let x = -23; x < 24; x += 4) cube(root, [1.7, 0.02, 0.12], [x, 0.11, z], mark);
    }
    for (const x of [-24, -7.5, 7.5, 24]) cube(root, [3.4, 0.12, 42], [x, 0.04, 0], road);
    const windows = mat('#93cbd9');
    windows.emissive.set('#356e85');
    windows.emissiveIntensity = 0.15;
    for (const b of buildings) {
      const group = new THREE.Group();
      group.position.set(b.x, 0, b.z);
      group.userData.buildingId = b.id;
      root.add(group);
      const material = mat('#8caec3'),
        height = b.floors * 1.25;
      cube(group, [b.width + 0.8, 0.3, b.depth + 0.8], [0, 0.2, 0], mat('#e2e8e4'));
      for (let floor = 0; floor < b.floors; floor++) {
        const wall = cube(group, [b.width, 1.12, b.depth], [0, 0.9 + floor * 1.25, 0], material);
        wall.userData.buildingId = b.id;
        for (const z of [-b.depth / 2 - 0.025, b.depth / 2 + 0.025]) {
          const pane = cube(group, [b.width - 0.8, 0.5, 0.04], [0, 1 + floor * 1.25, z], windows);
          pane.userData.buildingId = b.id;
        }
      }
      const roof = cube(
        group,
        [b.width + 0.3, 0.25, b.depth + 0.3],
        [0, height + 0.55, 0],
        material
      );
      roof.userData.buildingId = b.id;
      cube(group, [2, 0.6, 1.6], [1, height + 0.9, 0], mat('#6b8794'));
      const edge = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(b.width + 0.7, height + 0.9, b.depth + 0.7)
      );
      geometries.add(edge);
      const edgeMat = new THREE.LineBasicMaterial({ color: '#efac54' });
      materials.add(edgeMat);
      const outline = new THREE.LineSegments(edge, edgeMat);
      outline.position.set(0, (height + 0.9) / 2, 0);
      group.add(outline);
      const sprite = label(`${b.id} ${b.name}`);
      sprite.position.set(b.x, height + 3, b.z);
      labels.add(sprite);
      meshes.set(b.id, { group, material, outline, label: sprite });
      const sensor = cube(
        sensors,
        [0.5, 1.6, 0.5],
        [b.x - b.width / 2 - 1.2, 0.8, b.z],
        mat('#33bea0')
      );
      sensor.userData.buildingId = b.id;
    }
    const treeMaterial = mat('#629479'),
      trunk = mat('#947b61');
    for (const x of [-28, 28])
      for (let z = -22; z <= 22; z += 5) {
        cube(root, [0.25, 1.4, 0.25], [x, 0.7, z], trunk);
        cube(root, [1.4, 1.6, 1.4], [x, 1.8, z], treeMaterial);
      }
    const geo = new THREE.BufferGeometry().setFromPoints(
      patrolPath.map(([x, z]) => new THREE.Vector3(x, 0.22, z))
    );
    geometries.add(geo);
    const lm = new THREE.LineDashedMaterial({ color: '#f2bc52', dashSize: 1, gapSize: 0.5 });
    materials.add(lm);
    const line = new THREE.Line(geo, lm);
    line.computeLineDistances();
    route.add(line);
    cube(patrol, [1, 1, 1.6], [0, 0.35, 0], mat('#e6a348'));
    cube(patrol, [0.8, 0.45, 0.8], [0, 1, 0], mat('#fff3cd'));
    if (api.controls.value) {
      api.controls.value.maxPolarAngle = Math.PI / 2 - 0.05;
      api.controls.value.minDistance = 15;
      api.controls.value.maxDistance = 250;
    }
    canvas = api.renderer.value?.domElement;
    canvas?.addEventListener('pointerdown', pointerDown);
    canvas?.addEventListener('pointerup', pick);
    update();
    fit();
  }
  function update() {
    for (const b of buildings) {
      const o = meshes.get(b.id);
      if (!o) continue;
      const visible = state.filtered.value.some((item) => item.id === b.id),
        fault = state.faultIds.value.includes(b.id),
        power = state.readings.value[b.id]!.power;
      const color =
        state.lens.value === 'energy'
          ? new THREE.Color().setHSL(0.52 - Math.min(1, power / 450) * 0.5, 0.55, 0.52)
          : new THREE.Color(
              fault ? '#db7c72' : state.lens.value === 'safety' ? '#68bca3' : '#8caec3'
            );
      o.material.color.copy(color);
      o.material.emissive.copy(color).multiplyScalar(state.night.value ? 0.18 : 0);
      o.group.visible = visible;
      o.outline.visible = b.id === state.selectedId.value;
      o.label.visible = visible && state.labels.value;
    }
    for (const sensor of sensors.children) {
      const id = sensor.userData.buildingId;
      sensor.visible = state.filtered.value.some((b) => b.id === id);
      (sensor as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color.set(
        state.faultIds.value.includes(id) ? '#ed6b65' : '#33bea0'
      );
    }
    sensors.visible = state.devices.value;
    route.visible = patrol.visible = state.showRoute.value;
    if (api.scene.value?.background instanceof THREE.Color)
      api.scene.value.background.set(state.night.value ? 0x111e32 : 0xe8f0f3);
    api.scene.value?.traverse((o) => {
      if (o instanceof THREE.AmbientLight) o.intensity = state.night.value ? 0.55 : 1.6;
      if (o instanceof THREE.DirectionalLight) o.intensity = state.night.value ? 0.8 : 2;
    });
  }
  function fit(selected = false, top = false) {
    if (!api.camera.value || !api.controls.value) return;
    const aspect =
        (container.value?.clientWidth ?? 1) / Math.max(1, container.value?.clientHeight ?? 1),
      scale = Math.max(1, 1 / aspect);
    const b = state.selected.value,
      c = selected ? new THREE.Vector3(b.x, b.floors * 0.6, b.z) : new THREE.Vector3(0, 3, 0);
    api.controls.value.target.copy(c);
    api.camera.value.position
      .copy(c)
      .add(
        top
          ? new THREE.Vector3(0, 75 * scale, 0.01)
          : new THREE.Vector3(1, 0.95, 1.2).multiplyScalar((selected ? 20 : 52) * scale)
      );
    api.camera.value.lookAt(c);
    api.controls.value.update();
  }
  function pointerDown(e: PointerEvent) {
    down = [e.clientX, e.clientY];
  }
  function pick(e: PointerEvent) {
    if (
      e.button !== 0 ||
      !canvas ||
      !api.camera.value ||
      Math.hypot(e.clientX - down[0]!, e.clientY - down[1]!) > 5
    )
      return;
    const rect = canvas.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1
      ),
      api.camera.value
    );
    root.updateMatrixWorld(true);
    const targets = [...meshes.values()].filter((o) => o.group.visible).map((o) => o.group);
    const hit = ray.intersectObjects(targets, true).find((h) => h.object.userData.buildingId);
    if (hit) state.selectedId.value = hit.object.userData.buildingId;
  }
  async function capture(): Promise<Blob | null> {
    if (!api.renderer.value || !api.scene.value || !api.camera.value) return null;
    api.renderer.value.render(api.scene.value, api.camera.value);
    return new Promise((resolve) => api.renderer.value!.domElement.toBlob(resolve, 'image/png'));
  }
  watch(
    [
      state.filtered,
      state.selectedId,
      state.lens,
      state.night,
      state.labels,
      state.devices,
      state.showRoute,
      state.readings,
    ],
    update
  );
  onMounted(build);
  return { fit, capture };
}
