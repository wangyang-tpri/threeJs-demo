import { onMounted, watch, type Ref } from 'vue';
import * as THREE from 'three';
import { useThreeScene } from '@/hooks/useThreeScene';
import { continents, position, type City } from '../geo';
import type { GeoState } from './useGeoData';
export function useGeoScene(container: Ref<HTMLDivElement | null>, state: GeoState) {
  const root = new THREE.Group(),
    data = new THREE.Group(),
    grid = new THREE.Group();
  const markers: THREE.Mesh[] = [],
    labels: { sprite: THREE.Sprite; normal: THREE.Vector3 }[] = [],
    flows: { dot: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number }[] = [];
  let canvas: HTMLCanvasElement | undefined,
    down = [0, 0];
  function clean(group: THREE.Group) {
    group.traverse((o) => {
      const obj = o as THREE.Mesh;
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          const map = (m as THREE.MeshBasicMaterial).map;
          map?.dispose();
          m.dispose();
        }
      }
    });
    group.clear();
  }
  const api = useThreeScene(container, {
    background: 0x071526,
    grid: false,
    axes: false,
    lights: false,
    camera: { fov: 45, position: position(115, 30, 17), lookAt: [0, 0, 0] },
    onResize: (width, height) => {
      api.camera.value?.position.setLength(17 * Math.max(1, height / Math.max(1, width)));
    },
    animate: (_, time) => {
      if (api.controls.value) api.controls.value.autoRotate = state.rotating.value;
      for (const f of flows) f.dot.position.copy(f.curve.getPoint((time * 0.12 + f.offset) % 1));
      const eye = api.camera.value?.position;
      if (eye)
        for (const l of labels)
          l.sprite.visible = state.showLabels.value && l.normal.dot(eye) > 5.3;
    },
    onDispose: () => {
      canvas?.removeEventListener('pointerdown', pointerDown);
      canvas?.removeEventListener('pointerup', pick);
      clean(root);
    },
  });
  function line(points: THREE.Vector3[], color: number, group: THREE.Group, opacity = 1) {
    const o = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
    );
    group.add(o);
  }
  function build() {
    const map = document.createElement('canvas');
    map.width = 2048;
    map.height = 1024;
    const ctx = map.getContext('2d')!;
    ctx.fillStyle = '#0b2944';
    ctx.fillRect(0, 0, 2048, 1024);
    ctx.fillStyle = '#20556a';
    ctx.strokeStyle = '#469098';
    ctx.lineWidth = 2;
    for (const poly of continents) {
      ctx.beginPath();
      poly.forEach(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * 2048,
          y = ((90 - lat) / 180) * 1024;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(map);
    texture.colorSpace = THREE.SRGBColorSpace;
    // SphereGeometry 的 UV 与 position() 的经度方向一致。
    root.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(5, 96, 64),
        new THREE.MeshBasicMaterial({ map: texture })
      )
    );
    root.add(grid, data);
    api.scene.value?.add(root);
    for (let lat = -60; lat <= 60; lat += 30)
      line(
        Array.from(
          { length: 181 },
          (_, i) => new THREE.Vector3(...position(i * 2 - 180, lat, 5.015))
        ),
        0x37839a,
        grid,
        0.25
      );
    for (let lon = -180; lon < 180; lon += 30)
      line(
        Array.from(
          { length: 91 },
          (_, i) => new THREE.Vector3(...position(lon, i * 2 - 90, 5.015))
        ),
        0x37839a,
        grid,
        0.25
      );
    if (api.controls.value) {
      api.controls.value.minDistance = 7;
      api.controls.value.maxDistance = 70;
      api.controls.value.enablePan = false;
      api.controls.value.autoRotateSpeed = 0.5;
    }
    canvas = api.renderer.value?.domElement;
    canvas?.addEventListener('pointerdown', pointerDown);
    canvas?.addEventListener('pointerup', pick);
    refresh();
  }
  function refresh() {
    clean(data);
    markers.length = 0;
    labels.length = 0;
    flows.length = 0;
    grid.visible = state.showGrid.value;
    for (const city of state.filtered.value) {
      const normal = new THREE.Vector3(...position(city.lon, city.lat, 1)),
        ratio = city[state.metric.value] / state.max.value,
        chosen = city.id === state.selectedId.value;
      const color = chosen ? 0xffd380 : new THREE.Color().setHSL(0.51 - ratio * 0.12, 0.8, 0.55);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(chosen ? 0.11 : 0.075, 12, 8),
        new THREE.MeshBasicMaterial({ color })
      );
      marker.position.copy(normal).multiplyScalar(5.06);
      marker.userData.city = city.id;
      data.add(marker);
      markers.push(marker);
      const height = 0.12 + ratio * 0.7,
        bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.045, height, 8),
          new THREE.MeshBasicMaterial({ color })
        );
      bar.position.copy(normal).multiplyScalar(5.06 + height / 2);
      bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      data.add(bar);
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 256;
      labelCanvas.height = 64;
      const c = labelCanvas.getContext('2d')!;
      c.font = 'bold 28px sans-serif';
      c.textAlign = 'center';
      c.fillStyle = chosen ? '#ffdd94' : '#d4f8ff';
      c.fillText(city.name, 128, 42);
      const texture = new THREE.CanvasTexture(labelCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true }));
      sprite.position.copy(normal).multiplyScalar(5.35 + height);
      sprite.scale.set(1.2, 0.3, 1);
      data.add(sprite);
      labels.push({ sprite, normal });
      const source = state.selected.value;
      if (source && source.id !== city.id && state.showRoutes.value) {
        const a = new THREE.Vector3(...position(source.lon, source.lat, 1)),
          angle = a.angleTo(normal);
        const axis = new THREE.Vector3().crossVectors(a, normal);
        if (axis.lengthSq() < 1e-10) axis.crossVectors(a, new THREE.Vector3(0, 1, 0));
        if (axis.lengthSq() < 1e-10) axis.set(1, 0, 0);
        axis.normalize();
        const points = Array.from({ length: 65 }, (_, i) =>
          a
            .clone()
            .applyAxisAngle(axis, (angle * i) / 64)
            .multiplyScalar(5.07 + Math.sin((Math.PI * i) / 64) * (0.3 + angle * 0.7))
        );
        const curve = new THREE.CatmullRomCurve3(points);
        line(points, 0x37cfc0, data, 0.65);
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.045, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffdf9a })
        );
        dot.position.copy(points[0]!);
        data.add(dot);
        flows.push({ dot, curve, offset: flows.length * 0.071 });
      }
    }
  }
  function pointerDown(e: PointerEvent) {
    down = [e.clientX, e.clientY];
  }
  function pick(e: PointerEvent) {
    if (Math.hypot(e.clientX - down[0]!, e.clientY - down[1]!) > 5 || !canvas || !api.camera.value)
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
    const hits = ray.intersectObjects(root.children, true);
    for (const hit of hits) {
      if (hit.object.userData.city) {
        state.selectedId.value = hit.object.userData.city;
        break;
      }
      if (hit.object === root.children[0]) break;
    }
  }
  function focus(city?: City) {
    state.rotating.value = false;
    const rect = container.value?.getBoundingClientRect();
    const radius = 17 * Math.max(1, rect ? rect.height / Math.max(1, rect.width) : 1);
    api.camera.value?.position.set(...position(city?.lon ?? 115, city?.lat ?? 30, radius));
    api.controls.value?.target.set(0, 0, 0);
    api.camera.value?.lookAt(0, 0, 0);
    api.controls.value?.update();
  }
  async function capture(): Promise<Blob | null> {
    if (!api.renderer.value || !api.scene.value || !api.camera.value) return null;
    api.renderer.value.render(api.scene.value, api.camera.value);
    return new Promise((resolve) => api.renderer.value!.domElement.toBlob(resolve, 'image/png'));
  }
  onMounted(build);
  watch(
    [state.filtered, state.metric, state.selectedId, state.showGrid, state.showRoutes],
    refresh
  );
  watch(state.showLabels, () => {
    for (const l of labels) l.sprite.visible = state.showLabels.value;
  });
  return { focus, capture };
}
