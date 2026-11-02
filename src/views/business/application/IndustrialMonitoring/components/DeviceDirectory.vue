<script setup lang="ts">
import { deviceStatus, STATUS_CLASS, STATUS_LABEL } from '../monitoring';
import type { useMonitoring } from '../composables/useMonitoring';
const props = defineProps<{ state: ReturnType<typeof useMonitoring> }>();
const { search, filter, filteredDevices, selectedId } = props.state;
const filters = [
  { label: '全部设备', value: 'all' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];
</script>
<template>
  <aside
    class="industrial-directory rounded-xl border border-solid border-[#e1e9ee] bg-white p-4 flex flex-col gap-4 min-w-0"
  >
    <div class="flex justify-between items-center">
      <h2 class="m-0 text-sm font-semibold">设备目录</h2>
      <span class="text-[10px] text-[#92a6b0]">{{ filteredDevices.length }} / 6</span>
    </div>
    <n-input v-model:value="search" placeholder="搜索编号、设备名称…" clearable />
    <n-select v-model:value="filter" :options="filters" />
    <div class="flex flex-col gap-3">
      <button
        v-for="device in filteredDevices"
        :key="device.id"
        class="industrial-device text-left p-3 rounded-lg border border-solid cursor-pointer focus-visible:outline-[#188a80]"
        :class="
          device.id === selectedId
            ? 'border-[#acd8ca] bg-[#f0f8f5]'
            : 'border-[#edf2f5] bg-[#f8fafb]'
        "
        :aria-label="`选择${device.id}`"
        @click="state.select(device.id)"
      >
        <div class="flex justify-between items-center gap-1">
          <strong class="text-xs text-[#486775]">{{ device.name }}</strong
          ><span
            class="rounded px-1.5 py-1 text-[9px]"
            :class="STATUS_CLASS[deviceStatus(device)]"
            >{{ STATUS_LABEL[deviceStatus(device)] }}</span
          >
        </div>
        <small class="block mt-2 text-[9px] text-[#9aaeb8]"
          >{{ device.id }} · 温度 {{ device.reading.temperature.toFixed(1) }} °C</small
        >
      </button>
      <p v-if="!filteredDevices.length" class="text-center text-xs text-[#97aab4]">
        没有匹配的设备
      </p>
    </div>
    <p class="m-0 mt-auto text-[10px] leading-6 text-[#9babb5]">
      数据来自本地模拟，每秒采样一次。点击设备查看趋势、定位异常或执行模拟停机。
    </p>
  </aside>
</template>
