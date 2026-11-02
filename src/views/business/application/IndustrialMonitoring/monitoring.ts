// @unocss-include
export type Metric = 'temperature' | 'pressure' | 'vibration' | 'flow';
export type Fault = 'none' | 'warm' | 'overheat' | 'pressure' | 'vibration';
export type DeviceStatus = 'normal' | 'warning' | 'critical' | 'stopped';
export interface Reading {
  temperature: number;
  pressure: number;
  vibration: number;
  flow: number;
}
export interface Sample extends Reading {
  time: number;
}
export interface Device {
  id: string;
  name: string;
  kind: 'tank' | 'pump' | 'exchanger' | 'valve';
  position: [number, number];
  running: boolean;
  fault: Fault;
  reading: Reading;
  history: Sample[];
}
export interface Alarm {
  id: number;
  deviceId: string;
  metric: Metric;
  severity: 'warning' | 'critical';
  value: number;
  threshold: number;
  openedAt: number;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: number;
}
export const METRICS: Record<
  Metric,
  { name: string; unit: string; warning: number; critical: number; max: number }
> = {
  temperature: { name: '温度', unit: '°C', warning: 70, critical: 85, max: 110 },
  pressure: { name: '压力', unit: 'MPa', warning: 0.8, critical: 1, max: 1.3 },
  vibration: { name: '振动', unit: 'mm/s', warning: 4.5, critical: 6, max: 9 },
  flow: { name: '流量', unit: 'm³/h', warning: Infinity, critical: Infinity, max: 60 },
};
export const STATUS_LABEL: Record<DeviceStatus, string> = {
  normal: '运行正常',
  warning: '预警',
  critical: '严重告警',
  stopped: '已停机',
};
export const STATUS_CLASS: Record<DeviceStatus, string> = {
  normal: 'bg-[#eaf6f1] text-[#398672]',
  warning: 'bg-[#fff5e3] text-[#b58a42]',
  critical: 'bg-[#fff0ef] text-[#bc6c68]',
  stopped: 'bg-[#eef2f5] text-[#92a4b0]',
};
export const STATUS_COLOR: Record<DeviceStatus, string> = {
  normal: '#76aaa2',
  warning: '#e5b15a',
  critical: '#d87876',
  stopped: '#8e9eaa',
};
export const CONNECTIONS = [
  ['T01', 'P01'],
  ['P01', 'HX01'],
  ['HX01', 'V01'],
  ['V01', 'T02'],
  ['T02', 'P02'],
  ['P02', 'T01'],
] as const;
export function metricSeverity(metric: Metric, value: number): 'normal' | 'warning' | 'critical' {
  return value >= METRICS[metric].critical
    ? 'critical'
    : value >= METRICS[metric].warning
      ? 'warning'
      : 'normal';
}
export function deviceStatus(device: Device): DeviceStatus {
  if (!device.running) return 'stopped';
  const severity = (Object.keys(METRICS) as Metric[]).map((metric) =>
    metricSeverity(metric, device.reading[metric])
  );
  return severity.includes('critical')
    ? 'critical'
    : severity.includes('warning')
      ? 'warning'
      : 'normal';
}
export function sampleReading(
  index: number,
  time: number,
  fault: Fault,
  running: boolean,
  circulation: boolean
): Reading {
  const wave = Math.sin(time * 0.23 + index);
  const reading = {
    temperature: 42 + index * 2 + wave * 3,
    pressure: 0.42 + Math.sin(time * 0.18 + index) * 0.05,
    vibration: running ? 1.2 + Math.sin(time * 0.37 + index) * 0.3 : 0,
    flow: circulation ? 40 + wave * 3 : 0,
  };
  if (fault === 'warm') reading.temperature = 76 + wave;
  if (fault === 'overheat') reading.temperature = 94 + wave;
  if (fault === 'pressure') reading.pressure = 1.12 + wave * 0.02;
  if (fault === 'vibration') reading.vibration = 7.2 + wave * 0.2;
  return reading;
}
export function createDevices(): Device[] {
  const definitions: {
    id: string;
    name: string;
    kind: Device['kind'];
    position: [number, number];
  }[] = [
    { id: 'T01', name: '进液储罐', kind: 'tank', position: [-7, -3] },
    { id: 'P01', name: '输送泵', kind: 'pump', position: [-3, -3] },
    { id: 'HX01', name: '换热器', kind: 'exchanger', position: [2, -3] },
    { id: 'V01', name: '调节阀', kind: 'valve', position: [6, -3] },
    { id: 'T02', name: '回液储罐', kind: 'tank', position: [7, 3] },
    { id: 'P02', name: '循环泵', kind: 'pump', position: [-3, 3] },
  ];
  return definitions.map((device, index) => ({
    ...device,
    running: true,
    fault: 'none',
    reading: sampleReading(index, 0, 'none', true, true),
    history: Array.from({ length: 20 }, (_, i) => ({
      time: i - 19,
      ...sampleReading(index, i - 19, 'none', true, true),
    })),
  }));
}
/** 每个设备/指标最多一个未恢复事件，确认不清除异常；恢复保留事件记录。 */
export function reconcileAlarms(
  previous: Alarm[],
  devices: Device[],
  time: number,
  nextId: () => number
): Alarm[] {
  const alarms = previous.map((alarm) => ({ ...alarm }));
  for (const device of devices)
    for (const metric of Object.keys(METRICS) as Metric[]) {
      const value = device.reading[metric],
        severity = metricSeverity(metric, value);
      const current = alarms.find(
        (alarm) => alarm.deviceId === device.id && alarm.metric === metric && !alarm.resolved
      );
      if (severity === 'normal') {
        if (current) {
          current.resolved = true;
          current.resolvedAt = time;
        }
        continue;
      }
      if (current) {
        if (current.severity === 'warning' && severity === 'critical') current.acknowledged = false;
        current.severity = severity;
        current.value = value;
        current.threshold = METRICS[metric][severity];
      } else
        alarms.unshift({
          id: nextId(),
          deviceId: device.id,
          metric,
          severity,
          value,
          threshold: METRICS[metric][severity],
          openedAt: time,
          acknowledged: false,
          resolved: false,
        });
    }
  return [
    ...alarms.filter((alarm) => !alarm.resolved),
    ...alarms.filter((alarm) => alarm.resolved),
  ].slice(0, 100);
}
