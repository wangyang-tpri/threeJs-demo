<script setup lang="ts">
import { exits, hazards } from '../simulation';
import type { EvacuationState } from '../composables/useEvacuation';
defineProps<{ state: EvacuationState }>();
</script>
<template>
  <aside
    class="bg-white border border-solid border-slate-200 rounded-xl p-4 min-w-0 flex flex-col gap-4"
  >
    <strong class="text-sm">场景与疏散参数</strong
    ><label class="text-xs"
      >人数（重置后生效）<n-input-number
        :value="state.count.value"
        @update:value="(v: number | null) => v !== null && (state.count.value = v)"
        :min="10"
        :max="150"
        :step="10"
        :disabled="state.simulation.value.phase !== 'ready'" /></label
    ><label class="text-xs"
      >步行速度 / m·s⁻¹<n-input-number
        :value="state.speed.value"
        @update:value="(v: number | null) => v !== null && (state.speed.value = v)"
        :min="0.5"
        :max="2"
        :step="0.1"
        :disabled="state.simulation.value.phase !== 'ready'" /></label
    ><label class="text-xs"
      >单出口服务上限 / 人·s⁻¹<n-input-number
        :value="state.capacity.value"
        @update:value="(v: number | null) => v !== null && (state.capacity.value = v)"
        :min="0.5"
        :max="3"
        :step="0.5"
        :disabled="state.simulation.value.phase !== 'ready'"
    /></label>
    <div class="text-xs">
      可用出口（可实时修改）<n-checkbox-group
        v-model:value="state.open.value"
        class="mt-2 flex gap-2 flex-wrap"
        ><n-checkbox v-for="e in exits" :key="e.id" :value="e.id">{{
          e.name
        }}</n-checkbox></n-checkbox-group
      >
    </div>
    <label class="text-xs"
      >危险区域（不可通行）<n-select
        v-model:value="state.hazard.value"
        :options="
          Object.entries(hazards).map(([value, h]) => ({ label: h.label, value }))
        " /></label
    ><label class="text-xs"
      >播放倍率<n-select
        v-model:value="state.rate.value"
        :options="[1, 2, 4].map((value) => ({ label: value + ' ×', value }))" /></label
    ><label class="flex justify-between text-xs"
      >距离热力图<n-switch v-model:value="state.heatmap.value" size="small" /></label
    ><label class="flex justify-between text-xs"
      >选中人员路线<n-switch v-model:value="state.routes.value" size="small" /></label
    ><n-alert v-if="state.unreachable.value" type="warning" :show-icon="false"
      >{{
        state.unreachable.value
      }}
      人当前没有可达出口。可重新开放出口或移除危险区，模拟会重新寻路。</n-alert
    >
    <div class="text-[10px] leading-5 text-slate-400">
      每格代表约 1
      m，每格最多一人。出口服务上限还受上游排队与移动速度限制。地图、人数和运动模型均为简化教学示例，不用于真实应急方案评估。
    </div>
  </aside>
</template>
