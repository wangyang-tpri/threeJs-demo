<script setup lang="ts">
import { ref } from 'vue';
import type { GeoState } from '../composables/useGeoData';
import { useGeoScene } from '../composables/useGeoScene';
const props = defineProps<{ state: GeoState }>();
const container = ref<HTMLDivElement | null>(null);
const { focus, capture } = useGeoScene(container, props.state);
defineExpose({ focus, capture });
</script>
<template>
  <section class="geo-viewport relative min-h-[560px] overflow-hidden rounded-xl bg-[#071526]">
    <div ref="container" class="absolute inset-0 touch-none"></div>
    <div class="absolute left-4 top-4 pointer-events-none text-[#c6e5ee]">
      <div class="text-[10px] tracking-[3px] text-[#69c8c0]">GLOBAL DATA ATLAS</div>
      <div class="mt-2 text-lg font-bold">
        {{ state.selected.value?.name ?? '暂无城市' }}
        <span class="text-xs font-normal">/ 连线起点</span>
      </div>
    </div>
    <n-button class="!absolute right-4 top-4 !text-[#c6e5ee]" size="small" @click="focus()">复位视角</n-button>
    <div
      class="absolute bottom-4 left-4 right-4 pointer-events-none text-[11px] leading-6 text-[#91b1c3]"
    >
      <div>
        <span class="inline-block h-2 w-2 rounded-full bg-[#ffd380] mr-2"></span>选中城市 · 柱高 /
        颜色表示{{ state.metrics[state.metric.value].label }} · 连线为业务流向示意
      </div>
      <div>拖动旋转 · 滚轮缩放 · 点击城市切换起点。简化大陆轮廓，不表达国界。</div>
    </div>
  </section>
</template>
