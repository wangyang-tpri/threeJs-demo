<script setup lang="ts">
import { nextTick, ref } from 'vue';
import BuildingDirectory from './components/BuildingDirectory.vue';
import CampusViewport from './components/CampusViewport.vue';
import BuildingInspector from './components/BuildingInspector.vue';
import CampusTelemetry from './components/CampusTelemetry.vue';
import CampusLesson from './components/CampusLesson.vue';
import { useCampus } from './composables/useCampus';
import { buildings } from './campus';
const state = useCampus(),
  viewport = ref<InstanceType<typeof CampusViewport> | null>(null),
  showCode = ref(false),
  error = ref('');
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportData() {
  download(
    new Blob(
      [
        JSON.stringify(
          {
            source: '本地模拟',
            elapsedSeconds: state.clock.value,
            buildings: buildings.map((b) => ({ ...b, reading: state.readings.value[b.id] })),
            alarms: state.alarms.value,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    ),
    'campus-twin.json'
  );
}
async function capture() {
  const image = await viewport.value?.capture();
  if (image) download(image, 'campus-twin.png');
  else error.value = '无法生成截图，请稍后重试。';
}
async function locate(id: string) {
  state.query.value = '';
  state.use.value = '全部';
  state.selectedId.value = id;
  await nextTick();
  viewport.value?.fit(true);
}
async function reset() {
  state.reset();
  await nextTick();
  viewport.value?.fit();
}
</script>
<template>
  <div
    class="campus-page h-full overflow-auto flex flex-col gap-4 bg-[#f6f8fa] p-5 max-[800px]:p-3 text-[#36525f]"
  >
    <header class="shrink-0 flex justify-between items-center flex-wrap gap-3">
      <div>
        <div class="text-[10px] tracking-[2px] font-bold text-teal-600">CAMPUS TWIN / 园区运营</div>
        <h1 class="m-0 mt-1 text-2xl font-bold">园区数字孪生</h1>
        <p class="mb-0 mt-1 text-xs text-slate-400">
          楼宇资产、能源、设备状态与道路巡检联动 · 本地模拟数据
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <n-button size="small" @click="state.simulating.value = !state.simulating.value">{{
          state.simulating.value ? '暂停采样' : '继续采样'
        }}</n-button
        ><n-button size="small" @click="exportData">导出园区数据</n-button
        ><n-button size="small" @click="capture">保存截图</n-button
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button
        ><n-button size="small" @click="reset">重置</n-button>
      </div>
    </header>
    <n-alert v-if="error" type="error" closable class="shrink-0" @close="error = ''">{{
      error
    }}</n-alert>
    <div class="shrink-0 grid grid-cols-4 max-[800px]:grid-cols-2 gap-3">
      <div
        v-for="item in [
          {
            label: '全园区实时功率',
            value: state.stats.value.power.toLocaleString() + ' kW',
            hint: '6 栋楼宇 · 模拟数据',
          },
          {
            label: '全园区在园人数',
            value: state.stats.value.people.toLocaleString(),
            hint: '模拟人数，不含个人信息',
          },
          {
            label: '全园区在线设备',
            value: state.stats.value.online + ' / ' + state.stats.value.total,
            hint: '楼宇传感器汇总',
          },
          {
            label: '未恢复告警',
            value: state.activeAlarms.value.length,
            hint: '模拟时长 ' + state.clock.value + ' s',
          },
        ]"
        :key="item.label"
        class="bg-white rounded-lg border border-solid border-[#e0e8ed] px-4 py-3"
      >
        <div class="text-xs text-slate-400">{{ item.label }}</div>
        <div class="my-1 text-2xl font-bold">{{ item.value }}</div>
        <div class="text-[10px] text-slate-400">{{ item.hint }}</div>
      </div>
    </div>
    <div
      class="campus-workspace grow shrink-0 min-h-[650px] grid grid-cols-[220px_minmax(0,1fr)_260px] max-[1250px]:grid-cols-[220px_minmax(0,1fr)] max-[850px]:grid-cols-1 gap-4"
    >
      <BuildingDirectory :state="state" @locate="locate" /><CampusViewport
        ref="viewport"
        :state="state"
      /><BuildingInspector :state="state" class="max-[1250px]:col-span-2 max-[850px]:col-span-1" />
    </div>
    <CampusTelemetry :state="state" @locate="locate" /><CampusLesson v-if="showCode" />
  </div>
</template>
