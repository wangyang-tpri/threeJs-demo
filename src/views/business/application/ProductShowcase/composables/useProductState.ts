import { computed, ref } from 'vue';
import { PARTS, FINISHES, demoProgress, type PartId, type ViewPreset } from '../product';

export function useProductState() {
  const selectedId = ref<PartId | null>(null);
  const hiddenIds = ref<PartId[]>([]);
  const isolated = ref(false);
  const explode = ref(0);
  const finish = ref(FINISHES[0]!.color);
  const roughness = ref(0.4);
  const autoRotate = ref(false);
  const labels = ref(true);
  const wireframe = ref(false);
  const theme = ref<'light' | 'dark'>('light');
  const preset = ref<ViewPreset>('perspective');
  const speed = ref(1);
  const playback = ref<'idle' | 'playing' | 'paused' | 'done'>('idle');
  const elapsed = ref(0);
  const selected = computed(() => PARTS.find((p) => p.id === selectedId.value));
  const visibleCount = computed(
    () =>
      PARTS.filter(
        (p) => !hiddenIds.value.includes(p.id) && (!isolated.value || p.id === selectedId.value)
      ).length
  );
  function select(id: PartId | null) {
    selectedId.value = id;
    if (!id) isolated.value = false;
    else hiddenIds.value = hiddenIds.value.filter((part) => part !== id);
  }
  function setExplode(value: number) {
    playback.value = 'idle';
    elapsed.value = 0;
    explode.value = Math.max(0, Math.min(100, value));
  }
  function togglePart(id: PartId) {
    hiddenIds.value = hiddenIds.value.includes(id)
      ? hiddenIds.value.filter((p) => p !== id)
      : [...hiddenIds.value, id];
    if (hiddenIds.value.includes(selectedId.value!)) {
      select(null);
    }
  }
  function restoreParts() {
    hiddenIds.value = [];
    isolated.value = false;
  }
  function toggleIsolation() {
    if (!selectedId.value) return;
    hiddenIds.value = hiddenIds.value.filter((id) => id !== selectedId.value);
    isolated.value = !isolated.value;
  }
  function togglePlayback() {
    if (playback.value === 'playing') {
      playback.value = 'paused';
      return;
    }
    if (playback.value !== 'paused') {
      elapsed.value = 0;
      explode.value = 0;
      restoreParts();
      autoRotate.value = false;
    }
    playback.value = 'playing';
  }
  function advance(delta: number) {
    if (playback.value !== 'playing') return;
    elapsed.value = Math.min(8, elapsed.value + Math.min(Math.max(delta, 0), 0.1) * speed.value);
    explode.value = demoProgress(elapsed.value);
    if (elapsed.value >= 8) playback.value = 'done';
  }
  function reset() {
    select(null);
    restoreParts();
    setExplode(0);
    finish.value = FINISHES[0]!.color;
    roughness.value = 0.4;
    autoRotate.value = false;
    labels.value = true;
    wireframe.value = false;
    theme.value = 'light';
    preset.value = 'perspective';
    speed.value = 1;
  }
  return {
    selectedId,
    hiddenIds,
    isolated,
    explode,
    finish,
    roughness,
    autoRotate,
    labels,
    wireframe,
    theme,
    preset,
    speed,
    playback,
    elapsed,
    selected,
    visibleCount,
    select,
    setExplode,
    togglePart,
    restoreParts,
    toggleIsolation,
    togglePlayback,
    advance,
    reset,
  };
}
