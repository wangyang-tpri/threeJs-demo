<script setup lang="ts">
import { categoryStyles } from '../ui';
import type { Place, FloorKey } from '../mall';
defineProps<{ selected: Place | undefined }>();
const emit = defineEmits<{
  setStart: [id: string];
  setEnd: [id: string];
  locate: [floor: FloorKey];
}>();
</script>

<template>
  <div
    v-if="selected"
    class="place-detail border-t-[1px] border-t-solid border-t-[#eaf0f1] pt-[18px] mt-auto"
  >
    <div class="detail-eyebrow text-[9px] font-bold tracking-[1px] text-[#218b80]">
      店铺详情 / {{ selected.floor }}
    </div>
    <h3 class="text-[16px] m-[8px_0] flex justify-between items-center">
      {{ selected.name
      }}<span
        class="p-[3px_7px] rounded-[4px] text-[9px] font-normal"
        :class="categoryStyles[selected.category].tint"
        >{{ selected.category }}</span
      >
    </h3>
    <p class="text-[11px] leading-[1.8] text-[#91a0a8]">{{ selected.description }}</p>
    <div class="detail-actions flex gap-[5px]">
      <n-button size="small" @click="emit('setStart', selected.id)">设为起点</n-button
      ><n-button size="small" @click="emit('setEnd', selected.id)">设为终点</n-button
      ><n-button size="small" quaternary @click="emit('locate', selected.floor)">定位</n-button>
    </div>
  </div>
</template>
