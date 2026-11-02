import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { buildings, sample, type Alarm, type Lens } from '../campus';
export function useCampus() {
  const selectedId = ref('A1'),
    query = ref(''),
    use = ref('全部'),
    lens = ref<Lens>('overview'),
    night = ref(false),
    labels = ref(true),
    devices = ref(true),
    simulating = ref(true),
    clock = ref(0);
  const faultIds = ref<string[]>([]),
    alarms = ref<Alarm[]>([]),
    history = ref<{ time: number; power: number }[]>([]),
    patrolPlaying = ref(false),
    patrolDistance = ref(0),
    showRoute = ref(true);
  let timer: ReturnType<typeof setInterval> | undefined,
    serial = 0;
  const readings = computed(() =>
    Object.fromEntries(
      buildings.map((b) => [b.id, sample(b, clock.value, faultIds.value.includes(b.id))])
    )
  );
  const filtered = computed(() =>
    buildings.filter(
      (b) =>
        (use.value === '全部' || b.use === use.value) &&
        `${b.name} ${b.id}`.toLowerCase().includes(query.value.trim().toLowerCase())
    )
  );
  const selected = computed(() => buildings.find((b) => b.id === selectedId.value)!);
  const current = computed(() => readings.value[selectedId.value]!);
  const activeAlarms = computed(() => alarms.value.filter((a) => !a.resolved));
  const stats = computed(() => ({
    power: Math.round(Object.values(readings.value).reduce((sum, r) => sum + r.power, 0)),
    people: Object.values(readings.value).reduce((sum, r) => sum + r.people, 0),
    online: Object.values(readings.value).reduce((sum, r) => sum + r.online, 0),
    total: buildings.reduce((sum, b) => sum + b.devices, 0),
  }));
  function tick() {
    if (!simulating.value) return;
    clock.value++;
    history.value = [...history.value.slice(-59), { time: clock.value, power: stats.value.power }];
  }
  function inject() {
    const id = selectedId.value;
    if (faultIds.value.includes(id)) return;
    faultIds.value = [...faultIds.value, id];
    alarms.value = [
      { id: ++serial, buildingId: id, time: clock.value, acknowledged: false, resolved: false },
      ...alarms.value,
    ].slice(0, 100);
  }
  function recover() {
    const id = selectedId.value;
    faultIds.value = faultIds.value.filter((v) => v !== id);
    alarms.value = alarms.value.map((a) =>
      a.buildingId === id && !a.resolved ? { ...a, resolved: true } : a
    );
  }
  function acknowledge(id: number) {
    alarms.value = alarms.value.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
  }
  function reset() {
    query.value = '';
    use.value = '全部';
    selectedId.value = 'A1';
    lens.value = 'overview';
    night.value = false;
    labels.value = true;
    devices.value = true;
    simulating.value = true;
    clock.value = 0;
    faultIds.value = [];
    alarms.value = [];
    history.value = [{ time: 0, power: stats.value.power }];
    patrolPlaying.value = false;
    patrolDistance.value = 0;
    showRoute.value = true;
    serial = 0;
  }
  watch(filtered, (list) => {
    if (list.length && !list.some((b) => b.id === selectedId.value)) selectedId.value = list[0]!.id;
  });
  watch(showRoute, (value) => {
    if (!value) patrolPlaying.value = false;
  });
  onMounted(() => {
    history.value = [{ time: 0, power: stats.value.power }];
    timer = setInterval(tick, 1000);
  });
  onBeforeUnmount(() => clearInterval(timer));
  return {
    selectedId,
    query,
    use,
    lens,
    night,
    labels,
    devices,
    simulating,
    clock,
    faultIds,
    alarms,
    history,
    patrolPlaying,
    patrolDistance,
    showRoute,
    readings,
    filtered,
    selected,
    current,
    activeAlarms,
    stats,
    tick,
    inject,
    recover,
    acknowledge,
    reset,
  };
}
export type CampusState = ReturnType<typeof useCampus>;
