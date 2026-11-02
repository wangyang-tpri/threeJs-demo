<script setup lang="ts">
import { nextTick, ref } from 'vue';
import DeviceDirectory from './components/DeviceDirectory.vue';
import MonitoringViewport from './components/MonitoringViewport.vue';
import DeviceInspector from './components/DeviceInspector.vue';
import AlarmPanel from './components/AlarmPanel.vue';
import MonitoringLesson from './components/MonitoringLesson.vue';
import { useMonitoring } from './composables/useMonitoring';
const state = useMonitoring();
const { stats, monitoring, clock } = state;
const viewport = ref<InstanceType<typeof MonitoringViewport> | null>(null),
  showCode = ref(false),
  error = ref('');
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
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
            devices: state.devices.value,
            alarms: state.alarms.value,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    ),
    'industrial-monitoring.json'
  );
}
async function capture() {
  const image = await viewport.value?.capture();
  if (image) download(image, 'industrial-monitoring.png');
  else error.value = '无法生成截图，请稍后重试。';
}
async function locate(id: string) {
  state.select(id);
  await nextTick();
  viewport.value?.fitView(true);
}
async function reset() {
  state.reset();
  await nextTick();
  viewport.value?.fitView();
}
</script>
<template>
  <div
    class="industrial-page h-full overflow-auto flex flex-col gap-4 bg-[#f6f8fa] p-5 max-[800px]:p-3 text-[#36525f]"
  >
    <header class="shrink-0 flex justify-between items-center gap-3 flex-wrap">
      <div>
        <div class="text-[10px] font-bold tracking-[2px] text-[#278778]">
          INDUSTRIAL INSIGHT / 工业监控
        </div>
        <h1 class="m-0 mt-1 text-[24px] max-[800px]:text-xl font-bold">工业设备监控</h1>
        <p class="mb-0 mt-1 text-xs text-[#96a8b2]">三维设备、传感器趋势与告警事件联动。</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <n-button
          size="small"
          :type="monitoring ? 'primary' : 'default'"
          @click="monitoring = !monitoring"
          >{{ monitoring ? '暂停模拟' : '继续模拟' }}</n-button
        ><n-button size="small" @click="exportData">导出监控数据</n-button
        ><n-button size="small" @click="capture">保存截图</n-button
        ><n-button size="small" @click="showCode = !showCode">{{
          showCode ? '收起讲解' : '代码讲解'
        }}</n-button
        ><n-button size="small" @click="reset">重置</n-button>
      </div>
    </header>
    <n-alert v-if="error" type="error" class="shrink-0" closable @close="error = ''">{{
      error
    }}</n-alert>
    <div class="industrial-stats shrink-0 grid grid-cols-4 gap-3 max-[800px]:grid-cols-2">
      <div
        v-for="item in [
          { label: '运行设备', value: `${stats.running} / ${stats.total}`, hint: '本地模拟回路' },
          { label: '严重告警设备', value: stats.critical, hint: '温度 / 压力 / 振动' },
          { label: '待确认告警', value: stats.pending, hint: '确认不代表异常恢复' },
          {
            label: '模拟时长',
            value: `${Math.floor(clock)} s`,
            hint: monitoring ? '1 秒采样 · 模拟运行中' : '模拟已暂停',
          },
        ]"
        :key="item.label"
        class="rounded-lg border border-solid border-[#e0e8ed] bg-white px-4 py-3"
      >
        <span class="text-[10px] text-[#96a8b2]">{{ item.label }}</span
        ><strong class="block mt-1 text-[22px] font-semibold text-[#3b8075]">{{
          item.value
        }}</strong
        ><small class="text-[9px] text-[#a0afb7]">{{ item.hint }}</small>
      </div>
    </div>
    <div
      class="industrial-workspace grid grid-cols-[230px_minmax(280px,1fr)_300px] grow shrink-0 min-h-[660px] gap-4 max-[1250px]:grid-cols-[210px_minmax(0,1fr)] max-[800px]:flex max-[800px]:flex-col"
    >
      <DeviceDirectory :state="state" /><MonitoringViewport
        ref="viewport"
        :state="state"
      /><DeviceInspector
        :state="state"
        class="max-[1250px]:col-span-full"
        @focus="viewport?.fitView(true)"
      />
    </div>
    <AlarmPanel :state="state" @locate="locate" />
    <p class="shrink-0 m-0 text-[10px] text-[#9babb4]">
      所有传感器、控制和告警均为演示数据，不连接真实设备；阈值用于教学示例。
    </p>
    <MonitoringLesson v-if="showCode" />
  </div>
</template>
