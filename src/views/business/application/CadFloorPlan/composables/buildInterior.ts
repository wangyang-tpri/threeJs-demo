import * as THREE from 'three';
import type { Bounds } from '../dxf';
import type { InteriorState } from './useInteriorDesign';
export function buildInterior(group: THREE.Group, state: InteriorState, bounds: Bounds) {
  if (!state.enabled.value) return;
  if (bounds.width > 0 && bounds.depth > 0) {
    const image = document.createElement('canvas');
    image.width = 256;
    image.height = 256;
    const c = image.getContext('2d')!;
    c.fillStyle = state.design.value.floorColor;
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = 'rgba(70,50,30,0.25)';
    c.lineWidth = 2;
    if (state.design.value.floor === 'wood') {
      for (let y = 0; y < 256; y += 64) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(256, y);
        c.moveTo(y % 128 === 0 ? 80 : 180, y);
        c.lineTo(y % 128 === 0 ? 80 : 180, y + 64);
        c.stroke();
      }
      c.strokeStyle = 'rgba(80,60,30,0.08)';
      for (let y = 8; y < 256; y += 13) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(256, y + 3);
        c.stroke();
      }
    }
    if (state.design.value.floor === 'tile') {
      c.strokeRect(0, 0, 256, 256);
    }
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(
      bounds.width / (state.design.value.floor === 'tile' ? 0.6 : 2),
      bounds.depth / (state.design.value.floor === 'tile' ? 0.6 : 2)
    );
    texture.anisotropy = 4;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.width, bounds.depth),
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: state.design.value.floor === 'tile' ? 0.35 : 0.85,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((bounds.minX + bounds.maxX) / 2, -0.015, -(bounds.minY + bounds.maxY) / 2);
    floor.receiveShadow = true;
    group.add(floor);
  }
  for (const item of state.design.value.items) {
    const root = new THREE.Group();
    root.position.set(item.x, 0, -item.y);
    root.rotation.y = (item.rotation * Math.PI) / 180;
    root.scale.set(item.width, item.height, item.depth);
    root.userData.furnitureId = item.id;
    const material = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.75 });
    function box(w: number, h: number, d: number, x: number, y: number, z: number, color?: string) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        color ? new THREE.MeshStandardMaterial({ color, roughness: 0.75 }) : material
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.furnitureId = item.id;
      root.add(mesh);
    }
    if (item.kind === 'sofa') {
      box(1, 0.35, 1, 0, 0.33, 0);
      box(1, 0.55, 0.18, 0, 0.72, -0.41);
      box(0.12, 0.5, 0.9, -0.44, 0.65, 0);
      box(0.12, 0.5, 0.9, 0.44, 0.65, 0);
      box(0.72, 0.13, 0.7, 0, 0.56, 0.07, '#e0dfd5');
    } else if (item.kind === 'bed') {
      box(1, 0.3, 1, 0, 0.2, 0);
      box(1, 0.7, 0.08, 0, 0.65, -0.46);
      box(0.94, 0.25, 0.88, 0, 0.48, 0.02, '#f3ece1');
      box(0.92, 0.12, 0.57, 0, 0.66, 0.15);
      box(0.38, 0.12, 0.2, -0.24, 0.68, -0.3, '#fffaf0');
      box(0.38, 0.12, 0.2, 0.24, 0.68, -0.3, '#fffaf0');
    } else if (item.kind === 'table' || item.kind === 'chair') {
      const chair = item.kind === 'chair';
      box(1, 0.12, 1, 0, chair ? 0.5 : 0.94, 0);
      for (const x of [-0.4, 0.4])
        for (const z of [-0.4, 0.4])
          box(0.08, chair ? 0.5 : 0.88, 0.08, x, chair ? 0.25 : 0.44, z, '#6e665c');
      if (chair) box(1, 0.5, 0.1, 0, 0.78, -0.45);
    } else if (item.kind === 'cabinet') {
      box(1, 1, 1, 0, 0.5, 0);
      box(0.012, 0.86, 0.02, 0, 0.5, 0.51, '#8f7e68');
      box(0.025, 0.12, 0.04, -0.06, 0.52, 0.53, '#5d625f');
      box(0.025, 0.12, 0.04, 0.06, 0.52, 0.53, '#5d625f');
    } else {
      box(0.65, 0.35, 0.65, 0, 0.18, 0, '#b79578');
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), material);
      crown.position.y = 0.67;
      crown.scale.y = 0.73;
      crown.userData.furnitureId = item.id;
      root.add(crown);
    }
    group.add(root);
    if (item.id === state.selectedId.value) {
      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.BoxGeometry(item.width + 0.06, item.height + 0.06, item.depth + 0.06)
        ),
        new THREE.LineBasicMaterial({ color: '#ef9a50', depthTest: false })
      );
      outline.position.set(item.x, item.height / 2, -item.y);
      outline.rotation.y = root.rotation.y;
      outline.renderOrder = 12;
      group.add(outline);
    }
  }
}
