<script setup lang="ts">
import { computed } from 'vue';
import { exits } from '../simulation';
import type { EvacuationState } from '../composables/useEvacuation';
const props = defineProps<{ state: EvacuationState }>();
const points = computed(() => {
  const s = props.state.simulation.value;
  return s.samples
    .map(
      (p) =>
        `${35 + (p.time / Math.max(1, s.elapsed)) * 480},${140 - (p.evacuated / s.agents.length) * 115}`
    )
    .join(' ');
});
</script>
<template>
  <section class="evac-report shrink-0 grid grid-cols-2 max-[900px]:grid-cols-1 gap-4">
    <div class="rounded-xl border border-solid border-slate-200 bg-white p-4">
      <strong class="text-sm">累计疏散曲线</strong
      ><svg class="w-full h-[175px]" viewBox="0 0 550 170" aria-label="累计疏散人数趋势" role="img">
        <path d="M35 20V140H520" fill="none" stroke="#dbe4e9" />
        <polyline :points="points" fill="none" stroke="#22a794" stroke-width="2" />
        <text x="2" y="28" class="text-[10px]" fill="#91a2ac">
          {{ state.simulation.value.agents.length }}人
        </text>
        <text x="35" y="160" class="text-[10px]" fill="#91a2ac">0 s</text>
        <text x="470" y="160" class="text-[10px]" fill="#91a2ac">
          {{ state.simulation.value.elapsed.toFixed(1) }} s
        </text>
      </svg>
      <div class="text-[10px] text-slate-400">
        横轴为模拟时间，倍率不改变人员运动参数。最多显示最近 120 次采样。
      </div>
    </div>
    <div class="rounded-xl border border-solid border-slate-200 bg-white p-4">
      <strong class="text-sm">出口使用统计</strong>
      <div v-for="e in exits" :key="e.id" class="flex justify-between mt-4 text-xs">
        <span>{{ e.name }} · {{ state.open.value.includes(e.id) ? '开放' : '关闭' }}</span
        ><strong>{{ state.simulation.value.throughput[e.id] }} 人</strong>
      </div>
      <div class="mt-5 text-xs text-slate-400">
        {{
          state.simulation.value.phase === 'completed'
            ? '全部人员已通过出口，模拟完成。'
            : state.unreachable.value
              ? '存在不可达人员，等待调整出口或危险区。'
              : '人员根据最短距离场选择出口，拥堵时等待前方格位释放。'
        }}
      </div>
    </div>
  </section>
</template>
