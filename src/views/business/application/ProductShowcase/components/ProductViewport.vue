<script setup lang="ts">
import type { useProductState } from '../composables/useProductState';
import { useProductScene } from '../composables/useProductScene';
const props = defineProps<{ state: ReturnType<typeof useProductState> }>();
const { explode, preset, autoRotate, theme, isolated, visibleCount } = props.state;
const { containerRef, fitView, capture } = useProductScene(
  props.state,
  props.state.select,
  props.state.advance
);
defineExpose({ fitView, capture });
</script>
<template>
  <main
    class="product-viewport relative min-h-[640px] max-[800px]:min-h-[500px] rounded-xl border border-solid border-[#e1e8ed] overflow-hidden min-w-0"
  >
    <div
      ref="containerRef"
      class="product-canvas absolute inset-0 [&_canvas]:block [&_canvas]:touch-none [&_canvas]:cursor-grab"
    ></div>
    <div class="absolute left-5 top-5 pointer-events-none">
      <div class="text-[10px] tracking-[2px] text-[#45877e]">STRUCTURE / 结构探索</div>
      <h2
        class="m-0 mt-2 text-lg font-semibold"
        :class="theme === 'dark' ? 'text-[#d6e4ea]' : 'text-[#354f5d]'"
      >
        {{ isolated ? '零件独立查看' : explode > 1 ? '相机 · 拆解视图' : '相机 · 整机展示' }}
      </h2>
      <p class="m-0 mt-1 text-[10px] text-[#859daa]">
        程序化结构示例 · {{ visibleCount }} / 7 个可见零件
      </p>
    </div>
    <div class="absolute top-5 right-4 flex flex-wrap justify-end gap-1 max-w-[190px]">
      <n-button size="small" @click="fitView()">视角复位</n-button
      ><n-button
        size="small"
        :type="autoRotate ? 'primary' : 'default'"
        @click="autoRotate = !autoRotate"
        >{{ autoRotate ? '停止旋转' : '自动旋转' }}</n-button
      >
    </div>
    <div class="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
      <n-button
        v-for="view in [
          { key: 'perspective', name: '透视' },
          { key: 'front', name: '正面' },
          { key: 'back', name: '背面' },
          { key: 'top', name: '俯视' },
        ] as const"
        :key="view.key"
        size="small"
        :type="preset === view.key ? 'primary' : 'default'"
        @click="preset = view.key"
        >{{ view.name }}</n-button
      >
    </div>
    <div
      class="absolute left-5 bottom-5 right-5 pointer-events-none flex justify-between flex-wrap gap-2 text-[10px] text-[#8ca3b0]"
    >
      <span>拖动旋转 · 滚轮缩放 · 点击选择零件</span
      ><span>拆解 {{ Math.round(explode) }}% · 结构示意，非真实产品 CAD</span>
    </div>
  </main>
</template>
