<script setup lang="ts">
import { nextTick, ref } from 'vue';
import InventoryPanel from './components/InventoryPanel.vue';
import WarehouseViewport from './components/WarehouseViewport.vue';
import TransportPanel from './components/TransportPanel.vue';
import WarehouseLesson from './components/WarehouseLesson.vue';
import { useWarehouse } from './composables/useWarehouse';
import { inventoryCSV } from './warehouse';
const state = useWarehouse();
const { stats, job } = state;
const viewport = ref<InstanceType<typeof WarehouseViewport> | null>(null),
  showCode = ref(false),
  error = ref('');
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportInventory() {
  download(
    new Blob([inventoryCSV(state.filteredBins.value)], { type: 'text/csv;charset=utf-8' }),
    'warehouse-inventory.csv'
  );
}
async function capture() {
  const image = await viewport.value?.capture();
  if (image) download(image, 'warehouse-preview.png');
  else error.value = '截图失败，请稍后重试。';
}
async function reset() {
  state.reset();
  await nextTick();
  viewport.value?.fitView();
}
</script>
<template>
  <div
    class="warehouse-page h-full overflow-auto flex flex-col gap-4 bg-[#f6f8fa] p-5 max-[800px]:p-3 text-[#34515f]"
  >
    <header class="shrink-0 flex justify-between items-center flex-wrap gap-3">
      <div>
        <div class="text-[10px] tracking-[2px] font-bold text-[#2b897c]">
          WAREHOUSE INSIGHT / 仓储物流
        </div>
        <h1 class="m-0 mt-1 text-[24px] max-[800px]:text-xl font-bold">仓储物流可视化</h1>
        <p class="mb-0 mt-1 text-xs text-[#94a6b1]">从库位库存到搬运路径，让仓库运行看得见。</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <n-button size="small" @click="exportInventory">导出筛选库存</n-button
        ><n-button size="small" @click="capture">保存截图</n-button
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button
        ><n-button size="small" @click="reset">重置</n-button>
      </div>
    </header>
    <n-alert v-if="error" type="error" class="shrink-0" closable @close="error = ''">{{
      error
    }}</n-alert>
    <div class="warehouse-stats shrink-0 grid grid-cols-4 gap-3 max-[800px]:grid-cols-2">
      <div
        v-for="metric in [
          {
            label: '库位使用率',
            value: `${Math.round((stats.occupied / stats.total) * 100)}%`,
            hint: `${stats.occupied} / ${stats.total} 库位`,
          },
          { label: '库存总量', value: stats.quantity, hint: '件 · 演示库存' },
          { label: '低库存库位', value: stats.low, hint: '低于 12 件阈值' },
          { label: '冻结库位', value: stats.blocked, hint: '禁止入库 / 出库' },
        ]"
        :key="metric.label"
        class="rounded-lg border border-solid border-[#e1e9ed] bg-white px-4 py-3"
      >
        <span class="text-[10px] text-[#95a7b0]">{{ metric.label }}</span
        ><strong class="block text-[22px] font-semibold text-[#397d74] mt-1">{{
          metric.value
        }}</strong
        ><small class="text-[9px] text-[#a1afb7]">{{ metric.hint }}</small>
      </div>
    </div>
    <div
      class="warehouse-workspace grid grid-cols-[240px_minmax(280px,1fr)_266px] grow shrink-0 min-h-[660px] gap-4 max-[1200px]:grid-cols-[210px_minmax(0,1fr)] max-[800px]:flex max-[800px]:flex-col"
    >
      <InventoryPanel :state="state" /><WarehouseViewport
        ref="viewport"
        :state="state"
      /><TransportPanel
        :state="state"
        class="max-[1200px]:col-span-full"
        @focus="viewport?.fitView(true)"
      />
    </div>
    <WarehouseLesson v-if="showCode" :has-job="!!job" />
  </div>
</template>
