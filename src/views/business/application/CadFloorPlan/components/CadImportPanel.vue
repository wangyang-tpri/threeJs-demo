<script setup lang="ts">
import { ref } from 'vue';
import { UNIT_LABEL, type Drawing, type UnitChoice } from '../dxf';
defineProps<{
  drawing: Drawing;
  sampleKind: 'home' | 'office';
  sourceKind: 'sample' | 'upload';
  unit: UnitChoice;
  unitHint: string;
  layers: { name: string; count: number }[];
  activeLayers: string[];
  uploading: boolean;
  progress: number;
}>();
const emit = defineEmits<{
  import: [file: File];
  sample: [kind: 'home' | 'office'];
  unit: [unit: UnitChoice];
  layer: [name: string, visible: boolean];
  allLayers: [];
  noLayers: [];
  downloadSample: [];
}>();
const fileInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
const sampleOptions = [
  { label: '三居室 · 12 × 9 m', value: 'home' },
  { label: '开放办公 · 18 × 12 m', value: 'office' },
];
const unitOptions = [
  { label: '自动识别 DXF 单位', value: 'auto' },
  ...Object.entries(UNIT_LABEL).map(([value, label]) => ({ label, value })),
];
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) emit('import', file);
}
function onDrop(event: DragEvent) {
  dragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) emit('import', file);
}
</script>

<template>
  <aside
    class="cad-import rounded-xl border border-solid border-[#e3eaee] bg-white p-4 flex flex-col gap-4 min-w-0"
  >
    <div class="flex justify-between items-center">
      <h2 class="m-0 text-sm font-semibold">图纸与图层</h2>
      <span class="text-[10px] text-[#8da1a8]">DXF / ASCII</span>
    </div>
    <div
      class="cad-drop cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors"
      :class="dragging ? 'border-[#188a80] bg-[#e9f6f2]' : 'border-[#d5e5e7] bg-[#f7fbfa]'"
      role="button"
      tabindex="0"
      aria-label="导入 DXF 图纸"
      @click="fileInput?.click()"
      @keydown.enter.prevent="fileInput?.click()"
      @keydown.space.prevent="fileInput?.click()"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <div class="text-3xl text-[#188a80]">⇧</div>
      <strong class="block text-xs mt-2 text-[#3e716a]">点击或拖放 DXF 图纸</strong>
      <p class="mb-0 mt-2 text-[10px] leading-5 text-[#90a4aa]">
        支持直线、多段线、圆和圆弧<br />单文件不超过 8 MB
      </p>
    </div>
    <input
      ref="fileInput"
      class="hidden"
      type="file"
      accept=".dxf"
      aria-label="DXF 文件"
      @change="onFileChange"
    />
    <div v-if="uploading" class="text-xs text-[#188a80]" role="status">
      {{ progress < 60 ? '正在读取图纸…' : '正在解析实体…'
      }}<n-progress class="mt-2" type="line" :percentage="progress" :show-indicator="false" />
    </div>
    <div>
      <label class="mb-2 block text-[11px] text-[#879da4]">内置示例</label
      ><n-select
        :value="sourceKind === 'sample' ? sampleKind : null"
        :options="sampleOptions"
        placeholder="选择示例图纸"
        @update:value="emit('sample', $event)"
      /><n-button class="mt-2" size="tiny" quaternary @click="emit('downloadSample')"
        >下载示例 DXF ↗</n-button
      >
    </div>
    <div class="rounded-lg bg-[#f4f7f9] p-3">
      <div class="text-[10px] text-[#96a7ad]">
        当前图纸 · {{ sourceKind === 'sample' ? '内置示例' : '本地导入' }}
      </div>
      <strong class="cad-name block mt-1 text-xs break-all">{{ drawing.name }}</strong>
      <p class="mb-0 mt-2 text-[10px] text-[#8b9fa5]">
        {{ drawing.segments.length }} 段线 · {{ layers.length }} 个图层
      </p>
    </div>
    <div>
      <label class="mb-2 block text-[11px] text-[#879da4]">图纸单位（转换为米制建模）</label
      ><n-select :value="unit" :options="unitOptions" @update:value="emit('unit', $event)" />
      <p
        class="cad-unit-hint mb-0 mt-2 text-[10px] leading-5"
        :class="unit === 'auto' && !drawing.unit ? 'text-[#ba8640]' : 'text-[#8b9fa5]'"
      >
        {{ unitHint }}
      </p>
    </div>
    <div class="border-t border-t-solid border-[#eef2f4] pt-3">
      <div class="flex justify-between items-center">
        <h3 class="m-0 text-xs font-semibold">可见图层</h3>
        <div class="flex gap-1">
          <n-button size="tiny" quaternary @click="emit('allLayers')">全选</n-button
          ><n-button size="tiny" quaternary @click="emit('noLayers')">清空</n-button>
        </div>
      </div>
      <div class="cad-layers flex flex-col gap-2 mt-3 max-h-[220px] overflow-auto">
        <n-checkbox
          v-for="layer in layers"
          :key="layer.name"
          :checked="activeLayers.includes(layer.name)"
          @update:checked="emit('layer', layer.name, $event)"
          ><span class="text-xs break-all">{{ layer.name }}</span
          ><span class="ml-2 text-[10px] text-[#a4b1b5]">{{ layer.count }} 段</span></n-checkbox
        >
      </div>
      <p class="mb-0 mt-3 text-[10px] leading-5 text-[#98a9af]">
        三维模式会将可见线段作为墙体中心线。可隐藏家具、标注等参考图层。
      </p>
    </div>
    <n-collapse v-if="Object.keys(drawing.entityCounts).length || drawing.warnings.length"
      ><n-collapse-item title="解析报告" name="report"
        ><div class="text-[10px] leading-6 text-[#8a9ea5]">
          <div v-for="(count, type) in drawing.entityCounts" :key="type">
            {{ type }} · {{ count }} 个实体
          </div>
          <p v-for="warning in drawing.warnings" :key="warning" class="text-[#b58a4f]">
            {{ warning }}
          </p>
        </div></n-collapse-item
      ></n-collapse
    >
  </aside>
</template>
