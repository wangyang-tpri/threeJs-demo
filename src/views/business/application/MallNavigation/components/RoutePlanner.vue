<script setup lang="ts">
import PlaceDetails from './PlaceDetails.vue';
import { DESTINATIONS, type FloorKey, type Place } from '../mall';
import type { MallRoute, NavigationStatus, RouteStep } from '../types';
const startId = defineModel<string>('startId', { required: true });
const endId = defineModel<string>('endId', { required: true });
defineProps<{
  plannedRoute: MallRoute | null;
  routeFloors: FloorKey[];
  routeSteps: RouteStep[];
  status: NavigationStatus;
  progress: number;
  error: string;
  selected: Place | undefined;
}>();
const emit = defineEmits<{ plan: []; swap: []; toggle: []; clear: []; floor: [floor: FloorKey] }>();
const placeOptions = DESTINATIONS.map((p) => ({ label: `${p.floor} · ${p.name}`, value: p.id }));
</script>

<template>
  <aside
    class="navigation panel border-[1px] border-solid border-[#e3eaee] rounded-[14px] bg-white overflow-hidden p-[18px] flex flex-col min-h-0 min-[1000.01px]:max-[1250px]:p-[14px] min-[720.01px]:max-[1000px]:p-[14px] max-[720px]:overflow-visible max-[720px]:p-[14px]"
  >
    <div
      class="panel-heading flex justify-between items-center mb-[18px] min-[720.01px]:max-[1000px]:mb-[10px] max-[720px]:mb-[10px]"
    >
      <h2 class="text-[15px] font-650 m-0">路线规划</h2>
      <span class="small-badge text-[10px] text-[#52897f] p-[4px_7px] bg-[#f0f7f5] rounded-[5px]"
        >室内步行</span
      >
    </div>
    <div class="endpoint flex gap-[10px] items-center">
      <span
        class="endpoint-dot start w-[8px] h-[8px] border-[2px] border-solid border-[#188a80] rounded-[50%] shrink-0 mt-[16px]"
      ></span>
      <div class="flex-1 min-w-[0]">
        <label class="block text-[#97a3aa] text-[10px] mb-[6px]">从哪里出发</label
        ><n-select v-model:value="startId" :options="placeOptions" filterable :clearable="false" />
      </div>
    </div>
    <button
      class="swap-button cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] self-end bg-transparent border-0 border-none border-current text-[10px] text-[#8d9fa5] p-[10px_0] focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
      aria-label="交换起点和终点"
      @click="emit('swap')"
    >
      ⇅ 交换起终点
    </button>
    <div class="endpoint flex gap-[10px] items-center">
      <span
        class="endpoint-dot end w-[8px] h-[8px] border-[2px] border-solid border-[#e99c70] rounded-[50%] shrink-0 mt-[16px]"
      ></span>
      <div class="flex-1 min-w-[0]">
        <label class="block text-[#97a3aa] text-[10px] mb-[6px]">想去哪里</label
        ><n-select v-model:value="endId" :options="placeOptions" filterable :clearable="false" />
      </div>
    </div>
    <n-button class="plan-button mt-[20px]" type="primary" block @click="emit('plan')"
      >规划路线 ↗</n-button
    >
    <p v-if="error" class="error text-[#cf6a4a] text-[11px]" role="alert">{{ error }}</p>
    <template v-if="plannedRoute">
      <div class="route-summary flex gap-[28px] bg-[#f0f8f5] p-[14px] rounded-[9px] mt-[18px]">
        <div class="flex flex-col gap-[5px]">
          <strong class="text-[#188a80] text-[23px] font-650"
            >{{ Math.round(plannedRoute.distance)
            }}<small class="text-[10px] font-normal"> 米</small></strong
          ><span class="text-[#8eaaa3] text-[9px]">预计路程</span>
        </div>
        <div class="flex flex-col gap-[5px]">
          <strong class="text-[#188a80] text-[23px] font-650"
            >{{
              Math.max(
                1,
                Math.ceil((plannedRoute.distance / 1.2 + (routeFloors.length - 1) * 30) / 60)
              )
            }}<small class="text-[10px] font-normal"> 分钟</small></strong
          ><span class="text-[#8eaaa3] text-[9px]">含电梯等待估算</span>
        </div>
      </div>
      <div class="route-title text-[11px] text-[#4d7370] m-[14px_0] flex justify-between">
        {{ routeFloors.join(' → ') }}
        <span class="text-[#9ca9af] text-[10px]">{{
          routeFloors.length > 1 ? '乘坐电梯' : '同层步行'
        }}</span>
      </div>
      <ol class="route-steps p-[0] list-none m-[0_0_16px]">
        <li
          class="flex gap-[9px] m-[10px_0] items-start text-[#7f919a] text-[11px] leading-[1.7]"
          v-for="(step, index) in routeSteps"
          :key="index"
        >
          <button
            class="cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] bg-[#f0f5f5] border-0 border-none border-current rounded-[4px] p-[1px_5px] text-[#4e8b81] text-[10px] shrink-0 focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
            @click="emit('floor', step.floor)"
          >
            {{ step.floor }}</button
          ><span>{{ step.text }}</span>
        </li>
      </ol>
      <n-progress type="line" :percentage="progress" :show-indicator="false" color="#188a80" />
      <div class="simulation-status text-[10px] text-[#7c9d93] m-[7px_0_10px]" aria-live="polite">
        {{
          status === 'arrived'
            ? '已到达目的地'
            : status === 'playing'
              ? `导航演示中 · ${progress}%`
              : status === 'paused'
                ? `已暂停 · ${progress}%`
                : '路线已就绪，开始探索吧'
        }}
      </div>
      <div class="simulation-actions flex gap-[5px] mb-[20px]">
        <n-button size="small" type="primary" @click="emit('toggle')">{{
          status === 'playing'
            ? '暂停演示'
            : status === 'arrived'
              ? '重新演示'
              : status === 'paused'
                ? '继续演示'
                : '开始导航演示'
        }}</n-button
        ><n-button size="small" quaternary @click="emit('clear')">清除</n-button>
      </div>
    </template>
    <div v-else class="route-placeholder text-center p-[18px_15px] text-[#9cabb1]">
      <span class="text-[42px] text-[#a5c5bd] block leading-[1.3]">⌁</span
      ><strong class="block text-[12px] text-[#788d95] mt-[8px]">下一站，想去哪里？</strong>
      <p class="text-[11px] leading-[1.8]">选择起点与终点，查看沿走廊通行的三维路线。</p>
    </div>
    <PlaceDetails
      :selected="selected"
      @set-start="startId = $event"
      @set-end="endId = $event"
      @locate="emit('floor', $event)"
    />
    <p class="data-note text-[9px] text-[#a3afb5] leading-[1.8] m-[18px_0_0]">
      示例布局与估算距离 · 导航为加速演示<br />真实使用需接入商场地图与室内定位。
    </p>
  </aside>
</template>
