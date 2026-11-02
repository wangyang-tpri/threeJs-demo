<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import CadImportPanel from './components/CadImportPanel.vue';
import CadViewport from './components/CadViewport.vue';
import CadSettingsPanel from './components/CadSettingsPanel.vue';
import CadLesson from './components/CadLesson.vue';
import { defaultSettings, useCadPlan } from './composables/useCadPlan';
import InteriorDesignPanel from './components/InteriorDesignPanel.vue';
import { useInteriorDesign } from './composables/useInteriorDesign';
import type { FurnitureKind } from './interior';
import type { ModelSettings } from './types';

const viewport = ref<InstanceType<typeof CadViewport> | null>(null);
const showCode = ref(false);
const {
  drawing,
  sourceKind,
  sampleKind,
  mode,
  preset,
  unit,
  settings,
  activeLayers,
  selectedId,
  measuring,
  measureStart,
  measurements,
  uploading,
  loadProgress,
  error,
  notice,
  visibleSegments,
  bounds,
  totalLength,
  selected,
  layers,
  unitHint,
  loadSample,
  importFile,
  setMode,
  toggleLayer,
  selectAllLayers,
  toggleMeasuring,
  measurePoint,
  clearMeasurements,
  resetAll,
  exportDrawing,
  download,
} = useCadPlan();
const interior = useInteriorDesign(bounds, visibleSegments, () => settings.thickness);
watch([drawing, unit], () => {
  interior.reset();
});
watch(interior.enabled, (enabled) => {
  if (enabled) {
    measuring.value = false;
    measureStart.value = null;
    selectedId.value = null;
  }
});
function beginFurniture(kind: FurnitureKind) {
  measuring.value = false;
  measureStart.value = null;
  if (!visibleSegments.value.length) {
    interior.message.value = '请先显示至少一个图层再放置家具。';
    return;
  }
  interior.begin(kind);
}
function moveFurniture() {
  measuring.value = false;
  interior.cancel();
  interior.moving.value = true;
}
function toggleMeasureWithInterior() {
  interior.cancel();
  toggleMeasuring();
}
function exportInterior() {
  download(
    JSON.stringify(
      {
        version: 1,
        drawing: drawing.value.name,
        unit: 'm',
        walls: visibleSegments.value,
        design: interior.design.value,
      },
      null,
      2
    ),
    'cad-interior-design.json'
  );
}
async function importInterior(file: File) {
  if (file.size > 8 * 1024 * 1024) {
    error.value = '装修方案文件不能超过 8 MB。';
    return;
  }
  try {
    const data = JSON.parse(await file.text());
    if (
      data.version !== 1 ||
      data.unit !== 'm' ||
      data.drawing !== drawing.value.name ||
      JSON.stringify(data.walls) !== JSON.stringify(visibleSegments.value)
    )
      throw new Error('方案与当前图纸或可见墙段不匹配，请先恢复对应图纸、单位和图层。');
    interior.restore(data.design);
    error.value = '';
    interior.message.value = '装修方案已导入。';
  } catch (e) {
    error.value = e instanceof Error ? e.message : '方案读取失败。';
  }
}
const exportOptions = [
  { label: '当前平面图 · SVG', key: 'svg' },
  { label: '线段、参数与测量 · JSON', key: 'json' },
  { label: '当前视角 · PNG', key: 'png' },
];
function updateSettings(patch: Partial<ModelSettings>) {
  Object.assign(settings, patch);
}
async function resetPage() {
  interior.reset();
  interior.enabled.value = false;
  resetAll();
  await nextTick();
  viewport.value?.fitView();
}
async function handleExport(format: 'svg' | 'json' | 'png') {
  if (format !== 'png') {
    exportDrawing(format);
    return;
  }
  const image = await viewport.value?.capture();
  if (image) download(image, 'cad-preview.png', 'image/png');
  else error.value = '无法生成截图，请稍后重试。';
}
</script>

