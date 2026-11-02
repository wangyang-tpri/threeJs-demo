<script setup lang="ts">
import type { useWarehouse } from '../composables/useWarehouse';
import { useWarehouseScene } from '../composables/useWarehouseScene';
const props = defineProps<{ state: ReturnType<typeof useWarehouse> }>();
const { topView, labels, phase, job, filteredBins } = props.state;
const { containerRef, fitView, capture } = useWarehouseScene(props.state);
defineExpose({ fitView, capture });
</script>
<template>
  <main
    class="warehouse-viewport relative min-h-[640px] max-[800px]:min-h-[500px] border border-solid border-[#e0e8ed] rounded-xl overflow-hidden min-w-0"
  >
    <div
      ref="containerRef"
      class="warehouse-canvas absolute inset-0 [&_canvas]:block [&_canvas]:touch-none [&_canvas]:cursor-grab"
    ></div>
    <div class="absolute left-5 top-5 pointer-events-none">
      <div class="text-[10px] tracking-[2px] text-[#34877b]">WAREHOUSE / 三维仓库</div>
      <h2 class="m-0 mt-2 text-lg font-semibold text-[#405c6e]">A / B 区仓储空间</h2>
      <p class="mt-1 text-[10px] text-[#92a7b2]">
        8 组货架 · 3 层库位 · {{ filteredBins.length }} 个可见库位
      </p>
    </div>
    <div class="absolute right-4 top-5 flex flex-wrap gap-1 justify-end max-w-[185px]">
      <n-button size="small" @click="topView = !topView">{{
        topView ? '立体视角' : '俯视地图'
      }}</n-button
      ><n-button size="small" @click="fitView()">视角复位</n-button
      ><n-button size="small" @click="labels = !labels">{{
        labels ? '隐藏标牌' : '显示标牌'
      }}</n-button>
    </div>
    <div
      v-if="job"
      class="absolute left-5 top-[85px] rounded-lg border border-solid border-[#c3dfd5] bg-white/95 px-3 py-2 text-[11px] text-[#4e8c7b]"
    >
      AGV-01 · {{ phase }} · {{ job.binId }}
    </div>
    <div
      class="absolute left-5 bottom-5 right-5 flex flex-wrap justify-between gap-2 text-[10px] text-[#8ba2af]"
    >
      <div class="flex gap-3 rounded-lg bg-white/90 px-3 py-2">
        <span><i class="inline-block w-2 h-2 rounded-sm bg-[#759ab9] mr-1"></i>正常</span
        ><span><i class="inline-block w-2 h-2 rounded-sm bg-[#e1b16b] mr-1"></i>低库存</span
        ><span><i class="inline-block w-2 h-2 rounded-sm bg-[#b6c9d1] mr-1"></i>空位</span
        ><span><i class="inline-block w-2 h-2 rounded-sm bg-[#c88b8d] mr-1"></i>冻结</span>
      </div>
      <span class="self-end">拖动旋转 · 滚轮缩放 · 点击库位</span>
    </div>
  </main>
</template>
