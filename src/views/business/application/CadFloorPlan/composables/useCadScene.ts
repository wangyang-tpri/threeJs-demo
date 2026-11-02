import * as THREE from 'three';
import { onMounted, ref, watch, type Ref } from 'vue';
import { useThreeScene } from '@/hooks/useThreeScene';
import { getBounds, segmentLength, type Point, type Segment } from '../dxf';
import type { Measurement, ModelSettings, ViewMode, ViewPreset } from '../types';

import type { InteriorState } from './useInteriorDesign';
import { buildInterior } from './buildInterior';

const PALETTE = ['#188a80', '#6486c5', '#ad84c7', '#d7a254', '#719b66', '#bd7a80'];
interface CadSceneOptions {
  interior: InteriorState;
  segments: Ref<Segment[]>;
  mode: Ref<ViewMode>;
  preset: Ref<ViewPreset>;
  settings: ModelSettings;
  selectedId: Ref<string | null>;
  measuring: Ref<boolean>;
  measureStart: Ref<Point | null>;
  measurements: Ref<Measurement[]>;
  onSelect: (id: string | null) => void;
  onMeasure: (point: Point) => void;
}

/** 建模、视角、拾取和测量独立管理；场景更新时及时释放 GPU 资源。 */
export function useCadScene(options: CadSceneOptions) {
  const { segments, mode, preset, settings, selectedId, measuring, measureStart, measurements } =
    options;
  const containerRef = ref<HTMLDivElement | null>(null);
  const model = new THREE.Group(),
    annotations = new THREE.Group(),
    interiorGroup = new THREE.Group();
  let walls: THREE.InstancedMesh | null = null;
  let lines: THREE.LineSegments | null = null;
  let mounted = false;
  let canvas: HTMLCanvasElement | null = null;
  let layerIndices = new Map<string, number>();
  let pointerStart = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const { scene, camera, controls, renderer } = useThreeScene(containerRef, {
    background: 0xf2f6f8,
    grid: false,
    axes: false,
    camera: { fov: 45, near: 0.01, far: 10000, position: [12, 15, 16] },
    lights: { ambient: 1.3, directional: 2, dirPosition: [8, 20, 12] },
    shadow: { enabled: true, mapSize: 2048, cameraBounds: 30 },
    onResize: () => fitView(),
    onDispose: () => {
      mounted = false;
      canvas?.removeEventListener('pointerdown', onPointerDown);
      canvas?.removeEventListener('pointerup', onPointerUp);
      canvas = null;
      release(model);
      release(annotations);
      release(interiorGroup);
      walls = null;
      lines = null;
    },
  });
  function release(group: THREE.Group) {
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
  function point(p: Point, y = 0.03) {
    return new THREE.Vector3(p[0], y, -p[1]);
  }
  function span() {
    const b = getBounds(segments.value);
    return Math.max(b.width, b.depth, 0.5);
  }
  function layerColor(segment: Segment) {
    return PALETTE[(layerIndices.get(segment.layer) ?? 0) % PALETTE.length]!;
  }
  function color(segment: Segment) {
    if (segment.id === selectedId.value) return new THREE.Color('#ef9a50');
    const base = new THREE.Color(
      settings.colorByLayer
        ? layerColor(segment)
        : mode.value === '2d'
          ? '#188a80'
          : settings.wallColor
    );
    return mode.value === '3d' && settings.colorByLayer
      ? base.lerp(new THREE.Color(settings.wallColor), 0.7)
      : base;
  }
  function updateSelection() {
    if (walls) {
      segments.value.forEach((s, i) => walls!.setColorAt(i, color(s)));
      if (walls.instanceColor) walls.instanceColor.needsUpdate = true;
    }
    if (lines) {
      const attribute = lines.geometry.getAttribute('color') as THREE.BufferAttribute;
      segments.value.forEach((s, i) => {
        const c = color(s);
        attribute.setXYZ(i * 2, c.r, c.g, c.b);
        attribute.setXYZ(i * 2 + 1, c.r, c.g, c.b);
      });
      attribute.needsUpdate = true;
    }
  }
  function textSprite(text: string, size: number, tint = '#347e79') {
    const image = document.createElement('canvas');
    image.width = 512;
    image.height = 128;
    const ctx = image.getContext('2d')!;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 504, 120, 20);
    ctx.fill();
    ctx.fillStyle = tint;
    ctx.font = '600 50px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64, 480);
    const map = new THREE.CanvasTexture(image);
    map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map, transparent: true, depthTest: false })
    );
    sprite.scale.set(size, size / 4, 1);
    sprite.renderOrder = 10;
    return sprite;
  }
  function addLine(parent: THREE.Group, points: THREE.Vector3[], tint: string) {
    const line = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: tint, depthTest: false })
    );
    line.renderOrder = 8;
    parent.add(line);
  }
  function rebuild() {
    if (!mounted) return;
    release(model);
    walls = null;
    lines = null;
    layerIndices = new Map(
      [...new Set(segments.value.map((s) => s.layer))].map((name, i) => [name, i])
    );
    if (!segments.value.length) {
      redrawAnnotations();
      return;
    }
    const wallHeight =
      options.interior.enabled.value && options.interior.cutaway.value
        ? Math.min(settings.height, 0.8)
        : settings.height;
    const b = getBounds(segments.value),
      size = span(),
      margin = size * 0.08;
    if (settings.showGrid) {
      const grid = new THREE.GridHelper(size * 2, 30, '#cbdce1', '#e4edf0');
      grid.position.set((b.minX + b.maxX) / 2, -0.035, -(b.minY + b.maxY) / 2);
      model.add(grid);
    }
    if (mode.value === '2d') {
      const points = segments.value.flatMap((s) => [point(s.a), point(s.b)]);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(new Float32Array(points.length * 3), 3)
      );
      lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true }));
      model.add(lines);
    } else {
      const material = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.85,
        transparent: settings.opacity < 1,
        opacity: settings.opacity,
        depthWrite: settings.opacity >= 1,
      });
      walls = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        material,
        segments.value.length
      );
      const dummy = new THREE.Object3D();
      segments.value.forEach((s, index) => {
        dummy.position.set((s.a[0] + s.b[0]) / 2, wallHeight / 2, -(s.a[1] + s.b[1]) / 2);
        dummy.rotation.set(0, Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]), 0);
        dummy.scale.set(segmentLength(s), wallHeight, settings.thickness);
        dummy.updateMatrix();
        walls!.setMatrixAt(index, dummy.matrix);
      });
      walls.instanceMatrix.needsUpdate = true;
      walls.castShadow = true;
      walls.receiveShadow = true;
      model.add(walls);
      if (settings.showEdges) {
        const points: THREE.Vector3[] = [];
        for (const s of segments.value)
          points.push(
            point(s.a, wallHeight + 0.005),
            point(s.b, wallHeight + 0.005),
            point(s.a, 0),
            point(s.a, wallHeight),
            point(s.b, 0),
            point(s.b, wallHeight)
          );
        const edges = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            color: '#74919b',
            transparent: true,
            opacity: settings.opacity,
          })
        );
        model.add(edges);
      }
      if (settings.showFloor && !options.interior.enabled.value) {
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(
            Math.max(b.width, settings.thickness) + margin * 2,
            Math.max(b.depth, settings.thickness) + margin * 2
          ),
          new THREE.MeshStandardMaterial({ color: '#fcfdfb', roughness: 0.9 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set((b.minX + b.maxX) / 2, -0.02, -(b.minY + b.maxY) / 2);
        floor.receiveShadow = true;
        model.add(floor);
      }
    }
    updateSelection();
    redrawAnnotations();
    scene.value?.traverse((object) => {
      if (object instanceof THREE.DirectionalLight) {
        const cx = (b.minX + b.maxX) / 2,
          cz = -(b.minY + b.maxY) / 2;
        object.position.set(cx + size * 0.6, Math.max(size, wallHeight) * 1.8, cz + size * 0.8);
        object.target.position.set(cx, 0, cz);
        object.target.updateMatrixWorld(true);
        const extent = Math.max(size * 1.5, wallHeight * 2);
        Object.assign(object.shadow.camera, {
          left: -extent,
          right: extent,
          top: extent,
          bottom: -extent,
          near: 0.01,
          far: extent * 8,
        });
        object.shadow.camera.updateProjectionMatrix();
      }
    });
  }
  function redrawInterior() {
    if (!mounted) return;
    release(interiorGroup);
    if (segments.value.length)
      buildInterior(interiorGroup, options.interior, getBounds(segments.value));
  }
  function redrawAnnotations() {
    if (!mounted) return;
    release(annotations);
    if (!segments.value.length) return;
    const b = getBounds(segments.value),
      size = span(),
      offset = size * 0.12,
      tick = size * 0.015;
    if (settings.showDimensions) {
      const z = -b.minY + offset,
        x = b.minX - offset;
      addLine(
        annotations,
        [
          new THREE.Vector3(b.minX, 0.09, z),
          new THREE.Vector3(b.maxX, 0.09, z),
          new THREE.Vector3(b.minX, 0.09, z - tick),
          new THREE.Vector3(b.minX, 0.09, z + tick),
          new THREE.Vector3(b.maxX, 0.09, z - tick),
          new THREE.Vector3(b.maxX, 0.09, z + tick),
          new THREE.Vector3(x, 0.09, -b.minY),
          new THREE.Vector3(x, 0.09, -b.maxY),
        ],
        '#8ba9af'
      );
      const width = textSprite(`${b.width.toFixed(2)} m`, size * 0.2);
      width.position.set((b.minX + b.maxX) / 2, 0.15, z);
      annotations.add(width);
      const depth = textSprite(`${b.depth.toFixed(2)} m`, size * 0.2);
      depth.position.set(x, 0.15, -(b.minY + b.maxY) / 2);
      annotations.add(depth);
    }
    for (const measurement of measurements.value) {
      addLine(annotations, [point(measurement.a, 0.12), point(measurement.b, 0.12)], '#df9552');
      for (const p of [measurement.a, measurement.b]) addMeasurementPin(p, size);
      const label = textSprite(`${measurement.distance.toFixed(2)} m`, size * 0.18, '#ba7435');
      label.position.copy(
        point(
          [(measurement.a[0] + measurement.b[0]) / 2, (measurement.a[1] + measurement.b[1]) / 2],
          0.2
        )
      );
      annotations.add(label);
    }
    if (measureStart.value) addMeasurementPin(measureStart.value, size);
  }
  function addMeasurementPin(p: Point, size: number) {
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.006, 12, 8),
      new THREE.MeshBasicMaterial({ color: '#df9552', depthTest: false })
    );
    pin.position.copy(point(p, 0.13));
    pin.renderOrder = 9;
    annotations.add(pin);
  }
  function fitView() {
    if (!mounted || !camera.value || !controls.value || !renderer.value) return;
    const b = getBounds(segments.value),
      size = Math.max(span(), mode.value === '3d' ? settings.height : 0.5);
    const cx = (b.minX + b.maxX) / 2,
      cz = -(b.minY + b.maxY) / 2;
    const aspect =
      renderer.value.domElement.clientWidth / Math.max(renderer.value.domElement.clientHeight, 1);
    const is2D = mode.value === '2d';
    let cam = camera.value;
    if (is2D && !(cam instanceof THREE.OrthographicCamera)) cam = new THREE.OrthographicCamera();
    if (!is2D && !(cam instanceof THREE.PerspectiveCamera))
      cam = new THREE.PerspectiveCamera(45, aspect);
    const padding = size * 0.4 + settings.thickness;
    if (cam instanceof THREE.OrthographicCamera) {
      const halfHeight = Math.max(
        (b.depth + padding * 2) / 2,
        (b.width + padding * 2) / (2 * aspect),
        0.5
      );
      cam.left = -halfHeight * aspect;
      cam.right = halfHeight * aspect;
      cam.top = halfHeight;
      cam.bottom = -halfHeight;
      cam.zoom = 1;
    } else {
      cam.aspect = aspect;
    }
    cam.near = Math.max(0.001, size / 10000);
    cam.far = Math.max(size * 50, 100);
    cam.updateProjectionMatrix();
    camera.value = cam;
    controls.value.object = cam;
    controls.value.target.set(cx, is2D ? 0 : settings.height / 2, cz);
    const distance = size * Math.max(2.1, 2.1 / aspect);
    if (is2D || preset.value === 'top')
      cam.position.set(cx, size * 3 + settings.height, cz + size * 0.00001);
    else if (preset.value === 'front')
      cam.position.set(cx, settings.height / 2 + size * 0.06, cz + distance);
    else
      cam.position.set(cx + distance * 0.65, settings.height + distance * 0.8, cz + distance * 0.8);
    controls.value.enableRotate = !is2D;
    controls.value.mouseButtons.LEFT = is2D ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.value.touches.ONE = is2D ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    controls.value.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.value.minDistance = size * 0.05;
    controls.value.maxDistance = size * 20;
    controls.value.minZoom = 0.15;
    controls.value.maxZoom = 30;
    controls.value.update();
  }
  function onPointerDown(event: PointerEvent) {
    pointerStart = new THREE.Vector2(event.clientX, event.clientY);
  }
  function onPointerUp(event: PointerEvent) {
    if (
      !canvas ||
      !camera.value ||
      event.button !== 0 ||
      pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5
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
    const interior = options.interior;
    if (interior.enabled.value && !measuring.value) {
      if (interior.placing.value || interior.moving.value) {
        const hit = raycaster.ray.intersectPlane(ground, new THREE.Vector3());
        if (hit) interior.place([hit.x, -hit.z]);
      } else {
        const hit = raycaster
          .intersectObjects(interiorGroup.children, true)
          .find((h) => h.object.userData.furnitureId);
        interior.selectedId.value = hit?.object.userData.furnitureId ?? null;
      }
      return;
    }
    if (measuring.value) {
      const hit = raycaster.ray.intersectPlane(ground, new THREE.Vector3());
      if (!hit) return;
      const rawPoint: Point = [hit.x, -hit.z];
      let selectedPoint = rawPoint;
      let nearest = span() * 0.02;
      for (const s of segments.value)
        for (const candidate of [s.a, s.b]) {
          const distance = Math.hypot(candidate[0] - rawPoint[0], candidate[1] - rawPoint[1]);
          if (distance < nearest) {
            nearest = distance;
            selectedPoint = candidate;
          }
        }
      options.onMeasure([...selectedPoint]);
      return;
    }
    raycaster.params.Line = { threshold: span() * 0.012 };
    const hit = walls
      ? raycaster.intersectObject(walls)[0]
      : lines
        ? raycaster.intersectObject(lines)[0]
        : undefined;
    const index = walls
      ? hit?.instanceId
      : hit?.index === undefined
        ? undefined
        : Math.floor(hit.index / 2);
    options.onSelect(index === undefined ? null : (segments.value[index]?.id ?? null));
  }
  async function capture(): Promise<Blob | null> {
    if (!renderer.value || !scene.value || !camera.value) return null;
    renderer.value.render(scene.value, camera.value);
    return new Promise((resolve) => renderer.value!.domElement.toBlob(resolve, 'image/png'));
  }
  watch(segments, () => {
    redrawInterior();
    rebuild();
    fitView();
  });
  watch(mode, () => {
    redrawInterior();
    rebuild();
    fitView();
  });
  watch(preset, fitView);
  watch(() => settings.height, fitView);
  watch(() => ({ ...settings }), rebuild, { deep: true });
  watch(selectedId, updateSelection);
  watch([measurements, measureStart], redrawAnnotations, { deep: true });
  watch([options.interior.design, options.interior.selectedId], redrawInterior, { deep: true });
  watch(options.interior.cutaway, rebuild);
  watch(options.interior.enabled, () => {
    redrawInterior();
    rebuild();
  });
  onMounted(() => {
    mounted = true;
    scene.value?.add(model, annotations, interiorGroup);
    redrawInterior();
    rebuild();
    fitView();
    canvas = renderer.value?.domElement ?? null;
    canvas?.addEventListener('pointerdown', onPointerDown);
    canvas?.addEventListener('pointerup', onPointerUp);
  });
  return { containerRef, fitView, capture };
}
