<script setup lang="ts">
import { computed, ref } from 'vue';
import { cities, distance } from '../geo';
import type { GeoState } from '../composables/useGeoData';
const props = defineProps<{ state: GeoState }>();
const destination = ref('london');
const target = computed(() => cities.find((c) => c.id === destination.value)!);
</script>
<template>
  <aside
    class="bg-white rounded-xl border border-solid border-[#e0e8ed] p-4 flex flex-col gap-4 min-w-0"
  >
    <div class="font-bold">城市详情与图层</div>
    <template v-if="state.selected.value">
      <div class="bg-slate-50 p-3 rounded-lg">
        <div class="font-bold text-xl">{{ state.selected.value.name }}</div>
        <div class="mt-1 text-xs text-slate-400">
          {{ state.selected.value.region }} · WGS84 经度 / 纬度
        </div>
        <div class="mt-2 text-sm">
          {{ state.selected.value.lon.toFixed(2) }}° / {{ state.selected.value.lat.toFixed(2) }}°
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          示例业务量<strong class="block mt-1 text-lg"
            >{{ state.selected.value.volume }} 万单</strong
          >
        </div>
        <div>
          服务节点<strong class="block mt-1 text-lg">{{ state.selected.value.nodes }} 个</strong>
        </div>
      </div>
      <div class="border-t border-solid border-slate-100 pt-3">
        <div class="text-xs mb-2">球面距离 · 目标城市</div>
        <n-select
          v-model:value="destination"
          :options="cities.map((c) => ({ label: c.name, value: c.id }))"
        />
        <div class="mt-2 font-bold text-teal-600">
          {{ Math.round(distance(state.selected.value, target)).toLocaleString() }} km
        </div>
        <p class="text-[10px] text-slate-400">平均地球半径计算的大圆距离，仅作教学参考。</p>
      </div>
    </template>
    <n-empty v-else description="请选择城市" />
    <label class="flex justify-between text-xs"
      >自动旋转<n-switch v-model:value="state.rotating.value" size="small"
    /></label>
    <label class="flex justify-between text-xs"
      >经纬网格<n-switch v-model:value="state.showGrid.value" size="small"
    /></label>
    <label class="flex justify-between text-xs"
      >流向连线<n-switch v-model:value="state.showRoutes.value" size="small"
    /></label>
    <label class="flex justify-between text-xs"
      >城市标签<n-switch v-model:value="state.showLabels.value" size="small"
    /></label>
    <div class="text-[11px] leading-6 text-slate-400 border-t border-solid border-slate-100 pt-3">
      全部指标为本地模拟数据，不代表实时统计。筛选同步影响城市标记、排行、统计和导出；连线从选中城市出发。
    </div>
  </aside>
</template>
