import { computed, ref, watch } from 'vue';
import { cities, metrics, type Metric } from '../geo';
export function useGeoData() {
  const query = ref(''),
    region = ref('全部'),
    metric = ref<Metric>('volume'),
    selectedId = ref('shanghai');
  const rotating = ref(false),
    showGrid = ref(true),
    showRoutes = ref(true),
    showLabels = ref(true);
  const filtered = computed(() =>
    cities
      .filter(
        (c) =>
          (region.value === '全部' || c.region === region.value) &&
          `${c.name} ${c.id}`.toLowerCase().includes(query.value.trim().toLowerCase())
      )
      .sort((a, b) => b[metric.value] - a[metric.value])
  );
  const selected = computed(() => filtered.value.find((c) => c.id === selectedId.value));
  const total = computed(() => filtered.value.reduce((sum, c) => sum + c[metric.value], 0));
  const max = computed(() => Math.max(1, ...filtered.value.map((c) => c[metric.value])));
  watch(filtered, (list) => {
    if (!list.some((c) => c.id === selectedId.value)) selectedId.value = list[0]?.id ?? '';
  });
  function reset() {
    query.value = '';
    region.value = '全部';
    metric.value = 'volume';
    selectedId.value = 'shanghai';
    rotating.value = false;
    showGrid.value = true;
    showRoutes.value = true;
    showLabels.value = true;
  }
  return {
    query,
    region,
    metric,
    selectedId,
    rotating,
    showGrid,
    showRoutes,
    showLabels,
    filtered,
    selected,
    total,
    max,
    metrics,
    reset,
  };
}
export type GeoState = ReturnType<typeof useGeoData>;
