<script setup lang="ts">
import { ref } from 'vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
const active = ref<'loop' | 'collision' | 'lifecycle'>('loop');
const { code, explanation } = useCodeExplain(
  {
    loop: () =>
      `// 固定步长更新，与显示器刷新率解耦\naccumulator += Math.min(delta, 0.1);\nwhile (accumulator >= 1 / 120) {\n  step(game, 1 / 120);\n  accumulator -= 1 / 120;\n}\n// 角色固定在原点，跑道和物体迎面移动\nobject.position.z = -(entity.at - game.distance);`,
    collision: () =>
      `// 检测本次推进区间，避免高速穿透\nconst crossed = entity.at >= previous - 0.65\n  && entity.at <= game.distance + 0.65;\nconst sameLane = Math.abs(game.x - entity.lane * 2.3) <= 0.8;\nif (crossed && sameLane && game.invincible === 0) {\n  if (entity.kind === 'block' || game.height < 1.25) {\n    game.lives -= 1;\n    game.invincible = 2;\n  }\n}`,
    lifecycle: () =>
      `// 离开页面：释放几何体、材质和输入事件\nonBeforeUnmount(() => {\n  window.removeEventListener('keydown', onKey);\n  document.removeEventListener('visibilitychange', onVisibility);\n});\n// 隐藏页面时暂停，返回后不自动继续\nif (document.hidden && game.phase === 'running') {\n  game.phase = 'paused';\n}`,
  },
  {
    loop: () =>
      '游戏逻辑每 1/120 秒推进一次，将单帧积累时间限制为 0.1 秒，避免卡顿后物体突然跳过玩家。暂停时清空积累时间，恢复不会补算暂停期间的时间。固定步长让不同刷新率下的速度与跳跃基本一致。',
    collision: () =>
      '横向换道连续移动，碰撞按实际 X 位置判断。金币、矮障碍和高障碍使用不同高度规则；一次碰撞后两秒内不再扣生命。每一波随机选择一条安全通道，避免三条跑道同时封死。',
    lifecycle: () =>
      '输入只在游戏区域获得焦点时生效，避免影响菜单与其他页面。页面失焦或隐藏时自动暂停。实体移出跑道后复用共享几何体与材质，页面卸载时统一释放 GPU 资源及事件监听。',
  },
  active
);
</script>
<template>
  <section class="runner-lesson shrink-0 min-w-0">
    <n-radio-group v-model:value="active" size="small" class="mb-2"
      ><n-radio-button value="loop">游戏循环</n-radio-button
      ><n-radio-button value="collision">碰撞与关卡</n-radio-button
      ><n-radio-button value="lifecycle">输入与资源</n-radio-button></n-radio-group
    ><CodePanel
      class="!w-full min-h-[300px]"
      title="Three.js 网页小游戏"
      :code="code"
      :explanation="explanation"
    />
  </section>
</template>
