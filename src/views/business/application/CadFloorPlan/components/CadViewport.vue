<script setup lang="ts">
import { toRefs } from 'vue';
import { useCadScene } from '../composables/useCadScene';
import type { Bounds, Point, Segment } from '../dxf';
import type { Measurement, ModelSettings, ViewMode, ViewPreset } from '../types';
import type { InteriorState } from '../composables/useInteriorDesign';
const props = defineProps<{
  interior: InteriorState;
  segments: Segment[];
  mode: ViewMode;
  preset: ViewPreset;
  settings: ModelSettings;
  selectedId: string | null;
  measuring: boolean;
  measureStart: Point | null;
  measurements: Measurement[];
  bounds: Bounds;
  totalLength: number;
}>();
const { segments, mode, preset, selectedId, measuring, measureStart, measurements } = toRefs(props);
const emit = defineEmits<{
  mode: [mode: ViewMode];
  preset: [preset: ViewPreset];
  select: [id: string | null];
  measure: [point: Point];
  toggleMeasure: [];
}>();
const { containerRef, fitView, capture } = useCadScene({
  interior: props.interior,
  segments,
  mode,
  preset,
  settings: props.settings,
  selectedId,
  measuring,
  measureStart,
  measurements,
  onSelect: (id) => emit('select', id),
  onMeasure: (point) => emit('measure', point),
});
defineExpose({ fitView, capture });
</script>

<template>
  <main
    class="cad-viewport relative min-h-[600px] max-[800px]:min-h-[500px] rounded-xl border border-solid border-[#e3eaee] bg-[#f2f6f8] overflow-hidden min-w-0"
  >
    <div
      ref="containerRef"
      class="cad-canvas absolute inset-0 [&_canvas]:block [&_canvas]:touch-none"
      :class="
        measuring || interior.placing.value || interior.moving.value
          ? '[&_canvas]:cursor-crosshair'
          : '[&_canvas]:cursor-grab'
      "
    ></div>
    <div class="absolute left-4 top-4 right-4 flex justify-between items-start gap-2 flex-wrap">
      <div class="flex gap-1 bg-white/90 rounded-lg p-1 border border-solid border-[#e1eaee]">
        <n-button
          size="small"
          :type="mode === '2d' ? 'primary' : 'default'"
          @click="emit('mode', '2d')"
          >二维图纸</n-button
        ><n-button
          size="small"
          :type="mode === '3d' ? 'primary' : 'default'"
          @click="emit('mode', '3d')"
          >三维模型</n-button
        >
      </div>
      <div
        class="flex gap-1 flex-wrap bg-white/90 rounded-lg p-1 border border-solid border-[#e1eaee]"
      >
        <n-button
          size="small"
          :type="measuring ? 'warning' : 'default'"
          @click="emit('toggleMeasure')"
          >{{ measuring ? '结束测距' : '两点测距' }}</n-button
        ><n-button size="small" @click="fitView">适配视图</n-button>
      </div>
    </div>
    <div v-if="mode === '3d'" class="absolute right-4 top-[72px] flex flex-col gap-2">
      <n-button
        size="small"
        :type="preset === 'perspective' ? 'primary' : 'default'"
        @click="emit('preset', 'perspective')"
        >透视</n-button
      ><n-button
        size="small"
        :type="preset === 'top' ? 'primary' : 'default'"
        @click="emit('preset', 'top')"
        >俯视</n-button
      ><n-button
        size="small"
        :type="preset === 'front' ? 'primary' : 'default'"
        @click="emit('preset', 'front')"
        >正视</n-button
      >
    </div>
    <div
      v-if="measuring"
      class="absolute left-4 top-[72px] rounded-lg bg-[#fff5e6] px-3 py-2 text-[11px] text-[#b67b39] pointer-events-none"
    >
      {{ measureStart ? '选择第二个点 · 靠近端点自动吸附' : '选择第一个点 · 测量平面距离' }}
    </div>
    <div
      v-if="!segments.length"
      class="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-[#8b9ea7]"
    >
      <strong class="text-sm">当前没有可见线段</strong
      ><span class="text-xs mt-2">在左侧选择至少一个图层</span>
    </div>
    <div class="absolute left-4 bottom-[64px] text-[10px] text-[#8ea4ae] pointer-events-none">
      {{ mode === '2d' ? '正交俯视 · 拖动平移 · 滚轮缩放' : '拖动旋转 · 右键平移 · 滚轮缩放' }} ·
      {{ interior.enabled.value ? '点击家具选中 · 在右侧编辑位置、尺寸与配色' : '点击检查线段' }}
    </div>
    <div
      class="cad-metrics absolute left-4 bottom-4 right-4 flex flex-wrap gap-x-5 gap-y-2 rounded-lg border border-solid border-[#e0e9ec] bg-white/95 px-4 py-3 text-[10px]"
    >
      <span class="text-[#8fa3ab]"
        >可见线段 <strong class="ml-1 text-[#397c77]">{{ segments.length }}</strong></span
      ><span class="text-[#8fa3ab]"
        >范围
        <strong class="ml-1 text-[#397c77]"
          >{{ bounds.width.toFixed(2) }} × {{ bounds.depth.toFixed(2) }} m</strong
        ></span
      ><span class="text-[#8fa3ab]"
        >中心线总长
        <strong class="ml-1 text-[#397c77]">{{ totalLength.toFixed(2) }} m</strong></span
      >
    </div>
  </main>
</template>
