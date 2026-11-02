import { computed, ref, shallowRef } from 'vue';
import {
  applyJob,
  createBins,
  DOCK,
  planRoute,
  pointAtDistance,
  routeLength,
  stockStatus,
  validateJob,
  type Bin,
  type JobKind,
  type Point,
  type StockStatus,
} from '../warehouse';
interface Job {
  id: number;
  binId: string;
  kind: JobKind;
  amount: number;
  route: Point[];
  distance: number;
  duration: number;
}
export function useWarehouse() {
  const bins = ref(createBins()),
    search = ref(''),
    area = ref('all'),
    filter = ref<StockStatus | 'all'>('all');
  const selectedId = ref(bins.value[1]!.id),
    topView = ref(false),
    labels = ref(true);
  const kind = ref<JobKind>('outbound'),
    amount = ref<number | null>(5),
    speed = ref(2);
  const status = ref<'idle' | 'running' | 'paused' | 'done'>('idle'),
    elapsed = ref(0),
    error = ref('');
  const job = shallowRef<Job | null>(null);
  const logs = ref<
    { id: number; binId: string; kind: JobKind; amount: number; quantity: number }[]
  >([]);
  let jobId = 0;
  const selected = computed(() => bins.value.find((b) => b.id === selectedId.value));
  const filteredBins = computed(() =>
    bins.value.filter(
      (b) =>
        (area.value === 'all' || b.area === area.value) &&
        (filter.value === 'all' || stockStatus(b) === filter.value) &&
        `${b.id} ${b.sku} ${b.name}`.toLowerCase().includes(search.value.trim().toLowerCase())
    )
  );
  const stats = computed(() => ({
    total: bins.value.length,
    occupied: bins.value.filter((b) => b.quantity > 0).length,
    quantity: bins.value.reduce((sum, b) => sum + b.quantity, 0),
    low: bins.value.filter((b) => stockStatus(b) === 'low').length,
    blocked: bins.value.filter((b) => b.blocked).length,
  }));
  const active = computed(() => status.value === 'running' || status.value === 'paused');
  const progress = computed(() =>
    job.value ? Math.round(Math.min(elapsed.value / job.value.duration, 1) * 100) : 0
  );
  const phase = computed(() =>
    !job.value
      ? '待命'
      : elapsed.value < job.value.distance / 2
        ? '前往库位'
        : elapsed.value < job.value.distance / 2 + 1.5
          ? '到位装卸'
          : status.value === 'done'
            ? '任务完成'
            : '返回作业区'
  );
  const vehiclePoint = computed<Point>(() => {
    if (!job.value) return [...DOCK];
    const distance = job.value.distance,
      traveled = elapsed.value * 2;
    if (traveled < distance) return pointAtDistance(job.value.route, traveled);
    if (elapsed.value < distance / 2 + 1.5) return [...job.value.route.at(-1)!];
    return pointAtDistance(
      [...job.value.route].reverse(),
      (elapsed.value - distance / 2 - 1.5) * 2
    );
  });
  const hasCargo = computed(
    () =>
      !!job.value &&
      status.value !== 'done' &&
      (job.value.kind === 'inbound'
        ? elapsed.value < job.value.distance / 2 + 1.5
        : elapsed.value >= job.value.distance / 2 + 1.5)
  );
  function select(bin: Bin) {
    selectedId.value = bin.id;
    error.value = '';
  }
  function startJob() {
    if (active.value) {
      error.value = '请先完成或取消当前任务。';
      return;
    }
    error.value = validateJob(selected.value, kind.value, amount.value ?? NaN);
    if (error.value) return;
    const route = planRoute(selected.value!),
      distance = routeLength(route);
    job.value = {
      id: ++jobId,
      binId: selected.value!.id,
      kind: kind.value,
      amount: amount.value!,
      route,
      distance,
      duration: distance + 1.5,
    };
    elapsed.value = 0;
    status.value = 'running';
  }
  function advance(delta: number) {
    if (status.value !== 'running' || !job.value) return;
    elapsed.value = Math.min(
      job.value.duration,
      elapsed.value + Math.min(Math.max(delta, 0), 0.1) * speed.value
    );
    if (elapsed.value < job.value.duration) return;
    const snapshot = job.value,
      bin = bins.value.find((b) => b.id === snapshot.binId)!;
    const updated = applyJob(bin, snapshot.kind, snapshot.amount);
    bins.value = bins.value.map((b) => (b.id === updated.id ? updated : b));
    logs.value.unshift({
      id: snapshot.id,
      binId: snapshot.binId,
      kind: snapshot.kind,
      amount: snapshot.amount,
      quantity: updated.quantity,
    });
    logs.value = logs.value.slice(0, 20);
    status.value = 'done';
  }
  function togglePause() {
    if (status.value === 'running') status.value = 'paused';
    else if (status.value === 'paused') status.value = 'running';
  }
  function cancel() {
    job.value = null;
    status.value = 'idle';
    elapsed.value = 0;
    error.value = '';
  }
  function reset() {
    cancel();
    bins.value = createBins();
    search.value = '';
    area.value = 'all';
    filter.value = 'all';
    selectedId.value = bins.value[1]!.id;
    topView.value = false;
    labels.value = true;
    kind.value = 'outbound';
    amount.value = 5;
    speed.value = 2;
    logs.value = [];
  }
  return {
    bins,
    search,
    area,
    filter,
    selectedId,
    topView,
    labels,
    kind,
    amount,
    speed,
    status,
    elapsed,
    error,
    job,
    logs,
    selected,
    filteredBins,
    stats,
    active,
    progress,
    phase,
    vehiclePoint,
    hasCargo,
    select,
    startJob,
    advance,
    togglePause,
    cancel,
    reset,
  };
}
