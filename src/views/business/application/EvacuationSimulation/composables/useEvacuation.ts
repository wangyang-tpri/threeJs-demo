import { computed, ref, watch } from 'vue';
import { createSimulation, replan, trapped, type Hazard } from '../simulation';
export function useEvacuation() {
  const count = ref(80),
    speed = ref(1.3),
    capacity = ref(1.5),
    open = ref(['west', 'east', 'south']),
    hazard = ref<Hazard>('none'),
    rate = ref(1),
    heatmap = ref(false),
    routes = ref(true);
  const simulation = ref(
    createSimulation({
      count: 80,
      speed: 1.3,
      capacity: 1.5,
      open: open.value,
      hazard: 'none',
      seed: 42,
    })
  );
  const selectedId = ref<number | null>(null),
    selected = computed(() => simulation.value.agents.find((a) => a.id === selectedId.value)),
    unreachable = computed(() => trapped(simulation.value));
  function reset() {
    simulation.value = createSimulation({
      count: count.value,
      speed: speed.value,
      capacity: capacity.value,
      open: open.value,
      hazard: hazard.value,
      seed: 42,
    });
    selectedId.value = null;
  }
  function toggle() {
    const s = simulation.value;
    if (s.phase === 'completed') reset();
    simulation.value.phase = simulation.value.phase === 'running' ? 'paused' : 'running';
  }
  watch(
    [open, hazard],
    () => {
      if (simulation.value.phase === 'ready') reset();
      else replan(simulation.value, open.value, hazard.value);
    },
    { deep: true }
  );
  watch([count, speed, capacity], () => {
    if (simulation.value.phase === 'ready') reset();
  });
  return {
    count,
    speed,
    capacity,
    open,
    hazard,
    rate,
    heatmap,
    routes,
    simulation,
    selectedId,
    selected,
    unreachable,
    reset,
    toggle,
  };
}
export type EvacuationState = ReturnType<typeof useEvacuation>;
