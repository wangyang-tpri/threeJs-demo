<script setup lang="ts">
import { ref } from 'vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
const active = ref<'coordinate' | 'arc' | 'export'>('coordinate');
const { code, explanation } = useCodeExplain(
  {
    coordinate: () =>
      `// WGS84 经纬度投影到球面，北纬对应 Y 正方向\nconst lon = longitude * Math.PI / 180;\nconst lat = latitude * Math.PI / 180;\nconst point = new THREE.Vector3(\n  radius * Math.cos(lat) * Math.cos(lon),\n  radius * Math.sin(lat),\n  -radius * Math.cos(lat) * Math.sin(lon)\n);`,
    arc: () =>
      `const axis = new THREE.Vector3().crossVectors(start, end).normalize();\nconst angle = start.angleTo(end);\nconst points = Array.from({ length: 65 }, (_, i) => {\n  const t = i / 64;\n  return start.clone().applyAxisAngle(axis, angle * t)\n    .multiplyScalar(5.07 + Math.sin(Math.PI * t) * height);\n});\nconst curve = new THREE.CatmullRomCurve3(points);\nparticle.position.copy(curve.getPoint(progress));`,
    export: () =>
      `// GeoJSON 保留经度、纬度顺序，不导出场景中的 XYZ\nconst features = filteredCities.map(city => ({\n  type: 'Feature',\n  geometry: { type: 'Point', coordinates: [city.lon, city.lat] },\n  properties: { name: city.name, volume: city.volume, nodes: city.nodes }\n}));\nconst collection = { type: 'FeatureCollection', features };`,
  },
  {
    coordinate: () =>
      '经度决定绕 Y 轴的方向，纬度决定高度。城市、柱状图与底图共用同一坐标约定，避免经度镜像或旋转错位。城市标签通过与相机方向的点积隐藏背面的文字。',
    arc: () =>
      '绕两城市法向量的叉积轴旋转，得到最短球面方向，再用正弦函数抬高弧线。流动粒子沿曲线循环。连线仅表示业务关系；距离使用 haversine 公式计算，不将弧线长度当作地表距离。',
    export: () =>
      '筛选后的城市导出为标准 FeatureCollection。Point 使用 [经度, 纬度]，业务属性放在 properties。空筛选也会生成合法的空集合，数据可用于其他 GIS 工具。',
  },
  active
);
</script>
<template>
  <section class="geo-lesson shrink-0 min-w-0">
    <n-radio-group v-model:value="active" size="small" class="mb-2"
      ><n-radio-button value="coordinate">经纬度投影</n-radio-button
      ><n-radio-button value="arc">球面连线</n-radio-button
      ><n-radio-button value="export">GeoJSON 导出</n-radio-button></n-radio-group
    ><CodePanel
      class="!w-full min-h-[310px]"
      title="地理数据可视化"
      :code="code"
      :explanation="explanation"
    />
  </section>
</template>
