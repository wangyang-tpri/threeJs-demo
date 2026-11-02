<script setup lang="ts">
import { ref } from 'vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
const active = ref<'mapping' | 'patrol' | 'events'>('mapping');
const { code, explanation } = useCodeExplain(
  {
    mapping: () =>
      `// 业务 ID 连接三维对象、目录和传感器读数\nmesh.userData.buildingId = building.id;\nconst hit = raycaster.intersectObjects(buildings, true)[0];\nselectedId.value = hit.object.userData.buildingId;\n// 能耗视图：功率映射到色相\nconst ratio = Math.min(1, reading.power / 450);\nmaterial.color.setHSL(0.52 - ratio * 0.5, 0.55, 0.52);`,
    patrol: () =>
      `// 按折线路段长度推进，车辆严格沿道路移动\ndistance = (distance + delta * 6) % totalLength;\nfor (const segment of roadSegments) {\n  if (distance <= segment.length) {\n    return start.clone().lerp(end, distance / segment.length);\n  }\n  distance -= segment.length;\n}\n// 路线暂停仅冻结进度，相机仍可交互`,
    events: () =>
      `// 告警的确认与恢复是两个独立状态\nfunction acknowledge(alarm) { alarm.acknowledged = true; }\nfunction recover(buildingId) {\n  faultIds.delete(buildingId);\n  alarms.filter(a => a.buildingId === buildingId)\n    .forEach(a => a.resolved = true);\n}\n// 离开页面时清除定时器、拾取事件及 GPU 资源`,
  },
  {
    mapping: () =>
      '每栋楼具有稳定业务编号。拾取三维楼宇后更新 selectedId，目录、详情和边框同步变化。总览与安防视图突出异常，能耗视图将模拟功率映射为连续颜色。筛选只影响资产展示，全园区统计保持同一口径。',
    patrol: () =>
      '路线由道路上的折线组成，按各段实际长度插值，因此不会穿过楼宇或在转角切弯。进度采用累计路程对总长取余；暂停后继续不会重置位置。巡检播放和数据采样独立控制。',
    events: () =>
      '模拟异常只对每栋楼生成一个未恢复事件，重复注入被禁用。确认表示已读，恢复表示异常结束；恢复后再次注入会生成新事件。页面明确使用本地模拟数据，未连接真实园区系统。',
  },
  active
);
</script>
<template>
  <section class="campus-lesson shrink-0 min-w-0">
    <n-radio-group v-model:value="active" size="small" class="mb-2"
      ><n-radio-button value="mapping">数据映射</n-radio-button
      ><n-radio-button value="patrol">道路巡检</n-radio-button
      ><n-radio-button value="events">告警状态</n-radio-button></n-radio-group
    ><CodePanel
      class="!w-full min-h-[300px]"
      title="园区数字孪生"
      :code="code"
      :explanation="explanation"
    />
  </section>
</template>
