import { computed, ref } from 'vue';
import {
  createDevices,
  deviceStatus,
  reconcileAlarms,
  sampleReading,
  type Alarm,
  type DeviceStatus,
  type Fault,
  type Metric,
} from '../monitoring';
export function useMonitoring() {
  const devices = ref(createDevices()),
    selectedId = ref('P01'),
    search = ref(''),
    filter = ref<DeviceStatus | 'all'>('all');
  const monitoring = ref(true),
    clock = ref(0),
    topView = ref(false),
    labels = ref(true);
  const fault = ref<Fault>('overheat'),
    metric = ref<Metric>('temperature'),
    alarms = ref<Alarm[]>([]),
    alarmView = ref<'active' | 'all'>('active');
  let lastSample = 0,
    alarmId = 0;
  const selected = computed(() => devices.value.find((device) => device.id === selectedId.value)!);
  const filteredDevices = computed(() =>
    devices.value.filter(
      (device) =>
        (filter.value === 'all' || deviceStatus(device) === filter.value) &&
        `${device.id} ${device.name}`.toLowerCase().includes(search.value.trim().toLowerCase())
    )
  );
  const circulating = computed(() => devices.value.every((device) => device.running));
  const activeAlarms = computed(() => alarms.value.filter((alarm) => !alarm.resolved));
  const shownAlarms = computed(() =>
    alarmView.value === 'active' ? activeAlarms.value : alarms.value
  );
  const stats = computed(() => ({
    total: devices.value.length,
    running: devices.value.filter((device) => device.running).length,
    critical: devices.value.filter((device) => deviceStatus(device) === 'critical').length,
    pending: activeAlarms.value.filter((alarm) => !alarm.acknowledged).length,
  }));
  function sample(record = true) {
    devices.value.forEach((device, index) => {
      device.reading = sampleReading(
        index,
        clock.value,
        device.fault,
        device.running,
        circulating.value
      );
      if (record)
        device.history = [...device.history, { time: clock.value, ...device.reading }].slice(-60);
    });
    alarms.value = reconcileAlarms(alarms.value, devices.value, clock.value, () => ++alarmId);
  }
  function advance(delta: number) {
    if (!monitoring.value) return;
    clock.value += Math.min(Math.max(delta, 0), 0.1);
    if (clock.value - lastSample >= 1) {
      lastSample = clock.value;
      sample();
    }
  }
  function select(id: string) {
    selectedId.value = id;
  }
  function injectFault() {
    selected.value.fault = fault.value;
    sample();
  }
  function recover() {
    selected.value.fault = 'none';
    sample();
  }
  function toggleRunning() {
    selected.value.running = !selected.value.running;
    sample();
  }
  function acknowledge(id: number) {
    const alarm = alarms.value.find((item) => item.id === id);
    if (alarm) alarm.acknowledged = true;
  }
  function acknowledgeAll() {
    activeAlarms.value.forEach((alarm) => {
      alarm.acknowledged = true;
    });
  }
  function reset() {
    devices.value = createDevices();
    selectedId.value = 'P01';
    search.value = '';
    filter.value = 'all';
    monitoring.value = true;
    clock.value = 0;
    lastSample = 0;
    alarmId = 0;
    alarms.value = [];
    topView.value = false;
    labels.value = true;
    fault.value = 'overheat';
    metric.value = 'temperature';
    alarmView.value = 'active';
  }
  return {
    devices,
    selectedId,
    search,
    filter,
    monitoring,
    clock,
    topView,
    labels,
    fault,
    metric,
    alarms,
    alarmView,
    selected,
    filteredDevices,
    circulating,
    activeAlarms,
    shownAlarms,
    stats,
    advance,
    select,
    injectFault,
    recover,
    toggleRunning,
    acknowledge,
    acknowledgeAll,
    reset,
  };
}
