<script setup lang="ts">
import { cities, metrics, type City } from '../geo';
import type { GeoState } from '../composables/useGeoData';
defineProps<{ state: GeoState }>();
defineEmits<{ locate: [city: City] }>();
const regions = ['全部', ...new Set(cities.map((c) => c.region))].map((value) => ({
  label: value,
  value,
}));
</script>
<template>
  <aside
    class="bg-white rounded-xl border border-solid border-[#e0e8ed] p-4 flex flex-col gap-4 min-w-0"
  >
    <div class="font-bold">
      城市与指标
      <span class="text-xs text-slate-400 font-normal"
        >{{ state.filtered.value.length }} / {{ cities.length }}</span
      >
    </div>
    <n-input v-model:value="state.query.value" placeholder="搜索城市 / 英文标识" clearable />
    <n-select v-model:value="state.region.value" :options="regions" />
    <n-radio-group v-model:value="state.metric.value" size="small"
      ><n-radio-button value="volume">业务量</n-radio-button
      ><n-radio-button value="nodes">服务节点</n-radio-button></n-radio-group
    >
    <div class="text-xs text-slate-400">按指标降序 · 点击选择，定位按钮转向城市</div>
    <div class="max-h-[450px] overflow-auto flex flex-col gap-2">
      <div
        v-for="(city, index) in state.filtered.value"
        :key="city.id"
        class="city-row rounded-lg p-2 border border-solid"
        :class="
          state.selectedId.value === city.id ? 'border-teal-400 bg-teal-50' : 'border-slate-100'
        "
      >
        <div class="flex items-center gap-2">
          <button
            class="flex-1 text-left bg-transparent border-0 cursor-pointer text-inherit"
            @click="state.selectedId.value = city.id"
          >
            <span class="text-xs text-slate-400 mr-2">{{ index + 1 }}</span
            >{{ city.name }}
            <span class="text-[10px] text-slate-400">{{ city.region }}</span></button
          ><n-button size="tiny" @click="$emit('locate', city)">定位</n-button>
        </div>
        <div class="mt-2 flex gap-2 items-center text-[10px] text-slate-500">
          <div class="h-1 flex-1 rounded bg-slate-100">
            <div
              class="h-full rounded bg-teal-500"
              :style="{ width: `${(city[state.metric.value] / state.max.value) * 100}%` }"
            ></div>
          </div>
          {{ city[state.metric.value] }} {{ metrics[state.metric.value].unit }}
        </div>
      </div>
      <n-empty v-if="!state.filtered.value.length" description="没有匹配的城市" class="py-8" />
    </div>
  </aside>
</template>
