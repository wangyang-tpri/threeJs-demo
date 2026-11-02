<script setup lang="ts">
import { METRICS, deviceStatus, STATUS_CLASS, STATUS_LABEL, type Metric } from '../monitoring';
import type { useMonitoring } from '../composables/useMonitoring';
import SensorTrend from './SensorTrend.vue';
const props = defineProps<{ state: ReturnType<typeof useMonitoring> }>();
const { selected, metric, fault } = props.state;
const metrics = Object.keys(METRICS) as Metric[];
const faults = [
  { label: '温度严重告警', value: 'overheat' },
  { label: '温度预警', value: 'warm' },
  { label: '压力严重告警', value: 'pressure' },
  { label: '振动严重告警', value: 'vibration' },
];
const emit = defineEmits<{ focus: [] }>();
</script>
<template>
  <aside
    class="industrial-inspector rounded-xl border border-solid border-[#e1e9ee] bg-white p-4 flex flex-col gap-4 min-w-0"
  >
    <div class="flex justify-between items-center">
      <h2 class="industrial-selected m-0 text-sm font-semibold">
        {{ selected.id }} · {{ selected.name }}
      </h2>
      <n-button size="tiny" quaternary @click="emit('focus')">定位</n-button>
    </div>
    <span
      class="self-start rounded px-2 py-1 text-[10px]"
      :class="STATUS_CLASS[deviceStatus(selected)]"
      >{{ STATUS_LABEL[deviceStatus(selected)] }}</span
    >
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="key in metrics"
        :key="key"
        class="industrial-metric rounded-lg border border-solid p-3 text-left cursor-pointer"
        :class="metric === key ? 'border-[#b5d9d0] bg-[#f0f8f5]' : 'border-[#edf1f4] bg-[#f8fafb]'"
        @click="metric = key"
      >
        <span class="text-[10px] text-[#92a7b2]">{{ METRICS[key].name }}</span
        ><strong class="block mt-1 text-lg text-[#3f8077]"
          >{{ selected.reading[key].toFixed(key === 'pressure' ? 2 : 1)
          }}<small class="ml-1 text-[9px] font-normal">{{ METRICS[key].unit }}</small></strong
        >
      </button>
    </div>
    <div>
      <div class="mb-2 text-[11px] text-[#7e99a6]">
        {{ METRICS[metric].name }}趋势 · 最多 60 次采样
      </div>
      <SensorTrend :history="selected.history" :metric="metric" />
      <p class="mb-0 mt-2 text-[9px] text-[#a1afb7]">
        {{
          metric === 'flow'
            ? '停机时回路流量归零，流量不触发阈值告警。'
            : `黄线为预警 ${METRICS[metric].warning}，红线为严重 ${METRICS[metric].critical} ${METRICS[metric].unit}。`
        }}
      </p>
    </div>
    <div class="border-t border-t-solid border-[#edf1f4] pt-4">
      <h3 class="m-0 mb-3 text-xs font-semibold">模拟运行控制</h3>
      <n-button
        size="small"
        block
        :type="selected.running ? 'default' : 'primary'"
        @click="state.toggleRunning"
        >{{ selected.running ? '模拟停机' : '模拟启动' }}</n-button
      ><n-select class="mt-3" v-model:value="fault" :options="faults" />
      <div class="flex gap-2 mt-2">
        <n-button size="small" type="warning" @click="state.injectFault">注入模拟异常</n-button
        ><n-button size="small" @click="state.recover">清除模拟异常</n-button>
      </div>
      <p class="mb-0 mt-3 text-[9px] leading-5 text-[#9cabb5]">
        操作仅影响本地演示数据。确认告警不会清除异常，清除异常后事件记录标记为已恢复。
      </p>
    </div>
  </aside>
</template>
