<script setup lang="ts">
import { difficulties } from '../game';
import type { RunnerState } from '../composables/useRunner';
defineProps<{ state: RunnerState }>();
</script>
<template>
  <aside
    class="bg-white rounded-xl p-5 border border-solid border-[#e0e8ed] min-w-0 flex flex-col gap-5"
  >
    <div>
      <h2 class="m-0 text-sm font-bold">挑战设置</h2>
      <p class="text-[11px] text-slate-400 mb-2">难度在开始下一局时生效。</p>
      <n-select
        v-model:value="state.difficulty.value"
        :disabled="state.game.phase === 'running' || state.game.phase === 'paused'"
        :options="Object.entries(difficulties).map(([value, d]) => ({ label: d.label, value }))"
      />
    </div>
    <div class="rounded-lg bg-teal-50 p-3 text-xs text-teal-700">
      <div>当前难度最高分</div>
      <strong class="block mt-1 text-2xl">{{
        state.best[state.difficulty.value].toLocaleString()
      }}</strong>
      <div class="mt-1 text-[10px]">记录保存在此浏览器，不上传到服务器。</div>
    </div>
    <div>
      <h3 class="m-0 mb-3 text-xs font-bold">障碍与得分</h3>
      <div class="flex flex-col gap-3 text-xs text-slate-500">
        <div class="flex gap-3">
          <span class="w-3 h-3 mt-1 rounded-full bg-[#ffd36a] shrink-0"></span
          ><span>金币：每枚增加 50 分，跳得太高会错过金币。</span>
        </div>
        <div class="flex gap-3">
          <span class="w-3 h-3 mt-1 rounded bg-[#ffb064] shrink-0"></span
          ><span>矮障碍：提前跳跃或换道，过早落地会撞到。</span>
        </div>
        <div class="flex gap-3">
          <span class="w-3 h-3 mt-1 rounded bg-[#e56d86] shrink-0"></span
          ><span>高障碍：必须换道，无法跳越。</span>
        </div>
      </div>
    </div>
    <div class="text-xs leading-6 text-slate-500 border-t border-solid border-slate-100 pt-4">
      <strong class="text-[#36525f]">玩法</strong><br />左右键 / A、D：换道<br />空格 / ↑ /
      W：跳跃<br />P / Esc：暂停或继续<br />手机和平板可点击场景下方按钮。<br />碰撞扣 1
      条生命，并获得 2 秒保护。距离每增加 1 米获得 1 分，抵达 1000 米通关。
    </div>
    <div class="text-[11px] leading-6 text-slate-400">
      点击游戏区域启用键盘操作。切换窗口或隐藏页面会自动暂停；返回后需手动继续。
    </div>
    <n-alert v-if="state.storageMessage.value" type="info">{{
      state.storageMessage.value
    }}</n-alert>
  </aside>
</template>
