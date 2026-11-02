import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue';
import {
  createPlanSVG,
  createSample,
  getBounds,
  parseDXF,
  segmentLength,
  serializeDXF,
  toMeters,
  UNIT_LABEL,
  type Drawing,
  type Point,
  type UnitChoice,
} from '../dxf';
import type { Measurement, ModelSettings, ViewMode, ViewPreset } from '../types';

export const defaultSettings = (): ModelSettings => ({
  height: 2.8,
  thickness: 0.24,
  opacity: 1,
  wallColor: '#b7cbd2',
  colorByLayer: true,
  showFloor: true,
  showGrid: true,
  showDimensions: true,
  showEdges: true,
});

export function useCadPlan() {
  const drawing = shallowRef<Drawing>(createSample('home'));
  const sourceKind = ref<'sample' | 'upload'>('sample');
  const sampleKind = ref<'home' | 'office'>('home');
  const mode = ref<ViewMode>('2d');
  const preset = ref<ViewPreset>('top');
  const unit = ref<UnitChoice>('auto');
  const settings = reactive(defaultSettings());
  const activeLayers = ref<string[]>(['墙体']);
  const selectedId = ref<string | null>(null);
  const measuring = ref(false);
  const measureStart = ref<Point | null>(null);
  const measurements = ref<Measurement[]>([]);
  const uploading = ref(false);
  const loadProgress = ref(0);
  const error = ref('');
  const notice = ref('');
  let importVersion = 0,
    measurementId = 0;
  const meterSegments = computed(() => toMeters(drawing.value, unit.value));
  const visibleSegments = computed(() =>
    meterSegments.value.filter((s) => activeLayers.value.includes(s.layer))
  );
  const bounds = computed(() => getBounds(visibleSegments.value));
  const totalLength = computed(() =>
    visibleSegments.value.reduce((sum, s) => sum + segmentLength(s), 0)
  );
  const selected = computed(() => visibleSegments.value.find((s) => s.id === selectedId.value));
  const layers = computed(() =>
    [...new Set(drawing.value.segments.map((s) => s.layer))].map((name) => ({
      name,
      count: drawing.value.segments.filter((s) => s.layer === name).length,
    }))
  );
  const unitHint = computed(() =>
    unit.value !== 'auto'
      ? `手动设置：${UNIT_LABEL[unit.value]}`
      : drawing.value.unit
        ? `DXF 单位：${UNIT_LABEL[drawing.value.unit]}`
        : '未声明单位，暂按毫米。请确认并手动调整。'
  );

  function clearMeasurements() {
    measurements.value = [];
    measureStart.value = null;
  }
  function applyDrawing(next: Drawing, source: 'sample' | 'upload') {
    drawing.value = next;
    sourceKind.value = source;
    unit.value = 'auto';
    activeLayers.value =
      source === 'sample' ? ['墙体'] : [...new Set(next.segments.map((s) => s.layer))];
    selectedId.value = null;
    clearMeasurements();
    error.value = '';
    notice.value = '';
  }
  function loadSample(kind: 'home' | 'office') {
    importVersion++;
    uploading.value = false;
    loadProgress.value = 0;
    sampleKind.value = kind;
    applyDrawing(createSample(kind), 'sample');
  }
  async function importFile(file: File) {
    const version = ++importVersion;
    error.value = '';
    notice.value = '';
    uploading.value = false;
    loadProgress.value = 0;
    if (!/\.dxf$/i.test(file.name)) {
      error.value = '请选择 .dxf 格式的 ASCII CAD 图纸。当前图纸已保留。';
      return;
    }
    if (!file.size || file.size > 8 * 1024 * 1024) {
      error.value = '文件为空或超过 8 MB，请精简图层后再上传。当前图纸已保留。';
      return;
    }
    uploading.value = true;
    loadProgress.value = 10;
    try {
      const buffer = await file.arrayBuffer();
      let text: string,
        legacyEncoding = false;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      } catch {
        text = new TextDecoder('gb18030').decode(buffer);
        legacyEncoding = true;
      }
      if (version !== importVersion) return;
      loadProgress.value = 60;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (version !== importVersion) return;
      const next = parseDXF(text, file.name);
      if (legacyEncoding)
        next.warnings.push('图纸按 GB18030 / GBK 兼容编码读取，请确认中文图层名称。');
      applyDrawing(next, 'upload');
      loadProgress.value = 100;
      notice.value = `已导入 ${file.name}，识别 ${next.segments.length} 段线及 ${new Set(next.segments.map((s) => s.layer)).size} 个图层。`;
    } catch (cause) {
      if (version === importVersion)
        error.value = `${cause instanceof Error ? cause.message : String(cause)} 当前图纸已保留。`;
    } finally {
      if (version === importVersion) uploading.value = false;
    }
  }
  function setMode(next: ViewMode) {
    mode.value = next;
    preset.value = next === '2d' ? 'top' : 'perspective';
    if (next === '3d') {
      measuring.value = false;
      measureStart.value = null;
    }
  }
  function toggleLayer(name: string, visible: boolean) {
    activeLayers.value = visible
      ? [...new Set([...activeLayers.value, name])]
      : activeLayers.value.filter((layer) => layer !== name);
  }
  function selectAllLayers() {
    activeLayers.value = layers.value.map((layer) => layer.name);
  }
  function toggleMeasuring() {
    measuring.value = !measuring.value;
    measureStart.value = null;
    if (measuring.value) setMode('2d');
  }
  function measurePoint(point: Point) {
    if (!measuring.value) return;
    if (!measureStart.value) {
      measureStart.value = point;
      return;
    }
    const distance = Math.hypot(point[0] - measureStart.value[0], point[1] - measureStart.value[1]);
    if (distance < 1e-6) {
      notice.value = '两点重合，请选择另一个点。';
      return;
    }
    if (measurements.value.length >= 20) {
      notice.value = '最多保留 20 条测量，请先清除历史测量。';
      measureStart.value = null;
      return;
    }
    measurements.value.push({ id: ++measurementId, a: measureStart.value, b: point, distance });
    measureStart.value = null;
  }
  function resetAll() {
    loadSample('home');
    Object.assign(settings, defaultSettings());
    setMode('2d');
    measuring.value = false;
  }
  function download(content: string | Blob, filename: string, mime = 'application/json') {
    const url = URL.createObjectURL(
      content instanceof Blob ? content : new Blob([content], { type: mime })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportDrawing(format: 'json' | 'svg' | 'dxf') {
    if (format === 'dxf') {
      download(
        serializeDXF(createSample(sampleKind.value)),
        `cad-${sampleKind.value}.dxf`,
        'application/dxf'
      );
      return;
    }
    if (!visibleSegments.value.length) {
      error.value = '请至少显示一个图层后再导出。';
      return;
    }
    if (format === 'svg')
      download(createPlanSVG(visibleSegments.value), 'cad-floor-plan.svg', 'image/svg+xml');
    else
      download(
        JSON.stringify(
          {
            version: 1,
            name: drawing.value.name,
            unit: 'm',
            sourceUnit: unit.value === 'auto' ? (drawing.value.unit ?? 'mm') : unit.value,
            sourceBounds: getBounds(drawing.value.segments),
            origin: '图纸包围盒中心，XY 平面',
            settings: { ...settings },
            activeLayers: activeLayers.value,
            segments: visibleSegments.value,
            measurements: measurements.value,
          },
          null,
          2
        ),
        'cad-floor-plan.json'
      );
  }
  watch(unit, () => {
    selectedId.value = null;
    clearMeasurements();
  });
  watch(activeLayers, () => {
    if (!selected.value) selectedId.value = null;
    clearMeasurements();
  });
  onBeforeUnmount(() => {
    importVersion++;
  });
  return {
    drawing,
    sourceKind,
    sampleKind,
    mode,
    preset,
    unit,
    settings,
    activeLayers,
    selectedId,
    measuring,
    measureStart,
    measurements,
    uploading,
    loadProgress,
    error,
    notice,
    visibleSegments,
    bounds,
    totalLength,
    selected,
    layers,
    unitHint,
    loadSample,
    importFile,
    setMode,
    toggleLayer,
    selectAllLayers,
    toggleMeasuring,
    measurePoint,
    clearMeasurements,
    resetAll,
    exportDrawing,
    download,
  };
}
