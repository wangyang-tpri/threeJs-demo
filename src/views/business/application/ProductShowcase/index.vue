<script setup lang="ts">
import { nextTick, ref } from 'vue';
import ProductParts from './components/ProductParts.vue';
import ProductViewport from './components/ProductViewport.vue';
import ProductControls from './components/ProductControls.vue';
import ProductLesson from './components/ProductLesson.vue';
import { useProductState } from './composables/useProductState';
const state = useProductState();
const { explode } = state;
const viewport = ref<InstanceType<typeof ProductViewport> | null>(null);
const showCode = ref(false),
  error = ref('');
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function screenshot() {
  const blob = await viewport.value?.capture();
  if (blob) download(blob, 'product-showcase.png');
  else error.value = '无法生成截图，请稍后重试。';
}
function exportConfig() {
  download(
    new Blob(
      [
        JSON.stringify(
          {
            product: '相机结构示例',
            finish: state.finish.value,
            roughness: state.roughness.value,
            explode: state.explode.value,
            selectedPart: state.selectedId.value,
            hiddenParts: state.hiddenIds.value,
            isolated: state.isolated.value,
            view: state.preset.value,
            labels: state.labels.value,
            wireframe: state.wireframe.value,
            theme: state.theme.value,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    ),
    'product-config.json'
  );
}
async function reset() {
  state.reset();
  await nextTick();
  viewport.value?.fitView();
}
</script>
<template>
  <div
    class="product-page h-full overflow-auto flex flex-col gap-4 bg-[#f6f8fa] text-[#314d5d] p-5 max-[800px]:p-3"
  >
    <header class="shrink-0 flex justify-between items-center flex-wrap gap-3">
      <div>
        <div class="text-[10px] font-bold tracking-[2px] text-[#26877b]">
          PRODUCT EXPLORER / 产品探索
        </div>
        <h1 class="m-0 mt-1 text-[24px] max-[800px]:text-xl font-bold">产品三维展示与零件拆解</h1>
        <p class="mb-0 mt-1 text-xs text-[#94a6b2]">从整体外观到内部结构，探索每个零件的关系。</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <n-button size="small" @click="screenshot">保存截图</n-button
        ><n-button size="small" @click="exportConfig">导出配置</n-button
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button
        ><n-button size="small" @click="reset">重置</n-button>
      </div>
    </header>
    <n-alert v-if="error" type="error" class="shrink-0" closable @close="error = ''">{{
      error
    }}</n-alert>
    <div
      class="product-workspace grid grid-cols-[232px_minmax(280px,1fr)_264px] grow shrink-0 min-h-[660px] gap-4 max-[1200px]:grid-cols-[200px_minmax(0,1fr)] max-[800px]:flex max-[800px]:flex-col"
    >
      <ProductParts :state="state" @focus="viewport?.fitView(true)" @fit="viewport?.fitView()" />
      <ProductViewport ref="viewport" :state="state" />
      <ProductControls :state="state" class="max-[1200px]:col-span-full" />
    </div>
    <ProductLesson v-if="showCode" :explode="explode" />
  </div>
</template>
