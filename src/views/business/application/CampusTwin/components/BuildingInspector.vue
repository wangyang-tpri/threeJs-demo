<script setup lang="ts">
import type { CampusState } from '../composables/useCampus';
defineProps<{ state: CampusState }>();
</script>
<template>
  <aside
    class="campus-inspector min-w-0 bg-white rounded-xl border border-solid border-[#e0e8ed] p-4 flex flex-col gap-4"
  >
    <div class="font-bold text-sm">楼宇详情</div>
    <div class="bg-slate-50 p-3 rounded-lg">
      <div class="campus-selected font-bold text-lg">
        {{ state.selected.value.id }} {{ state.selected.value.name }}
      </div>
      <div class="mt-1 text-xs text-slate-400">
        {{ state.selected.value.use }} · {{ state.selected.value.floors }} 层 · 本地模拟
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="item in [
          { label: '实时功率', value: state.current.value.power + ' kW' },
          { label: '室内温度', value: state.current.value.temperature + ' °C' },
          { label: '在园人数', value: state.current.value.people + ' 人' },
          {
            label: '在线设备',
            value: state.current.value.online + ' / ' + state.selected.value.devices,
          },
        ]"
        :key="item.label"
      >
        <div class="text-[10px] text-slate-400">{{ item.label }}</div>
        <strong class="text-sm">{{ item.value }}</strong>
      </div>
    </div>
    <n-alert
      v-if="state.faultIds.value.includes(state.selectedId.value)"
      type="warning"
      :show-icon="false"
      >模拟异常：温度升高、部分设备离线。</n-alert
    >
    <div class="flex gap-2 flex-wrap">
      <n-button
        size="small"
        type="warning"
        :disabled="state.faultIds.value.includes(state.selectedId.value)"
        @click="state.inject"
        >注入模拟异常</n-button
      ><n-button
        size="small"
        :disabled="!state.faultIds.value.includes(state.selectedId.value)"
        @click="state.recover"
        >恢复设备</n-button
      >
    </div>
    <div class="text-[10px] leading-5 text-slate-400">
      异常为手动模拟事件，与真实设备无连接。恢复设备会结束异常，告警确认仅表示已读。
    </div>
    <div class="border-t border-solid border-slate-100 pt-3 flex flex-col gap-3">
      <label class="flex justify-between text-xs"
        >夜间场景<n-switch v-model:value="state.night.value" size="small" /></label
      ><label class="flex justify-between text-xs"
        >楼宇标签<n-switch v-model:value="state.labels.value" size="small" /></label
      ><label class="flex justify-between text-xs"
        >设备点位<n-switch v-model:value="state.devices.value" size="small" /></label
      ><label class="flex justify-between text-xs"
        >巡检路线<n-switch v-model:value="state.showRoute.value" size="small"
      /></label>
    </div>
  </aside>
</template>
