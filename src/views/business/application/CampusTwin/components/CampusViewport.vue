<script setup lang="ts">
import { ref } from 'vue';
import { useCampusScene } from '../composables/useCampusScene';
import type { CampusState } from '../composables/useCampus';
import { pathLength } from '../campus';
const props = defineProps<{ state: CampusState }>();
const container = ref<HTMLDivElement | null>(null);
const { fit, capture } = useCampusScene(container, props.state);
defineExpose({ fit, capture });
</script>
<template>
  <section class="campus-viewport relative min-h-[600px] rounded-xl overflow-hidden bg-[#e8f0f3]">
    <div ref="container" class="campus-canvas absolute inset-0 [&_canvas]:block touch-none"></div>
    <div class="absolute top-4 left-4 right-4 flex justify-between gap-2 flex-wrap">
      <n-radio-group v-model:value="state.lens.value" size="small" class="bg-white rounded"
        ><n-radio-button value="overview">园区总览</n-radio-button
        ><n-radio-button value="energy">能耗分布</n-radio-button
        ><n-radio-button value="safety">安防状态</n-radio-button></n-radio-group
      >
      <div class="flex gap-1">
        <n-button size="small" @click="fit(false, true)">俯视</n-button
        ><n-button size="small" @click="fit()">全景</n-button>
      </div>
    </div>
    <div
      class="absolute left-4 bottom-4 right-4 rounded-lg bg-white/95 border border-solid border-slate-200 p-3 text-[11px] text-[#54717d]"
    >
      <div class="flex justify-between items-center gap-2 flex-wrap">
        <span
          >巡检 {{ Math.round((state.patrolDistance.value / pathLength) * 100) }}% · 道路环线
          {{ pathLength.toFixed(0) }} m</span
        >
        <div class="flex gap-2">
          <n-button
            size="tiny"
            :disabled="!state.showRoute.value"
            @click="state.patrolPlaying.value = !state.patrolPlaying.value"
            >{{ state.patrolPlaying.value ? '暂停巡检' : '播放巡检' }}</n-button
          ><n-button
            size="tiny"
            @click="
              state.patrolPlaying.value = false;
              state.patrolDistance.value = 0;
            "
            >回到起点</n-button
          >
        </div>
      </div>
      <div class="mt-2 h-1 bg-slate-100 rounded">
        <div
          class="h-full rounded bg-amber-400"
          :style="{ width: `${(state.patrolDistance.value / pathLength) * 100}%` }"
        ></div>
      </div>
      <div class="mt-2 text-[10px]">
        {{
          state.lens.value === 'energy'
            ? '颜色由蓝绿到橙红表示楼宇功率由低到高（0–450 kW）。'
            : '红色为异常楼宇，金色边框为当前选中。'
        }}
        拖动旋转 · 滚轮缩放 · 点击楼宇查看
      </div>
    </div>
  </section>
</template>
