<script setup lang="ts">
import { FINISHES } from '../product';
import type { useProductState } from '../composables/useProductState';
const props = defineProps<{ state: ReturnType<typeof useProductState> }>();
const { explode, finish, roughness, labels, wireframe, theme, playback, speed, elapsed } =
  props.state;
</script>
<template>
  <aside
    class="product-controls rounded-xl border border-solid border-[#e1e8ed] bg-white p-4 flex flex-col gap-5 min-w-0"
  >
    <h2 class="m-0 text-sm font-semibold">展示与拆解</h2>
    <div>
      <div class="flex justify-between text-[11px] text-[#8198a6] mb-3">
        <span>拆解程度</span
        ><strong class="product-explode text-[#188a80]">{{ Math.round(explode) }}%</strong>
      </div>
      <n-slider
        class="product-explode-slider"
        :value="explode"
        :min="0"
        :max="100"
        :step="1"
        @update:value="state.setExplode"
      />
      <div class="flex gap-2 mt-3">
        <n-button
          size="small"
          :type="explode === 0 ? 'primary' : 'default'"
          @click="state.setExplode(0)"
          >组装归位</n-button
        ><n-button
          size="small"
          :type="explode === 100 ? 'primary' : 'default'"
          @click="state.setExplode(100)"
          >全部拆解</n-button
        >
      </div>
    </div>
    <div class="rounded-lg bg-[#f2f8f6] p-3">
      <div class="flex justify-between items-center gap-2">
        <span class="text-[11px] text-[#588a7e]">拆解 → 观察 → 组装</span
        ><n-select
          class="!w-[78px]"
          size="small"
          v-model:value="speed"
          :options="[
            { label: '0.5×', value: 0.5 },
            { label: '1×', value: 1 },
            { label: '2×', value: 2 },
          ]"
        />
      </div>
      <n-progress
        class="mt-3"
        type="line"
        :percentage="Math.round((elapsed / 8) * 100)"
        :show-indicator="false"
        color="#188a80"
      />
      <div class="product-playback text-[10px] text-[#829e95] my-2" aria-live="polite">
        {{
          playback === 'playing'
            ? elapsed < 3
              ? '正在拆解…'
              : elapsed <= 5
                ? '结构观察中…'
                : '正在组装…'
            : playback === 'paused'
              ? '演示已暂停'
              : playback === 'done'
                ? '演示完成，产品已归位'
                : '演示时长约 8 秒，可随时暂停'
        }}
      </div>
      <n-button size="small" type="primary" block @click="state.togglePlayback">{{
        playback === 'playing'
          ? '暂停演示'
          : playback === 'paused'
            ? '继续演示'
            : playback === 'done'
              ? '重新演示'
              : '开始拆解演示'
      }}</n-button>
    </div>
    <div>
      <label class="block mb-3 text-[11px] text-[#8198a6]">机身配色</label>
      <div class="flex gap-3">
        <button
          v-for="item in FINISHES"
          :key="item.color"
          class="w-9 h-9 rounded-full border-2 border-solid cursor-pointer focus-visible:outline-[#188a80]"
          :class="[
            item.class,
            finish === item.color
              ? 'border-[#188a80] ring-2 ring-[#cce5dd] ring-offset-2'
              : 'border-white',
          ]"
          :aria-label="item.name"
          :title="item.name"
          @click="finish = item.color"
        ></button>
      </div>
      <p class="product-finish mb-0 mt-3 text-[10px] text-[#97aab4]">
        {{ FINISHES.find((item) => item.color === finish)?.name }}
      </p>
    </div>
    <div>
      <div class="flex justify-between mb-2 text-[11px] text-[#8198a6]">
        <span>机身表面粗糙度</span><span>{{ roughness.toFixed(2) }}</span>
      </div>
      <n-slider v-model:value="roughness" :min="0.1" :max="0.9" :step="0.05" />
      <p class="mb-0 mt-1 text-[9px] text-[#9babb5]">低值偏光滑，高值偏哑光</p>
    </div>
    <div class="border-t border-t-solid border-[#edf1f3] pt-4 flex flex-col gap-3">
      <div class="flex justify-between items-center text-[11px] text-[#8198a6]">
        <label>零件标签（拆解时显示）</label><n-switch size="small" v-model:value="labels" />
      </div>
      <div class="flex justify-between items-center text-[11px] text-[#8198a6]">
        <label>线框检查</label><n-switch size="small" v-model:value="wireframe" />
      </div>
      <div class="flex justify-between items-center text-[11px] text-[#8198a6]">
        <label>深色展台</label
        ><n-switch
          size="small"
          :value="theme === 'dark'"
          @update:value="theme = $event ? 'dark' : 'light'"
        />
      </div>
    </div>
    <p class="m-0 mt-auto text-[9px] text-[#9eafb8] leading-5">
      使用内置几何体构建结构示例，无需下载模型。演示零件关系，不代表真实装配尺寸。
    </p>
  </aside>
</template>
