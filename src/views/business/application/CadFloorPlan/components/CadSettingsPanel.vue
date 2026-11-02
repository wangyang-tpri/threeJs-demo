<script setup lang="ts">
import { segmentLength, type Segment } from '../dxf';
import type { Measurement, ModelSettings, ViewMode } from '../types';
defineProps<{
  settings: ModelSettings;
  mode: ViewMode;
  selected: Segment | undefined;
  measurements: Measurement[];
}>();
const emit = defineEmits<{
  update: [settings: Partial<ModelSettings>];
  clearSelection: [];
  clearMeasurements: [];
  defaults: [];
}>();
function setNumber(key: 'height' | 'thickness', value: number | null) {
  if (value !== null && Number.isFinite(value)) emit('update', { [key]: value });
}
const toggles: {
  key: 'showFloor' | 'showGrid' | 'showDimensions' | 'showEdges' | 'colorByLayer';
  label: string;
}[] = [
  { key: 'showFloor', label: '地板（包围盒范围）' },
  { key: 'showGrid', label: '参考网格' },
  { key: 'showDimensions', label: '尺寸标注' },
  { key: 'showEdges', label: '墙体边线' },
  { key: 'colorByLayer', label: '按图层区分颜色' },
];
</script>

<template>
  <aside
    class="cad-settings rounded-xl border border-solid border-[#e3eaee] bg-white p-4 flex flex-col gap-4 min-w-0"
  >
    <div class="flex justify-between items-center">
      <h2 class="m-0 text-sm font-semibold">建模与检查</h2>
      <n-button size="tiny" quaternary @click="emit('defaults')">恢复参数</n-button>
    </div>
    <p class="m-0 text-[10px] text-[#93a6ad] leading-5">
      {{
        mode === '2d'
          ? '二维模式可预设墙体参数，切换三维后查看效果。'
          : '参数单位为米。修改后实时更新三维模型。'
      }}
    </p>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block mb-2 text-[11px] text-[#7f959d]">墙高 / m</label
        ><n-input-number
          class="cad-height"
          :value="settings.height"
          :min="0.1"
          :max="20"
          :step="0.1"
          @update:value="setNumber('height', $event)"
        />
      </div>
      <div>
        <label class="block mb-2 text-[11px] text-[#7f959d]">墙厚 / m</label
        ><n-input-number
          class="cad-thickness"
          :value="settings.thickness"
          :min="0.01"
          :max="2"
          :step="0.01"
          @update:value="setNumber('thickness', $event)"
        />
      </div>
    </div>
    <div>
      <div class="flex justify-between text-[11px] text-[#7f959d] mb-2">
        <span>墙体透明度</span><span>{{ Math.round(settings.opacity * 100) }}%</span>
      </div>
      <n-slider
        :value="settings.opacity * 100"
        :min="10"
        :max="100"
        :step="5"
        @update:value="emit('update', { opacity: $event / 100 })"
      />
    </div>
    <div class="flex justify-between items-center gap-3">
      <label class="text-[11px] text-[#7f959d] shrink-0">墙体底色</label
      ><n-color-picker
        :value="settings.wallColor"
        :show-alpha="false"
        :modes="['hex']"
        size="small"
        @update:value="emit('update', { wallColor: $event })"
      />
    </div>
    <div class="flex flex-col gap-3">
      <div
        v-for="toggle in toggles"
        :key="toggle.key"
        class="flex justify-between items-center gap-2"
      >
        <label class="text-[11px] text-[#7f959d]">{{ toggle.label }}</label
        ><n-switch
          size="small"
          :value="settings[toggle.key]"
          @update:value="emit('update', { [toggle.key]: $event })"
        />
      </div>
    </div>
    <div class="border-t border-t-solid border-[#edf1f3] pt-4">
      <div class="flex justify-between items-center">
        <h3 class="m-0 text-xs font-semibold">线段检查</h3>
        <n-button v-if="selected" size="tiny" quaternary @click="emit('clearSelection')"
          >取消选择</n-button
        >
      </div>
      <div
        v-if="selected"
        class="cad-selection mt-3 rounded-lg bg-[#f4f8f8] p-3 text-[11px] leading-6"
      >
        <strong class="text-[#347f78]">{{ segmentLength(selected).toFixed(3) }} m</strong>
        <div>图层：{{ selected.layer }}</div>
        <div>实体：{{ selected.type }} · {{ selected.entityId }}</div>
        <div>起点：({{ selected.a.map((n) => n.toFixed(2)).join(', ') }})</div>
        <div>终点：({{ selected.b.map((n) => n.toFixed(2)).join(', ') }})</div>
        <span class="text-[9px] text-[#9babb0]">坐标以图纸包围盒中心为原点</span>
      </div>
      <p v-else class="text-[10px] text-[#99a9af] leading-5">
        点击二维线段或三维墙体，查看长度、所属图层与实体信息。
      </p>
    </div>
    <div class="border-t border-t-solid border-[#edf1f3] pt-4">
      <div class="flex justify-between items-center">
        <h3 class="m-0 text-xs font-semibold">
          测量记录 <span class="text-[#a4b4b9] font-normal">{{ measurements.length }} / 20</span>
        </h3>
        <n-button
          v-if="measurements.length"
          size="tiny"
          quaternary
          @click="emit('clearMeasurements')"
          >清除测量</n-button
        >
      </div>
      <div
        v-if="measurements.length"
        class="cad-measurements flex flex-col gap-2 mt-3 max-h-[180px] overflow-auto"
      >
        <div
          v-for="(measurement, index) in measurements"
          :key="measurement.id"
          class="flex justify-between rounded-md bg-[#fff8ef] px-3 py-2 text-[11px]"
        >
          <span class="text-[#b7a082]">测量 {{ index + 1 }}</span
          ><strong class="text-[#b48246]">{{ measurement.distance.toFixed(3) }} m</strong>
        </div>
      </div>
      <p v-else class="text-[10px] leading-5 text-[#99a9af]">
        开启两点测距后依次点击两处位置，靠近端点时自动吸附。测量为 XY 平面距离。
      </p>
    </div>
  </aside>
</template>
