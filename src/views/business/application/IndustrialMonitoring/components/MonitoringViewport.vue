<script setup lang="ts">
import type { useMonitoring } from '../composables/useMonitoring';
import { useMonitoringScene } from '../composables/useMonitoringScene';
const props = defineProps<{ state: ReturnType<typeof useMonitoring> }>();
const { topView, labels, circulating, monitoring } = props.state;
const { containerRef, fitView, capture } = useMonitoringScene(props.state);
defineExpose({ fitView, capture });
</script>
<template>
  <main
    class="industrial-viewport relative min-h-[600px] max-[800px]:min-h-[500px] rounded-xl border border-solid border-[#e1e9ee] overflow-hidden min-w-0"
  >
    <div
      ref="containerRef"
      class="industrial-canvas absolute inset-0 [&_canvas]:block [&_canvas]:touch-none [&_canvas]:cursor-grab"
    ></div>
    <div class="absolute left-5 top-5 pointer-events-none">
      <div class="text-[10px] tracking-[2px] text-[#2d867b]">PROCESS / 设备回路</div>
      <h2 class="m-0 mt-2 text-lg font-semibold text-[#3d5d6d]">循环输送系统</h2>
      <p class="industrial-flow mt-1 text-[10px] text-[#92a6b2]">
        {{
          !monitoring
            ? '模拟采样与流向动画已暂停'
            : circulating
              ? '循环运行中 · 金色颗粒表示流向'
              : '回路已中断 · 流量为零'
        }}
      </p>
    </div>
    <div class="absolute right-4 top-5 flex justify-end flex-wrap gap-1 max-w-[175px]">
      <n-button size="small" @click="topView = !topView">{{
        topView ? '立体视角' : '俯视地图'
      }}</n-button
      ><n-button size="small" @click="fitView()">视角复位</n-button
      ><n-button size="small" @click="labels = !labels">{{
        labels ? '隐藏标牌' : '显示标牌'
      }}</n-button>
    </div>
    <div
      class="absolute left-5 bottom-5 right-5 flex flex-wrap justify-between gap-2 text-[10px] text-[#93a7b3]"
    >
      <div class="bg-white/90 rounded-lg px-3 py-2 flex gap-3">
        <span><i class="inline-block w-2 h-2 bg-[#76aaa2] rounded mr-1"></i>正常</span
        ><span><i class="inline-block w-2 h-2 bg-[#e5b15a] rounded mr-1"></i>预警</span
        ><span><i class="inline-block w-2 h-2 bg-[#d87876] rounded mr-1"></i>严重</span
        ><span><i class="inline-block w-2 h-2 bg-[#8e9eaa] rounded mr-1"></i>停机</span>
      </div>
      <span class="self-end">拖动旋转 · 滚轮缩放 · 点击设备</span>
    </div>
  </main>
</template>
