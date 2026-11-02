<script setup lang="ts">
import { ref } from 'vue';
import EvacuationViewport from './components/EvacuationViewport.vue';
import SimulationControls from './components/SimulationControls.vue';
import EvacuationReport from './components/EvacuationReport.vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { highlightCode } from '@/utils/codeHighlight';
import { useEvacuation } from './composables/useEvacuation';
const state = useEvacuation(),
  viewport = ref<InstanceType<typeof EvacuationViewport> | null>(null),
  showCode = ref(false),
  error = ref('');
const names = { ready: '准备就绪', running: '模拟运行中', paused: '已暂停', completed: '疏散完成' };
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportData() {
  const s = state.simulation.value;
  download(
    new Blob(
      [
        JSON.stringify(
          {
            source: '教学模拟',
            phase: s.phase,
            parameters: s.config,
            elapsedSeconds: s.elapsed,
            total: s.agents.length,
            evacuated: s.evacuated,
            unreachable: state.unreachable.value,
            exits: s.throughput,
            samples: s.samples,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    ),
    'evacuation-report.json'
  );
}
async function capture() {
  const blob = await viewport.value?.capture();
  if (blob) download(blob, 'evacuation.png');
  else error.value = '截图生成失败，请稍后重试。';
}
const code = highlightCode(
  `// 从所有开放出口进行多源 BFS，生成最短距离场\nqueue = openExits.map(exit => exit.cell);\nwhile (queue.length) {\n  const cell = queue.shift();\n  for (const next of walkableNeighbors(cell)) {\n    if (distance[next] === Infinity) {\n      distance[next] = distance[cell] + 1;\n      queue.push(next);\n    }\n  }\n}\n// 人员只进入空闲且距离更短的邻格；出口按服务额度放行\n// 关闭出口或改变危险区后重新计算距离场`
);
</script>
<template>
  <div
    class="evac-page h-full overflow-auto flex flex-col gap-4 bg-[#f6f8fa] p-5 max-[800px]:p-3 text-[#36525f]"
  >
    <header class="shrink-0 flex justify-between items-center gap-3 flex-wrap">
      <div>
        <div class="text-[10px] tracking-[2px] font-bold text-teal-600">
          EVACUATION LAB / 应急疏散
        </div>
        <h1 class="m-0 mt-1 text-2xl font-bold">应急疏散模拟</h1>
        <p class="mb-0 mt-1 text-xs text-slate-400">
          观察出口、危险区与排队对疏散过程的影响 · 教学模拟
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <n-button type="primary" size="small" @click="state.toggle">{{
          state.simulation.value.phase === 'running'
            ? '暂停模拟'
            : state.simulation.value.phase === 'paused'
              ? '继续模拟'
              : state.simulation.value.phase === 'completed'
                ? '再次模拟'
                : '开始模拟'
        }}</n-button
        ><n-button size="small" @click="state.reset">重置场景</n-button
        ><n-button size="small" @click="exportData">导出报告</n-button
        ><n-button size="small" @click="capture">保存截图</n-button
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button>
      </div>
    </header>
    <n-alert v-if="error" type="error" class="shrink-0">{{ error }}</n-alert>
    <div class="shrink-0 grid grid-cols-4 max-[800px]:grid-cols-2 gap-3">
      <div
        v-for="item in [
          {
            label: '已疏散 / 总人数',
            value: state.simulation.value.evacuated + ' / ' + state.simulation.value.agents.length,
          },
          {
            label: '剩余人员',
            value: state.simulation.value.agents.length - state.simulation.value.evacuated,
          },
          { label: '模拟用时', value: state.simulation.value.elapsed.toFixed(1) + ' s' },
          { label: '当前状态', value: names[state.simulation.value.phase] },
        ]"
        :key="item.label"
        class="bg-white rounded-lg border border-solid border-slate-200 px-4 py-3"
      >
        <div class="text-xs text-slate-400">{{ item.label }}</div>
        <div class="evac-stat mt-1 text-xl font-bold">{{ item.value }}</div>
      </div>
    </div>
    <div
      class="evac-workspace grow shrink-0 min-h-[650px] grid grid-cols-[minmax(0,1fr)_290px] max-[1000px]:grid-cols-1 gap-4"
    >
      <EvacuationViewport ref="viewport" :state="state" /><SimulationControls :state="state" />
    </div>
    <EvacuationReport :state="state" />
    <div v-if="showCode" class="evac-lesson shrink-0 min-w-0">
      <CodePanel
        class="!w-full min-h-[300px]"
        title="网格寻路与人群排队"
        :code="code"
        explanation="用多源 BFS 将所有出口映射为最短距离场，人员逐格向出口移动；占用表阻止多人同时进入同一格，轮换处理顺序减轻固定编号优先。固定步长推进，暂停时不补算时间。出口或危险区改变后立即重新寻路。该模型不包含烟气扩散、个体行为、真实建筑规范和专业人群动力学，仅用于理解算法。"
      />
    </div>
  </div>
</template>
