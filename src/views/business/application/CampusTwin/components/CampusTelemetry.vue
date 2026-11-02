<script setup lang="ts">
import { computed, ref } from 'vue';
import { buildings } from '../campus';
import type { CampusState } from '../composables/useCampus';
const props = defineProps<{ state: CampusState }>();
defineEmits<{ locate: [id: string] }>();
const all = ref(false),
  events = computed(() => (all.value ? props.state.alarms.value : props.state.activeAlarms.value));
const range = computed(() => {
  const values = props.state.history.value.map((p) => p.power);
  return { min: Math.min(...values, 0), max: Math.max(...values, 1) * 1.1 };
});
const points = computed(() =>
  props.state.history.value
    .map(
      (p, i) =>
        `${40 + (i / Math.max(1, props.state.history.value.length - 1)) * 510},${145 - ((p.power - range.value.min) / (range.value.max - range.value.min)) * 120}`
    )
    .join(' ')
);
</script>
<template>
  <div class="campus-telemetry shrink-0 grid grid-cols-2 max-[1100px]:grid-cols-1 gap-4">
    <section class="rounded-xl border border-solid border-[#e0e8ed] bg-white p-4 min-w-0">
      <div class="flex justify-between text-sm font-bold">
        全园区功率趋势<span class="text-[10px] font-normal text-slate-400"
          >最近 60 次 · 1 秒采样 · kW</span
        >
      </div>
      <svg
        class="campus-trend w-full h-[180px]"
        viewBox="0 0 580 180"
        role="img"
        aria-label="全园区功率采样趋势"
      >
        <path d="M40 20V145H550" fill="none" stroke="#dce6eb" />
        <polyline :points="points" fill="none" stroke="#22a794" stroke-width="2" />
        <circle
          v-if="state.history.value.length === 1"
          :cx="40"
          :cy="Number(points.split(',')[1])"
          r="3"
          fill="#22a794"
        />
        <text x="3" y="28" class="text-[10px]" fill="#91a1aa">{{ Math.round(range.max) }}</text>
        <text x="15" y="148" class="text-[10px]" fill="#91a1aa">0</text>
        <text x="40" y="170" class="text-[10px]" fill="#91a1aa">
          {{ state.history.value[0]?.time ?? 0 }} s
        </text>
        <text x="520" y="170" class="text-[10px]" fill="#91a1aa">{{ state.clock.value }} s</text>
      </svg>
      <div class="text-[10px] text-slate-400">
        {{ state.simulating.value ? '本地模拟运行中' : '采样已暂停' }} · 当前全园区功率
        {{ state.stats.value.power }} kW
      </div>
    </section>
    <section
      class="campus-alarms rounded-xl border border-solid border-[#e0e8ed] bg-white p-4 min-w-0"
    >
      <div class="flex justify-between items-center gap-2">
        <strong class="text-sm">告警事件 · {{ state.activeAlarms.value.length }} 条未恢复</strong
        ><n-checkbox v-model:checked="all" size="small">全部记录</n-checkbox>
      </div>
      <div class="mt-3 max-h-[190px] overflow-auto">
        <div
          v-for="a in events"
          :key="a.id"
          class="campus-alarm border-b border-solid border-slate-100 py-2 text-xs"
        >
          <div class="flex justify-between gap-2">
            <button
              class="bg-transparent border-0 p-0 cursor-pointer text-teal-700"
              @click="$emit('locate', a.buildingId)"
            >
              {{ a.buildingId }} {{ buildings.find((b) => b.id === a.buildingId)?.name }}</button
            ><span class="text-[10px] text-slate-400">{{ a.time }} s · #{{ a.id }}</span>
          </div>
          <div class="flex justify-between items-center gap-2 mt-1">
            <span :class="a.resolved ? 'text-teal-600' : 'text-amber-600'"
              >{{
                a.resolved ? '已恢复' : a.acknowledged ? '已确认 · 未恢复' : '待确认 · 未恢复'
              }}
              · 设备异常</span
            ><n-button v-if="!a.acknowledged" size="tiny" @click="state.acknowledge(a.id)"
              >确认</n-button
            >
          </div>
        </div>
        <n-empty v-if="!events.length" description="暂无告警事件" class="py-8" />
      </div>
      <div class="mt-2 text-[10px] text-slate-400">
        最多保留 100 条事件。确认不会清除故障，点击楼宇查看并恢复。
      </div>
    </section>
  </div>
</template>
