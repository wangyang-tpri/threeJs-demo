<script setup lang="ts">
import { METRICS } from '../monitoring';
import type { useMonitoring } from '../composables/useMonitoring';
const props = defineProps<{ state: ReturnType<typeof useMonitoring> }>();
const { alarmView, shownAlarms } = props.state;
const emit = defineEmits<{ locate: [deviceId: string] }>();
</script>
<template>
  <section
    class="industrial-alarms shrink-0 rounded-xl border border-solid border-[#e1e9ee] bg-white p-4"
  >
    <div class="flex justify-between items-center gap-2 flex-wrap">
      <div class="flex items-center gap-3">
        <h2 class="m-0 text-sm font-semibold">告警事件</h2>
        <n-radio-group v-model:value="alarmView" size="small"
          ><n-radio-button value="active">当前告警</n-radio-button
          ><n-radio-button value="all">全部记录</n-radio-button></n-radio-group
        >
      </div>
      <n-button size="small" @click="state.acknowledgeAll">确认全部当前告警</n-button>
    </div>
    <div class="overflow-auto max-h-[240px] mt-3">
      <table
        v-if="shownAlarms.length"
        class="industrial-alarm-table w-full min-w-[650px] text-left text-[11px] border-collapse"
      >
        <thead class="text-[#97aab4]">
          <tr>
            <th class="p-2">设备 / 指标</th>
            <th class="p-2">级别</th>
            <th class="p-2">采样值 / 阈值</th>
            <th class="p-2">状态</th>
            <th class="p-2">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="alarm in shownAlarms"
            :key="alarm.id"
            class="border-t border-t-solid border-[#edf2f4]"
          >
            <td class="p-2 text-[#577780]">
              {{ alarm.deviceId }} · {{ METRICS[alarm.metric].name
              }}<small class="block text-[#a3b0b8]"
                >#{{ alarm.id }} · t+{{ alarm.openedAt.toFixed(1) }}s</small
              >
            </td>
            <td
              class="p-2"
              :class="alarm.severity === 'critical' ? 'text-[#bd7470]' : 'text-[#b99658]'"
            >
              {{ alarm.severity === 'critical' ? '严重' : '预警' }}
            </td>
            <td class="p-2 text-[#8fa3ad]">
              {{ alarm.value.toFixed(2) }} / {{ alarm.threshold }} {{ METRICS[alarm.metric].unit }}
            </td>
            <td class="p-2 text-[#8fa3ad]">
              {{ alarm.resolved ? '已恢复' : alarm.acknowledged ? '已确认 · 未恢复' : '待确认' }}
            </td>
            <td class="p-2">
              <n-button size="tiny" quaternary @click="emit('locate', alarm.deviceId)"
                >定位</n-button
              ><n-button
                v-if="!alarm.acknowledged"
                size="tiny"
                quaternary
                @click="state.acknowledge(alarm.id)"
                >确认</n-button
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="industrial-no-alarms py-5 text-center text-xs text-[#9bafb9]">
        {{ alarmView === 'active' ? '当前没有未恢复的告警' : '暂无告警记录' }}
      </p>
    </div>
  </section>
</template>
