<script setup lang="ts">
import { computed } from 'vue';
import { METRICS, type Metric, type Sample } from '../monitoring';
const props = defineProps<{ history: Sample[]; metric: Metric }>();
const config = computed(() => METRICS[props.metric]);
const maximum = computed(() =>
  Math.max(config.value.max, ...props.history.map((sample) => sample[props.metric] * 1.1))
);
const y = (value: number) => 130 - (value / maximum.value) * 110;
const points = computed(() =>
  props.history
    .map(
      (sample, index) =>
        `${36 + (index / Math.max(props.history.length - 1, 1)) * 312},${y(sample[props.metric])}`
    )
    .join(' ')
);
</script>
<template>
  <svg
    class="industrial-trend block w-full h-auto"
    viewBox="0 0 370 160"
    role="img"
    :aria-label="`${config.name}最近60次采样趋势`"
  >
    <rect x="0" y="0" width="370" height="160" rx="8" fill="#f7fafb" />
    <path d="M36 20V130H350" fill="none" stroke="#d5e2e7" />
    <text x="30" y="24" text-anchor="end" fill="#99acb5" class="text-[10px]">
      {{ maximum.toFixed(metric === 'pressure' ? 1 : 0) }}
    </text>
    <text x="28" y="133" text-anchor="end" fill="#99acb5" class="text-[10px]">0</text>
    <line
      v-if="Number.isFinite(config.warning)"
      x1="36"
      x2="350"
      :y1="y(config.warning)"
      :y2="y(config.warning)"
      stroke="#dfb667"
      stroke-dasharray="5 4"
    />
    <line
      v-if="Number.isFinite(config.critical)"
      x1="36"
      x2="350"
      :y1="y(config.critical)"
      :y2="y(config.critical)"
      stroke="#d98682"
      stroke-dasharray="5 4"
    />
    <polyline
      :points="points"
      stroke="#2c9484"
      stroke-width="2"
      fill="none"
      stroke-linejoin="round"
    />
    <circle
      v-for="(sample, index) in history"
      :key="index"
      :cx="36 + (index / Math.max(history.length - 1, 1)) * 312"
      :cy="y(sample[metric])"
      r="2"
      fill="#2c9484"
    >
      <title>
        {{ `t=${sample.time.toFixed(1)}s · ${sample[metric].toFixed(2)} ${config.unit}` }}
      </title>
    </circle>
    <text x="36" y="149" fill="#99acb5" class="text-[10px]">最近 {{ history.length }} 次采样</text>
    <text x="348" y="149" text-anchor="end" fill="#99acb5" class="text-[10px]">
      {{ config.unit }}
    </text>
  </svg>
</template>
