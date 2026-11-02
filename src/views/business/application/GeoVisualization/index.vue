<script setup lang="ts">
import { nextTick, ref } from 'vue';
import CityDirectory from './components/CityDirectory.vue';
import GeoViewport from './components/GeoViewport.vue';
import GeoInspector from './components/GeoInspector.vue';
import GeoLesson from './components/GeoLesson.vue';
import { useGeoData } from './composables/useGeoData';
import { geoJSON, type City } from './geo';
const state = useGeoData(),
  viewport = ref<InstanceType<typeof GeoViewport> | null>(null),
  showCode = ref(false),
  error = ref('');
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportData() {
  download(
    new Blob([JSON.stringify(geoJSON(state.filtered.value), null, 2)], {
      type: 'application/geo+json',
    }),
    'cities.geojson'
  );
}
async function capture() {
  const image = await viewport.value?.capture();
  if (image) download(image, 'geographic-visualization.png');
  else error.value = '截图生成失败，请稍后重试。';
}
function locate(city: City) {
  state.selectedId.value = city.id;
  viewport.value?.focus(city);
}
async function reset() {
  state.reset();
  await nextTick();
  viewport.value?.focus();
}
</script>
<template>
  <div
    class="geo-page h-full overflow-auto flex flex-col gap-4 bg-[#f6f8fa] p-5 max-[800px]:p-3 text-[#36525f]"
  >
    <header class="shrink-0 flex justify-between items-center gap-3 flex-wrap">
      <div>
        <div class="text-[10px] font-bold tracking-[2px] text-teal-600">GEO ATLAS / 地理数据</div>
        <h1 class="m-0 mt-1 text-2xl font-bold">地理数据可视化</h1>
        <p class="mb-0 mt-1 text-xs text-slate-400">
          在三维地球上探索城市分布、业务指标与空间联系。
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <n-button size="small" @click="exportData">导出 GeoJSON</n-button
        ><n-button size="small" @click="capture">保存截图</n-button
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button
        ><n-button size="small" @click="reset">重置</n-button>
      </div>
    </header>
    <n-alert v-if="error" type="error" closable class="shrink-0" @close="error = ''">{{
      error
    }}</n-alert>
    <div class="shrink-0 grid grid-cols-4 max-[800px]:grid-cols-2 gap-3">
      <div
        v-for="item in [
          { label: '可见城市', value: state.filtered.value.length, hint: '内置 17 座示例城市' },
          {
            label: state.metrics[state.metric.value].label + '合计',
            value: state.total.value.toLocaleString(),
            hint: state.metrics[state.metric.value].unit + ' · 本地模拟',
          },
          {
            label: '覆盖区域',
            value: new Set(state.filtered.value.map((c) => c.region)).size,
            hint: '按城市所在区域统计',
          },
          {
            label: '流向连线',
            value: state.showRoutes.value ? Math.max(0, state.filtered.value.length - 1) : 0,
            hint: '选中城市 → 其他可见城市',
          },
        ]"
        :key="item.label"
        class="bg-white rounded-lg border border-solid border-[#e0e8ed] px-4 py-3"
      >
        <div class="text-xs text-slate-400">{{ item.label }}</div>
        <div class="my-1 text-2xl font-bold">{{ item.value }}</div>
        <div class="text-[10px] text-slate-400">{{ item.hint }}</div>
      </div>
    </div>
    <div
      class="geo-workspace grow shrink-0 min-h-[600px] grid grid-cols-[240px_minmax(0,1fr)_250px] max-[1250px]:grid-cols-[220px_minmax(0,1fr)] max-[850px]:grid-cols-1 gap-4"
    >
      <CityDirectory :state="state" @locate="locate" /><GeoViewport
        ref="viewport"
        :state="state"
      /><GeoInspector :state="state" class="max-[1250px]:col-span-2 max-[850px]:col-span-1" />
    </div>
    <GeoLesson v-if="showCode" />
  </div>
</template>
