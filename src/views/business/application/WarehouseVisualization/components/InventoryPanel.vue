<script setup lang="ts">
import { STATUS_LABEL, stockStatus } from '../warehouse';
import type { useWarehouse } from '../composables/useWarehouse';
const props = defineProps<{ state: ReturnType<typeof useWarehouse> }>();
const { search, area, filter, filteredBins, selectedId } = props.state;
const statuses = [
  { label: '全部状态', value: 'all' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];
</script>
<template>
  <aside
    class="warehouse-inventory rounded-xl border border-solid border-[#e0e8ed] bg-white p-4 flex flex-col gap-3 min-w-0"
  >
    <div class="flex justify-between items-center">
      <h2 class="m-0 text-sm font-semibold">库位与库存</h2>
      <span class="text-[10px] text-[#92a6b0]">{{ filteredBins.length }} / 72</span>
    </div>
    <n-input v-model:value="search" clearable placeholder="搜索库位、SKU、品名…" />
    <n-select
      v-model:value="area"
      :options="[
        { label: '全部区域', value: 'all' },
        { label: 'A区', value: 'A区' },
        { label: 'B区', value: 'B区' },
      ]"
    />
    <n-select v-model:value="filter" :options="statuses" />
    <div
      class="warehouse-bin-list flex-1 min-h-[300px] max-h-[600px] overflow-auto flex flex-col gap-2"
    >
      <button
        v-for="bin in filteredBins"
        :key="bin.id"
        class="warehouse-bin border border-solid rounded-lg p-3 text-left cursor-pointer focus-visible:outline-[#188a80]"
        :class="
          selectedId === bin.id
            ? 'border-[#a8d6c7] bg-[#eef8f5]'
            : 'border-[#edf1f4] bg-[#f8fafb] hover:bg-[#f1f6f8]'
        "
        @click="state.select(bin)"
      >
        <div class="flex justify-between gap-1">
          <strong class="text-xs text-[#3f6371]">{{ bin.id }}</strong
          ><span
            class="text-[9px]"
            :class="
              bin.blocked
                ? 'text-[#ba7477]'
                : bin.quantity < bin.threshold
                  ? 'text-[#b39250]'
                  : 'text-[#8ba0ae]'
            "
            >{{ STATUS_LABEL[stockStatus(bin)] }}</span
          >
        </div>
        <div class="mt-2 text-[10px] text-[#96a8b0]">{{ bin.name }} · {{ bin.sku }}</div>
        <div class="mt-1 text-[10px] text-[#839ba7]">
          {{ bin.quantity }} / {{ bin.capacity }} 件 · 第 {{ bin.level }} 层
        </div>
      </button>
      <div v-if="!filteredBins.length" class="py-10 text-center text-xs text-[#94a6b2]">
        没有匹配的库位
      </div>
    </div>
    <p class="m-0 text-[9px] text-[#9aabb3] leading-5">
      列表与三维库位联动。筛选只改变展示，不影响正在执行的任务。
    </p>
  </aside>
</template>
