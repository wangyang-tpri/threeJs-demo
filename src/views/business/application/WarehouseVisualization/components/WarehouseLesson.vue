<script setup lang="ts">
import { computed } from 'vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
const props = defineProps<{ hasJob: boolean }>();
const lesson = computed(() => (props.hasJob ? 'transport' : 'inventory'));
const { code, explanation } = useCodeExplain(
  {
    inventory: () =>
      `// 实例化绘制库位，避免为每件库存创建独立模型\nconst mesh = new THREE.InstancedMesh(geometry, material, bins.length);\nbins.forEach((bin, index) => {\n  mesh.setMatrixAt(index, transform(bin));\n  mesh.setColorAt(index, statusColor(bin));\n});\n// instanceId 映射回库位数据\nconst bin = instanceBins[hit.instanceId];`,
    transport: () =>
      `// 先进入横向通道，再沿货架外侧纵向通道前往服务点\nconst route = planRoute(bin);\nvehicle.position.copy(pointAtDistance(route, traveled));\n// 入库/出库任务使用创建时的库位与数量快照\nif (elapsed >= duration && status === 'running') {\n  inventory = applyJob(bin, kind, amount);\n  status = 'done';\n}\n// 暂停与取消均不提前修改库存`,
  },
  {
    inventory: () =>
      '【结构】8 组货架，每组 3 列 × 3 层，共 72 个库位。实例化绘制货物与空位，颜色区分正常、低库存、空位和冻结。\n【交互】搜索、区域与状态筛选联动列表及场景；Raycaster 的 instanceId 用于查询库位。\n【数据】使用确定性的本地演示库存，无实时仓储系统连接。',
    transport: () =>
      '【路径】按固定走廊布局生成水平与竖直线段，车辆前往货架西侧服务点，不穿越货架。坐标单位为米。\n【任务】2 m/s 基础速度加演示倍率；前往、装卸停留、返回三个阶段。任务保存库位和数量快照，选择其他库位不会改变正在执行的任务。\n【库存】冻结、超量出库及超容量入库被拒绝。只有完成任务才更新库存，取消保持库存不变。\n【范围】单车单任务演示，不包含实际机械装卸或多车调度。',
  },
  lesson
);
</script>
<template>
  <section class="warehouse-lesson shrink-0 min-w-0">
    <CodePanel
      class="!w-full min-h-[320px]"
      title="仓储可视化与搬运任务"
      :code="code"
      :explanation="explanation"
    />
  </section>
</template>
