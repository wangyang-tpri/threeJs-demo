<script setup lang="ts">
const showCode = defineModel<boolean>('showCode', { required: true });
const emit = defineEmits<{ reset: [] }>();
</script>

<template>
  <header
    class="page-header flex items-center justify-between gap-[16px] max-[720px]:items-start max-[720px]:flex-col"
  >
    <div>
      <div class="eyebrow text-[10px] font-bold tracking-[2px] text-[#218b80]">
        MALL EXPLORER / 室内导航
      </div>
      <h1
        class="text-[25px] font-bold m-[6px_0] tracking-[-0.8px] min-[720.01px]:max-[1000px]:text-[21px] max-[720px]:text-[21px]"
      >
        把下一站，交给导航<span
          class="text-[11px] align-middle ml-[12px] p-[3px_7px] border-[1px] border-solid border-[#a8d4cb] rounded-[5px] text-[#188a80] tracking-normal"
          >3D</span
        >
      </h1>
      <p class="text-[12px] text-[#8b9aa3] m-0">探索每一层精彩，轻松找到想去的地方。</p>
    </div>
    <div class="header-actions flex items-center gap-[10px] flex-wrap">
      <span
        class="demo-badge text-[11px] text-[#56837b] mr-[8px] min-[1000.01px]:max-[1250px]:hidden min-[720.01px]:max-[1000px]:hidden max-[720px]:hidden"
        >● 示例商场 · 3 层 / 24 家店铺</span
      ><n-button size="small" @click="showCode = !showCode">{{
        showCode ? '收起讲解' : '代码讲解'
      }}</n-button
      ><n-button size="small" @click="emit('reset')">重置</n-button>
    </div>
  </header>
</template>
