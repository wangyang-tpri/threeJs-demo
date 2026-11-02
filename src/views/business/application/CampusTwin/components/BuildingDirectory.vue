<script setup lang="ts">
import type { CampusState } from '../composables/useCampus';
defineProps<{ state: CampusState }>();
defineEmits<{ locate: [id: string] }>();
</script>
<template>
  <aside
    class="min-w-0 bg-white rounded-xl border border-solid border-[#e0e8ed] p-4 flex flex-col gap-4"
  >
    <div class="font-bold text-sm">
      楼宇资产
      <span class="text-xs text-slate-400 font-normal">{{ state.filtered.value.length }} / 6</span>
    </div>
    <n-input
      v-model:value="state.query.value"
      placeholder="搜索楼宇名称 / 编号"
      clearable
    /><n-select
      v-model:value="state.use.value"
      :options="['全部', '办公', '机房', '生活', '公共'].map((value) => ({ label: value, value }))"
    />
    <div class="flex flex-col gap-2 max-h-[460px] overflow-auto">
      <div
        v-for="b in state.filtered.value"
        :key="b.id"
        class="campus-building rounded-lg p-3 border border-solid"
        :class="b.id === state.selectedId.value ? 'border-teal-400 bg-teal-50' : 'border-slate-100'"
      >
        <button
          class="bg-transparent border-0 cursor-pointer text-left p-0 text-inherit w-full"
          :aria-label="'选择' + b.id"
          @click="state.selectedId.value = b.id"
        >
          <div class="flex justify-between text-xs font-bold">
            {{ b.id }} {{ b.name
            }}<span
              class="text-[10px]"
              :class="state.faultIds.value.includes(b.id) ? 'text-red-500' : 'text-teal-600'"
              >{{ state.faultIds.value.includes(b.id) ? '异常' : '正常' }}</span
            >
          </div>
          <div class="text-[10px] mt-2 text-slate-400">
            {{ b.use }} · {{ b.floors }} 层 · {{ state.readings.value[b.id]!.power }} kW
          </div></button
        ><n-button size="tiny" class="mt-2" @click="$emit('locate', b.id)">定位楼宇</n-button>
      </div>
      <n-empty v-if="!state.filtered.value.length" description="没有匹配楼宇" class="py-6" />
    </div>
    <div class="text-[10px] text-slate-400 leading-5">
      筛选控制楼宇模型、标签与目录；顶部统计、能耗趋势和告警为全园区数据。道路及巡检路线保留。
    </div>
  </aside>
</template>
