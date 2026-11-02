<script setup lang="ts">
import { ref } from 'vue';
import RunnerViewport from './components/RunnerViewport.vue';
import GameGuide from './components/GameGuide.vue';
import GameLesson from './components/GameLesson.vue';
import { useRunner } from './composables/useRunner';
import { difficulties } from './game';
const root = ref<HTMLElement | null>(null),
  showCode = ref(false),
  state = useRunner(root);
</script>
<template>
  <div
    ref="root"
    tabindex="0"
    class="runner-page outline-none h-full overflow-auto flex flex-col gap-4 bg-[#f6f8fa] p-5 max-[800px]:p-3 text-[#36525f]"
  >
    <header class="shrink-0 flex justify-between items-center flex-wrap gap-3">
      <div>
        <div class="text-[10px] tracking-[2px] font-bold text-teal-600">PLAY LAB / 网页小游戏</div>
        <h1 class="m-0 mt-1 text-2xl font-bold">城市跑酷</h1>
        <p class="mb-0 mt-1 text-xs text-slate-400">在三维城市中换道、跳跃，冲向 1000 米终点。</p>
      </div>
      <div class="flex gap-2">
        <n-button
          size="small"
          :disabled="!['running', 'paused'].includes(state.game.phase)"
          @click="state.togglePause"
          >{{ state.game.phase === 'paused' ? '继续' : '暂停' }}</n-button
        ><n-popconfirm positive-text="确认" negative-text="取消" @positive-click="state.start"
          ><template #trigger
            ><n-button size="small" :disabled="state.game.phase === 'ready'" @click="state.pause"
              >重新开始</n-button
            ></template
          >重新开始本局？当前得分会计入最高分。</n-popconfirm
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button>
      </div>
    </header>
    <div class="shrink-0 grid grid-cols-4 max-[800px]:grid-cols-2 gap-3">
      <div
        v-for="item in [
          {
            label: '当前得分',
            value: state.currentScore.value.toLocaleString(),
            hint: '距离分 + 金币分',
          },
          { label: '收集金币', value: state.game.coins, hint: '每枚 +50 分' },
          {
            label: '前进距离',
            value: Math.floor(state.game.distance) + ' m',
            hint: '通关目标 1000 m',
          },
          {
            label: '当前速度',
            value: state.currentSpeed.value.toFixed(1) + ' m/s',
            hint: difficulties[state.game.difficulty].label + ' · 随距离提升',
          },
        ]"
        :key="item.label"
        class="rounded-lg border border-solid border-[#e0e8ed] bg-white px-4 py-3"
      >
        <div class="text-xs text-slate-400">{{ item.label }}</div>
        <div class="mt-1 text-2xl font-bold">{{ item.value }}</div>
        <div class="mt-1 text-[10px] text-slate-400">{{ item.hint }}</div>
      </div>
    </div>
    <div
      class="runner-workspace grow shrink-0 min-h-[590px] grid grid-cols-[minmax(0,1fr)_280px] max-[1000px]:grid-cols-1 gap-4"
    >
      <RunnerViewport :state="state" @focus="root?.focus({ preventScroll: true })" /><GameGuide
        :state="state"
      />
    </div>
    <GameLesson v-if="showCode" />
  </div>
</template>
