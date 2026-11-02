<script setup lang="ts">
import { ref } from 'vue';
import { useRunnerScene } from '../composables/useRunnerScene';
import type { RunnerState } from '../composables/useRunner';
const props = defineProps<{ state: RunnerState }>();
const emit = defineEmits<{ focus: [] }>();
const container = ref<HTMLDivElement | null>(null);
useRunnerScene(container, props.state);
const names = {
  ready: '准备出发',
  running: '跑酷中',
  paused: '已暂停',
  lost: '本次挑战结束',
  won: '成功抵达终点',
};
</script>
<template>
  <section class="runner-viewport relative min-h-[520px] overflow-hidden rounded-2xl bg-[#10182f]">
    <div
      ref="container"
      class="runner-canvas absolute inset-0 [&_canvas]:block touch-none"
      @pointerdown="emit('focus')"
    ></div>
    <div
      class="absolute left-5 top-4 right-5 flex justify-between items-start pointer-events-none text-white"
    >
      <div>
        <div class="text-[10px] tracking-[3px] text-[#61d9ca]">CITY RUNNER</div>
        <div class="runner-phase mt-1 text-sm font-bold" role="status">
          {{ names[state.game.phase] }}
        </div>
      </div>
      <div class="text-right">
        <div
          class="text-lg tracking-[3px] text-[#ffb6bb]"
          :aria-label="`剩余 ${state.game.lives} 条生命`"
        >
          {{ '♥'.repeat(state.game.lives)
          }}<span class="text-[#4b536d]">{{ '♥'.repeat(3 - state.game.lives) }}</span>
        </div>
        <div class="text-[10px] text-slate-300">
          金币 {{ state.game.coins }} · {{ Math.floor(state.game.distance) }} / 1000 m
        </div>
      </div>
    </div>
    <div
      v-if="state.game.phase !== 'running'"
      class="absolute inset-0 flex justify-center items-center bg-[#091023]/50 backdrop-blur-[3px] px-4"
    >
      <div
        class="runner-overlay rounded-xl border border-solid border-white/15 bg-[#16223a]/95 p-7 text-center text-white max-w-[370px]"
      >
        <div class="text-[10px] tracking-[3px] text-[#61d9ca]">THREE.JS MINI GAME</div>
        <h2 class="text-2xl mt-3 mb-2">
          {{ state.game.phase === 'ready' ? '城市跑酷' : names[state.game.phase] }}
        </h2>
        <p class="text-xs leading-6 text-slate-300">
          {{
            state.game.phase === 'ready'
              ? '躲避高障碍，跳越矮障碍，收集金币。跑完 1000 米即可通关！'
              : state.game.phase === 'paused'
                ? '游戏时间与物体移动已暂停。准备好后继续。'
                : `得分 ${state.currentScore.value} · 收集 ${state.game.coins} 枚金币 · 前进 ${Math.floor(state.game.distance)} 米`
          }}
        </p>
        <n-button
          type="primary"
          size="large"
          @click="state.game.phase === 'paused' ? state.togglePause() : state.start()"
          >{{
            state.game.phase === 'paused'
              ? '继续游戏'
              : state.game.phase === 'ready'
                ? '开始游戏'
                : '再玩一次'
          }}</n-button
        >
        <p v-if="state.game.phase === 'ready'" class="mb-0 mt-4 text-[11px] text-slate-400">
          ← → / A D 换道 · 空格 / ↑ 跳跃 · P 暂停
        </p>
      </div>
    </div>
    <div class="absolute bottom-4 left-4 right-4 flex justify-center gap-3">
      <n-button
        class="!bg-[#17243d]/90 !text-white !border-[#64718e] !h-[42px] !min-w-[70px]"
        :disabled="state.game.phase !== 'running'"
        aria-label="向左换道"
        @click="state.move(-1)"
        >← 左移</n-button
      >
      <n-button
        class="!h-[42px] !min-w-[92px]"
        type="primary"
        :disabled="state.game.phase !== 'running'"
        @click="state.leap"
        >跳跃 ↑</n-button
      >
      <n-button
        class="!bg-[#17243d]/90 !text-white !border-[#64718e] !h-[42px] !min-w-[70px]"
        :disabled="state.game.phase !== 'running'"
        aria-label="向右换道"
        @click="state.move(1)"
        >右移 →</n-button
      >
    </div>
  </section>
</template>
