<script setup lang="ts">
import { computed } from 'vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
const lesson = computed(() => 'monitor');
const { code, explanation } = useCodeExplain(
  {
    monitor: () =>
      `// 固定采样频率，场景渲染与传感器采样分离\nif (time - lastSample >= 1) {\n  device.reading = sampleReading(device, time);\n  device.history = [...history, reading].slice(-60);\n  alarms = reconcileAlarms(alarms, devices, time);\n}\n// 管道曲线上的颗粒表示流动方向\nparticle.position.copy(curve.getPoint(progress));\n// 确认与恢复是不同事件\nalarm.acknowledged = true;`,
  },
  {
    monitor: () =>
      '【场景】储罐、泵、换热器和阀门组成循环回路。网格带设备编号，Raycaster 拾取设备，材质颜色映射状态。\n【数据】完全本地模拟，每秒采样一次，保留最近 60 个样本；暂停时停止采样及流动动画。任一设备停机时示意回路流量归零。\n【告警】温度、压力、振动按阈值生成事件。同一设备与指标仅保留一个未恢复事件，严重度升级需要重新确认。确认不会清除异常，恢复后保留历史记录。\n【范围】没有连接真实 PLC、SCADA 或设备接口，停机和异常操作仅用于演示。',
  },
  lesson
);
</script>
<template>
  <section class="industrial-lesson shrink-0 min-w-0">
    <CodePanel
      class="!w-full min-h-[320px]"
      title="设备监控与告警事件"
      :code="code"
      :explanation="explanation"
    />
  </section>
</template>
