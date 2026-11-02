<script setup lang="ts">
import { furnitureCatalog, type FurnitureKind } from '../interior';
import type { InteriorState } from '../composables/useInteriorDesign';
defineProps<{ state: InteriorState }>();
const emit = defineEmits<{
  place: [kind: FurnitureKind];
  move: [];
  export: [];
  import: [file: File];
}>();
function fileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) emit('import', input.files[0]);
  input.value = '';
}
</script>
<template>
  <aside
    class="cad-interior-panel min-w-0 rounded-xl border border-solid border-[#e3eaee] bg-white p-4 flex flex-col gap-4"
  >
    <div class="font-bold text-sm">
      室内装修设计
      <span class="text-xs font-normal text-slate-400"
        >{{ state.design.value.items.length }} / 100 件</span
      >
    </div>
    <div class="grid grid-cols-3 gap-2">
      <n-button
        v-for="(item, kind) in furnitureCatalog"
        :key="kind"
        size="small"
        :type="state.placing.value === kind ? 'primary' : 'default'"
        @click="emit('place', kind)"
        >{{ item.name }}</n-button
      >
    </div>
    <div
      v-if="state.placing.value || state.moving.value"
      class="rounded bg-amber-50 p-2 text-xs text-amber-700"
    >
      {{
        state.moving.value
          ? '点击地面移动选中家具'
          : '点击地面放置' + furnitureCatalog[state.placing.value!].name
      }}<n-button text size="tiny" class="ml-2" @click="state.cancel">取消</n-button>
    </div>
    <label class="flex justify-between text-xs"
      >矮墙预览<n-switch v-model:value="state.cutaway.value" size="small"
    /></label>
    <label class="flex justify-between text-xs"
      >位置吸附 · 0.1 m<n-switch v-model:value="state.snap.value" size="small"
    /></label>
    <div class="flex gap-2 flex-wrap">
      <n-button size="tiny" :disabled="!state.history.value.length" @click="state.travel(true)"
        >撤销</n-button
      ><n-button size="tiny" :disabled="!state.future.value.length" @click="state.travel(false)"
        >重做</n-button
      ><n-popconfirm @positive-click="state.clear"
        ><template #trigger
          ><n-button size="tiny" :disabled="!state.design.value.items.length"
            >清空家具</n-button
          ></template
        >清空当前家具？可以撤销恢复。</n-popconfirm
      >
    </div>
    <div class="border-t border-solid border-slate-100 pt-3">
      <div class="text-xs font-bold mb-2">地面材质 · 图纸包围范围</div>
      <n-select
        :value="state.design.value.floor"
        :options="[
          { label: '木地板', value: 'wood' },
          { label: '瓷砖 · 600 mm', value: 'tile' },
          { label: '纯色', value: 'plain' },
        ]"
        @update:value="state.surface({ floor: $event })"
      />
      <div class="flex justify-between items-center mt-2 text-xs">
        地面配色<input
          type="color"
          :value="state.design.value.floorColor"
          aria-label="地面配色"
          @input="state.surface({ floorColor: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>
    <div class="border-t border-solid border-slate-100 pt-3">
      <div class="text-xs font-bold mb-2">家具清单 · 点击场景也可选中</div>
      <n-select
        :value="state.selectedId.value"
        placeholder="选择已放置家具"
        clearable
        :options="
          state.design.value.items.map((f, i) => ({
            label: `${i + 1}. ${furnitureCatalog[f.kind].name}`,
            value: f.id,
          }))
        "
        @update:value="state.selectedId.value = $event"
      />
    </div>
    <div v-if="state.selected.value" class="interior-editor flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-2">
        <label
          v-for="field in [
            { key: 'x', label: 'X / m', min: -100000, max: 100000 },
            { key: 'y', label: 'Y / m', min: -100000, max: 100000 },
            { key: 'width', label: '宽 / m', min: 0.1, max: 10 },
            { key: 'depth', label: '深 / m', min: 0.1, max: 10 },
            { key: 'height', label: '高 / m', min: 0.1, max: 10 },
          ] as const"
          :key="field.key"
          class="text-[10px] text-slate-400"
          >{{ field.label
          }}<n-input-number
            :value="state.selected.value[field.key]"
            :min="field.min"
            :max="field.max"
            :step="0.1"
            size="small"
            @update:value="(v: number | null) => v !== null && state.patch({ [field.key]: v })"
        /></label>
      </div>
      <label class="text-xs"
        >旋转 / °<n-input-number
          :value="state.selected.value.rotation"
          :min="-360"
          :max="360"
          :step="15"
          size="small"
          @update:value="(v: number | null) => v !== null && state.patch({ rotation: v })"
      /></label>
      <label class="flex justify-between items-center text-xs"
        >家具颜色<input
          type="color"
          :value="state.selected.value.color"
          aria-label="家具颜色"
          @input="state.patch({ color: ($event.target as HTMLInputElement).value })"
      /></label>
      <div class="flex gap-2 flex-wrap">
        <n-button size="tiny" @click="emit('move')">移动位置</n-button
        ><n-button
          size="tiny"
          :disabled="state.design.value.items.length >= 100"
          @click="state.duplicate"
          >复制</n-button
        ><n-button size="tiny" type="error" secondary @click="state.remove">删除</n-button>
      </div>
    </div>
    <div
      v-if="state.warnings.value.length"
      class="interior-warnings rounded bg-amber-50 p-2 text-[11px] text-amber-700 max-h-[110px] overflow-auto"
    >
      <div v-for="item in state.warnings.value" :key="item.id">
        {{ item.name }}：{{ item.messages.join('、') }}
      </div>
    </div>
    <div class="text-xs text-slate-400">
      家具参考预算
      <strong class="text-teal-700">¥ {{ state.budget.value.toLocaleString() }}</strong>
      <p class="text-[10px] mb-0">
        按示例单价估算，不含装修工程费用。碰撞基于家具占地矩形和可见墙段；包围范围不等于房间边界。
      </p>
    </div>
    <div class="flex gap-2">
      <n-button size="small" @click="emit('export')">导出方案</n-button
      ><label class="cursor-pointer border border-solid border-slate-200 rounded px-3 py-1 text-xs"
        >导入方案<input
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="fileChange"
      /></label>
    </div>
    <n-alert v-if="state.message.value" type="info" closable @close="state.message.value = ''">{{
      state.message.value
    }}</n-alert>
    <p class="m-0 text-[10px] leading-5 text-slate-400">
      点击目录后在地面放置。二维便于布置，三维检查效果。切换图纸或单位会清空方案；关闭装修编辑仅隐藏家具。
    </p>
  </aside>
</template>
