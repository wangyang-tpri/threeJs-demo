<script setup lang="ts">
import { computed } from 'vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';
const props = defineProps<{ hasRoute: boolean }>();
const lesson = computed(() => (props.hasRoute ? 'route' : 'mall'));
const { code, explanation } = useCodeExplain(
  {
    mall: () =>
      `// 数据驱动：每层店铺、走廊和电梯\nfor (const floor of FLOORS) {\n  const group = createFloor(floor);\n  group.position.y = floorIndex(floor.key) * height;\n  scene.add(group);\n}\n// 点击拾取店铺\nraycaster.setFromCamera(pointer, camera);\nconst hit = raycaster.intersectObjects(shops)[0];\nselectPlace(hit.object.userData.placeId);`,
    route: () =>
      `// Dijkstra：在走廊图中寻找最短路线\nconst route = findRoute(startId, endId);\n// 门口 → 走廊 → 电梯 → 目标楼层 → 门口\nfor (const [a, b] of adjacentPairs(route.nodes)) {\n  drawSegment(nodePosition(a), nodePosition(b));\n}\n// 按路径长度推进导航标记\ntraveled += delta * demoSpeed;\nmarker.position.copy(interpolateRoute(traveled));`,
  },
  {
    mall: () =>
      '【布局】3 个楼层、24 家示例店铺，店铺实体与公共走廊分离，门口朝向走廊。\n【交互】Raycaster 拾取店铺，Vue 联动店铺详情与导航起终点。拖动旋转，滚轮缩放，可切换俯视与楼层展开。\n【资源】场景只构建一次，切层控制可见性，路线更新及卸载时释放几何体、材质和纹理。',
    route: () =>
      '【寻路】走廊交点、店铺门口和电梯构成双向加权图，Dijkstra 计算最短路线，避免直线穿过店铺。\n【跨层】仅电梯节点允许跨层连接，橙色表示电梯行程；楼层展开不改变路线距离。\n【距离】1 场景单位 = 3 米，按 1.2 米/秒估算步行时间，每层电梯另计 30 秒。动画为加速演示，不代表实时定位。',
  },
  lesson
);
</script>

<template>
  <div class="lesson-panel">
    <CodePanel
      class="!w-full min-h-[330px]"
      title="商场建模与三维寻路"
      :code="code"
      :explanation="explanation"
    />
  </div>
</template>
