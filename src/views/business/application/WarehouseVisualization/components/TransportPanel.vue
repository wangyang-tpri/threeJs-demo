<script setup lang="ts">
import { stockStatus, STATUS_LABEL } from '../warehouse';
import type { useWarehouse } from '../composables/useWarehouse';
const props = defineProps<{ state: ReturnType<typeof useWarehouse> }>();
const { selected, kind, amount, active, job, status, speed, progress, phase, error, logs } =
  props.state;
const emit = defineEmits<{ focus: [] }>();
</script>
<template>
  <aside
    class="warehouse-transport rounded-xl border border-solid border-[#e0e8ed] bg-white p-4 flex flex-col gap-4 min-w-0"
  >
    <h2 class="m-0 text-sm font-semibold">库位检查与搬运</h2>
    <div v-if="selected" class="warehouse-selected rounded-lg bg-[#f3f8f8] p-3">
      <div class="flex justify-between items-center">
        <strong class="text-xs text-[#3e7c73]">{{ selected.id }}</strong
        ><n-button size="tiny" quaternary @click="emit('focus')">定位</n-button>
      </div>
      <div class="mt-2 text-[11px] text-[#7d959f] leading-6">
        {{ selected.name }} · {{ selected.sku }}<br />{{ selected.area }} / 第 {{ selected.bay }} 列
        / 第 {{ selected.level }} 层<br />{{ STATUS_LABEL[stockStatus(selected)] }} ·
        {{ selected.quantity }} 件
      </div>
      <n-progress
        class="mt-2"
        type="line"
        :percentage="selected.quantity"
        :show-indicator="false"
      />
      <p class="mb-0 mt-2 text-[9px] text-[#9aaab1]">
        容量 {{ selected.capacity }} 件 · 补货阈值 {{ selected.threshold }} 件
      </p>
    </div>
    <div>
      <label class="block mb-2 text-[11px] text-[#8a9da8]">任务类型</label
      ><n-select
        v-model:value="kind"
        :disabled="active"
        :options="[
          { label: '出库：库位 → 作业区', value: 'outbound' },
          { label: '入库：作业区 → 库位', value: 'inbound' },
        ]"
      />
    </div>
    <div>
      <label class="block mb-2 text-[11px] text-[#8a9da8]">搬运数量 / 件</label
      ><n-input-number
        class="warehouse-amount"
        v-model:value="amount"
        :min="1"
        :max="100"
        :precision="0"
        :disabled="active"
      />
    </div>
    <n-button type="primary" block :disabled="active" @click="state.startJob"
      >规划并开始搬运</n-button
    >
    <p v-if="error" class="warehouse-error m-0 text-[11px] text-[#bf7c71]" role="alert">
      {{ error }}
    </p>
    <div v-if="job" class="rounded-lg border border-solid border-[#e5edea] p-3">
      <div class="text-[11px] text-[#528776]">
        任务 #{{ job.id }} · {{ job.kind === 'inbound' ? '入库' : '出库' }} {{ job.amount }} 件
      </div>
      <p class="text-[10px] text-[#96a9b1]">
        {{ job.binId }} · 往返 {{ (job.distance * 2).toFixed(1) }} m
      </p>
      <n-progress type="line" :percentage="progress" :show-indicator="false" color="#188a80" />
      <div class="warehouse-task-status my-2 text-[10px] text-[#6d9589]" aria-live="polite">
        {{ status === 'paused' ? '任务已暂停' : phase }} · {{ progress }}%
      </div>
      <div class="flex gap-1">
        <n-button v-if="active" size="small" @click="state.togglePause">{{
          status === 'paused' ? '继续搬运' : '暂停搬运'
        }}</n-button
        ><n-button size="small" quaternary @click="state.cancel">{{
          active ? '取消任务' : '清除路线'
        }}</n-button>
      </div>
    </div>
    <div class="flex justify-between items-center gap-2">
      <label class="text-[11px] text-[#8a9da8]">演示速度</label
      ><n-select
        class="!w-[86px]"
        v-model:value="speed"
        size="small"
        :options="[
          { label: '1×', value: 1 },
          { label: '2×', value: 2 },
          { label: '4×', value: 4 },
        ]"
      />
    </div>
    <p class="m-0 text-[9px] text-[#9dabb2] leading-5">
      完成往返后更新库存；暂停或取消不改变库存。车辆按货架外侧通道运输，装卸为示意动画。
    </p>
    <div class="border-t border-t-solid border-[#edf1f3] pt-3">
      <h3 class="m-0 text-xs font-semibold">完成记录</h3>
      <div
        v-if="logs.length"
        class="warehouse-logs mt-3 flex flex-col gap-2 max-h-[180px] overflow-auto"
      >
        <div
          v-for="log in logs"
          :key="log.id"
          class="bg-[#f7faf9] rounded p-2 text-[10px] text-[#829d95]"
        >
          #{{ log.id }} {{ log.binId }}<br />{{ log.kind === 'inbound' ? '入库' : '出库' }}
          {{ log.amount }} 件 · 结存 {{ log.quantity }} 件
        </div>
      </div>
      <p v-else class="text-[10px] text-[#a3b1b9]">暂无完成任务</p>
    </div>
  </aside>
</template>
