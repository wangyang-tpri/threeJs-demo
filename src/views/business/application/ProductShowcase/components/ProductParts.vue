<script setup lang="ts">
import { nextTick } from 'vue';
import { PARTS } from '../product';
import type { useProductState } from '../composables/useProductState';
const props = defineProps<{ state: ReturnType<typeof useProductState> }>();
const { selectedId, hiddenIds, isolated, selected } = props.state;
const emit = defineEmits<{ focus: []; fit: [] }>();
async function isolate() {
  props.state.toggleIsolation();
  await nextTick();
  if (props.state.isolated.value) emit('focus');
  else emit('fit');
}
async function restore() {
  props.state.restoreParts();
  await nextTick();
  emit('fit');
}
</script>
<template>
  <aside
    class="product-parts rounded-xl border border-solid border-[#e1e8ed] bg-white p-4 flex flex-col gap-4 min-w-0"
  >
    <div class="flex items-center justify-between">
      <h2 class="m-0 text-sm font-semibold">零件目录</h2>
      <n-button size="tiny" quaternary @click="restore">显示全部</n-button>
    </div>
    <div class="flex flex-col gap-2">
      <div
        v-for="(part, index) in PARTS"
        :key="part.id"
        class="product-part-row rounded-lg border border-solid flex items-center gap-1 p-1"
        :class="
          selectedId === part.id
            ? 'border-[#bfded4] bg-[#eef8f5]'
            : 'border-transparent bg-[#f7f9fb]'
        "
      >
        <button
          class="product-part flex-1 min-w-0 flex items-center gap-2 text-left border-none bg-transparent cursor-pointer p-2 focus-visible:outline-[#188a80]"
          :aria-label="`选择${part.name}`"
          @click="state.select(part.id)"
        >
          <span
            class="rounded-md bg-white w-7 h-7 shrink-0 flex items-center justify-center text-[10px] text-[#92a9b4]"
            >{{ String(index + 1).padStart(2, '0') }}</span
          ><span class="flex flex-col gap-1"
            ><strong class="text-xs font-medium text-[#456170]">{{ part.name }}</strong
            ><small class="text-[9px] text-[#9aacb5]">{{
              hiddenIds.includes(part.id)
                ? '已隐藏'
                : isolated && selectedId !== part.id
                  ? '隔离隐藏'
                  : '可见'
            }}</small></span
          >
        </button>
        <n-button
          size="tiny"
          quaternary
          :aria-label="`${hiddenIds.includes(part.id) ? '显示' : '隐藏'}${part.name}`"
          @click="state.togglePart(part.id)"
          >{{ hiddenIds.includes(part.id) ? '显示' : '隐藏' }}</n-button
        >
      </div>
    </div>
    <div class="border-t border-t-solid border-[#edf1f3] pt-4 mt-auto">
      <div class="text-[10px] text-[#25887d] tracking-[1px]">PART DETAILS / 零件信息</div>
      <template v-if="selected"
        ><h3 class="product-selected m-0 mt-2 text-base">{{ selected.name }}</h3>
        <p class="text-[10px] text-[#8ea3ac]">{{ selected.material }}</p>
        <p class="text-[11px] leading-6 text-[#859ba7]">{{ selected.description }}</p>
        <div class="flex gap-1 flex-wrap">
          <n-button size="small" @click="emit('focus')">聚焦零件</n-button
          ><n-button size="small" :type="isolated ? 'primary' : 'default'" @click="isolate">{{
            isolated ? '退出单件查看' : '单件查看'
          }}</n-button
          ><n-button size="small" quaternary @click="state.select(null)">取消</n-button>
        </div></template
      >
      <p v-else class="text-[11px] leading-6 text-[#96a8b3]">
        从目录或三维场景中选择零件，查看结构说明；拆解后可以选择内部组件。
      </p>
    </div>
  </aside>
</template>
