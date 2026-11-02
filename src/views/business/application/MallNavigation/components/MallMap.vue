<script setup lang="ts">
import { toRefs } from 'vue';
import { FLOORS, type FloorKey, type Place } from '../mall';
import { categoryStyles } from '../ui';
import type { MallRoute, NavigationStatus } from '../types';
import { useMallScene } from '../composables/useMallScene';
const activeFloor = defineModel<FloorKey | 'all'>('activeFloor', { required: true });
const exploded = defineModel<boolean>('exploded', { required: true });
const topView = defineModel<boolean>('topView', { required: true });
const props = defineProps<{
  selectedId: string;
  plannedRoute: MallRoute | null;
  traveled: number;
  status: NavigationStatus;
}>();
const { selectedId, plannedRoute, traveled, status } = toRefs(props);
const emit = defineEmits<{ select: [place: Place]; advance: [delta: number] }>();
const { containerRef, fitCamera } = useMallScene({
  activeFloor,
  exploded,
  topView,
  selectedId,
  plannedRoute,
  traveled,
  status,
  onSelectPlace: (place) => emit('select', place),
  onAnimate: (delta) => emit('advance', delta),
});
defineExpose({ fitCamera });
</script>

<template>
  <main
    class="map-panel panel border-[1px] border-solid border-[#e3eaee] rounded-[14px] bg-[#f1f5f7] overflow-hidden relative min-h-[560px] max-[720px]:min-h-[460px]"
  >
    <div
      ref="containerRef"
      class="scene-container absolute inset-0 [&_canvas]:block [&_canvas]:touch-none"
    ></div>
    <div class="map-heading absolute left-[22px] top-[22px] pointer-events-none">
      <span class="map-status text-[#24897e] text-[10px] tracking-[1px]">● 三维地图</span>
      <h2 class="text-[18px] font-650 m-0 mt-[10px]">
        {{
          activeFloor === 'all'
            ? '商场全景'
            : `${activeFloor} · ${FLOORS.find((f) => f.key === activeFloor)?.name}`
        }}
      </h2>
      <p class="text-[#98a6ae] text-[11px] m-[5px_0]">
        {{
          activeFloor === 'all'
            ? '查看跨楼层动线'
            : FLOORS.find((f) => f.key === activeFloor)?.subtitle
        }}
      </p>
    </div>
    <div
      class="map-tools absolute top-[20px] right-[16px] flex flex-wrap justify-end gap-[5px] max-w-[180px] max-[720px]:top-[100px]"
    >
      <button
        class="cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] border-[1px] border-solid rounded-[7px] text-[10px] p-[7px_10px] focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
        :class="
          topView
            ? 'bg-[#188a80] text-white border-[#188a80]'
            : 'bg-[#ffffffed] text-[#70858e] border-[#e1e8ec]'
        "
        @click="topView = !topView"
      >
        {{ topView ? '立体视角' : '俯视地图' }}</button
      ><button
        class="cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] border-[1px] border-solid rounded-[7px] text-[10px] p-[7px_10px] focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
        v-if="activeFloor === 'all'"
        :class="
          exploded
            ? 'bg-[#188a80] text-white border-[#188a80]'
            : 'bg-[#ffffffed] text-[#70858e] border-[#e1e8ec]'
        "
        @click="exploded = !exploded"
      >
        {{ exploded ? '合拢楼层' : '展开楼层' }}</button
      ><button
        class="cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] bg-[#ffffffed] border-[1px] border-solid border-[#e1e8ec] rounded-[7px] text-[#70858e] text-[10px] p-[7px_10px] focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
        @click="fitCamera"
      >
        视角复位
      </button>
    </div>
    <div
      class="floor-switch absolute right-[16px] top-[50%] -translate-y-1/2 flex flex-col gap-[5px] p-[6px] border-[1px] border-solid border-[#e3e9ed] bg-[#ffffffb8] rounded-[10px]"
    >
      <button
        class="cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] border-[1px] border-solid rounded-[7px] text-[10px] p-[10px] min-w-[42px] font-650 focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
        :class="
          activeFloor === 'all'
            ? 'bg-[#188a80] text-white border-[#188a80]'
            : 'bg-[#ffffffed] text-[#70858e] border-transparent'
        "
        @click="activeFloor = 'all'"
      >
        全景</button
      ><button
        class="cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] border-[1px] border-solid rounded-[7px] text-[10px] p-[10px] min-w-[42px] font-650 focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
        v-for="floor in [...FLOORS].reverse()"
        :key="floor.key"
        :class="
          activeFloor === floor.key
            ? 'bg-[#188a80] text-white border-[#188a80]'
            : 'bg-[#ffffffed] text-[#70858e] border-transparent'
        "
        @click="activeFloor = floor.key"
      >
        {{ floor.key }}
      </button>
    </div>
    <div
      class="map-legend absolute bottom-[20px] left-[20px] flex gap-[12px] p-[10px_13px] bg-[#ffffffdb] border-[1px] border-solid border-[#e7edef] rounded-[8px]"
    >
      <span
        class="flex items-center gap-[5px] text-[10px] text-[#84959e]"
        v-for="(styles, name) in categoryStyles"
        :key="name"
        ><i class="w-[7px] h-[7px] rounded-[2px]" :class="styles.solid"></i>{{ name }}</span
      ><span class="flex items-center gap-[5px] text-[10px] text-[#84959e]" v-if="plannedRoute"
        ><i class="w-[7px] h-[7px] rounded-[2px] bg-[#188a80]"></i>路线</span
      >
    </div>
    <div
      class="map-help absolute bottom-[64px] left-[22px] text-[#93a4ad] text-[10px] pointer-events-none"
    >
      拖动旋转 · 滚轮缩放 · 点击店铺
    </div>
  </main>
</template>