<template>
  <div
    class="cad-page flex flex-col h-full overflow-auto gap-4 bg-[#f6f8fa] p-5 max-[800px]:p-3 text-[#304a54]"
  >
    <header class="flex shrink-0 items-center justify-between flex-wrap gap-3">
      <div>
        <div class="text-[10px] font-bold tracking-[2px] text-[#238a80]">
          CAD STUDIO / 图纸可视化
        </div>
        <h1 class="m-0 mt-1 text-[24px] max-[800px]:text-xl font-bold">
          让平面图纸，立体呈现<span
            class="align-middle ml-3 border border-solid border-[#b3d7d0] rounded px-2 py-1 text-[10px] text-[#188a80]"
            >DXF → 3D</span
          >
        </h1>
        <p class="mb-0 mt-1 text-xs text-[#94a5ad]">
          保留实际尺寸，从图层检查、三维建模到室内装修设计。
        </p>
      </div>
      <div class="flex items-center flex-wrap gap-2">
        <n-button
          size="small"
          :type="interior.enabled.value ? 'primary' : 'default'"
          @click="interior.enabled.value = !interior.enabled.value"
          >{{ interior.enabled.value ? '退出装修编辑' : '室内装修设计' }}</n-button
        >
        <n-dropdown :options="exportOptions" @select="handleExport"
          ><n-button size="small">导出 ↓</n-button></n-dropdown
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button
        ><n-button size="small" @click="resetPage">重置</n-button>
      </div>
    </header>
    <n-alert v-if="error" class="cad-error shrink-0" type="error" closable @close="error = ''">{{
      error
    }}</n-alert>
    <n-alert
      v-else-if="notice"
      class="cad-notice shrink-0"
      type="success"
      closable
      @close="notice = ''"
      >{{ notice }}</n-alert
    >
    <div
      class="cad-workspace grid grid-cols-[246px_minmax(300px,1fr)_264px] gap-4 grow shrink-0 min-h-[650px] max-[1250px]:grid-cols-[220px_minmax(0,1fr)] max-[800px]:flex max-[800px]:flex-col"
    >
      <CadImportPanel
        :drawing="drawing"
        :source-kind="sourceKind"
        :sample-kind="sampleKind"
        :unit="unit"
        :unit-hint="unitHint"
        :layers="layers"
        :active-layers="activeLayers"
        :uploading="uploading"
        :progress="loadProgress"
        @import="importFile"
        @sample="loadSample"
        @unit="unit = $event"
        @layer="toggleLayer"
        @all-layers="selectAllLayers"
        @no-layers="activeLayers = []"
        @download-sample="exportDrawing('dxf')"
      />
      <CadViewport
        ref="viewport"
        :interior="interior"
        :segments="visibleSegments"
        :mode="mode"
        :preset="preset"
        :settings="settings"
        :selected-id="selectedId"
        :measuring="measuring"
        :measure-start="measureStart"
        :measurements="measurements"
        :bounds="bounds"
        :total-length="totalLength"
        @mode="setMode"
        @preset="preset = $event"
        @select="selectedId = $event"
        @measure="measurePoint"
        @toggle-measure="toggleMeasureWithInterior"
      />
      <InteriorDesignPanel
        v-if="interior.enabled.value"
        class="max-[1250px]:col-span-full"
        :state="interior"
        @place="beginFurniture"
        @move="moveFurniture"
        @export="exportInterior"
        @import="importInterior"
      />
      <CadSettingsPanel
        v-else
        class="max-[1250px]:col-span-full"
        :settings="settings"
        :mode="mode"
        :selected="selected"
        :measurements="measurements"
        @update="updateSettings"
        @clear-selection="selectedId = null"
        @clear-measurements="clearMeasurements"
        @defaults="updateSettings(defaultSettings())"
      />
    </div>
    <p class="cad-footnote m-0 shrink-0 text-[10px] text-[#9aabb1]">
      尺寸来自当前单位设置。中心线拉伸预览不自动识别门窗或房间；图层过滤与测距不会修改原始 DXF
      文件。装修方案独立保存，不修改原始墙线；导入方案需匹配当前图纸、单位和可见图层。
    </p>
    <CadLesson
      v-if="showCode"
      :interior="interior.enabled.value"
      :mode="mode"
      :height="settings.height"
      :thickness="settings.thickness"
      :name="drawing.name"
      :count="visibleSegments.length"
    />
  </div>
</template>
