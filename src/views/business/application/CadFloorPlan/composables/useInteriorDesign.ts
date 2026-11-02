import { computed, ref, watch, type Ref } from 'vue';
import type { Bounds, Point, Segment } from '../dxf';
import {
  designWarnings,
  furnitureCatalog,
  validateDesign,
  type Furniture,
  type FurnitureKind,
  type InteriorDesign,
} from '../interior';
export function useInteriorDesign(
  bounds: Ref<Bounds>,
  segments: Ref<Segment[]>,
  thickness: () => number
) {
  const cutaway = ref(true);
  const enabled = ref(false),
    placing = ref<FurnitureKind | null>(null),
    moving = ref(false),
    selectedId = ref<string | null>(null),
    snap = ref(true),
    message = ref('');
  const design = ref<InteriorDesign>({ items: [], floor: 'wood', floorColor: '#d8bd96' });
  const history = ref<string[]>([]),
    future = ref<string[]>([]);
  const selected = computed(() => design.value.items.find((f) => f.id === selectedId.value));
  const warnings = computed(() =>
    designWarnings(design.value.items, bounds.value, segments.value, thickness())
  );
  const budget = computed(() =>
    design.value.items.reduce((sum, f) => sum + furnitureCatalog[f.kind].price, 0)
  );
  function commit(next: InteriorDesign) {
    const json = JSON.stringify(design.value);
    if (json === JSON.stringify(next)) return;
    history.value = [...history.value.slice(-49), json];
    future.value = [];
    design.value = next;
  }
  function patch(patch: Partial<Furniture>) {
    if (!selected.value) return;
    commit({
      ...design.value,
      items: design.value.items.map((f) =>
        f.id === selectedId.value ? { ...f, ...patch, id: f.id, kind: f.kind } : f
      ),
    });
  }
  function surface(patch: Partial<Pick<InteriorDesign, 'floor' | 'floorColor'>>) {
    commit({ ...design.value, ...patch });
  }
  function place(p: Point) {
    const [x, y] = p.map((n) => (snap.value ? Math.round(n * 10) / 10 : n)) as Point;
    if (moving.value && selected.value) {
      patch({ x, y });
      moving.value = false;
      return;
    }
    if (!placing.value) return;
    if (design.value.items.length >= 100) {
      message.value = '最多放置 100 件家具。';
      placing.value = null;
      return;
    }
    const kind = placing.value,
      c = furnitureCatalog[kind],
      item: Furniture = {
        id: crypto.randomUUID(),
        kind,
        x,
        y,
        width: c.width,
        depth: c.depth,
        height: c.height,
        rotation: 0,
        color: c.color,
      };
    commit({ ...design.value, items: [...design.value.items, item] });
    selectedId.value = item.id;
    placing.value = null;
  }
  function begin(kind: FurnitureKind) {
    placing.value = kind;
    moving.value = false;
    message.value = '';
  }
  function remove() {
    if (!selected.value) return;
    commit({ ...design.value, items: design.value.items.filter((f) => f.id !== selectedId.value) });
    selectedId.value = null;
    moving.value = false;
  }
  function duplicate() {
    if (!selected.value || design.value.items.length >= 100) return;
    const copy = {
      ...selected.value,
      id: crypto.randomUUID(),
      x: selected.value.x + 0.3,
      y: selected.value.y + 0.3,
    };
    commit({ ...design.value, items: [...design.value.items, copy] });
    selectedId.value = copy.id;
  }
  function travel(undo: boolean) {
    const from = undo ? history : future,
      to = undo ? future : history;
    if (!from.value.length) return;
    to.value.push(JSON.stringify(design.value));
    design.value = JSON.parse(from.value.pop()!);
    selectedId.value = null;
    cancel();
  }
  function cancel() {
    placing.value = null;
    moving.value = false;
  }
  function clear() {
    commit({ ...design.value, items: [] });
    selectedId.value = null;
    cancel();
  }
  function reset() {
    snap.value = true;
    cutaway.value = true;
    design.value = { items: [], floor: 'wood', floorColor: '#d8bd96' };
    history.value = [];
    future.value = [];
    selectedId.value = null;
    message.value = '';
    cancel();
  }
  function restore(value: unknown) {
    commit(validateDesign(value));
    selectedId.value = null;
    cancel();
  }
  watch(enabled, cancel);
  return {
    cutaway,
    enabled,
    placing,
    moving,
    selectedId,
    snap,
    message,
    design,
    selected,
    warnings,
    budget,
    history,
    future,
    patch,
    surface,
    place,
    begin,
    remove,
    duplicate,
    travel,
    cancel,
    clear,
    reset,
    restore,
  };
}
export type InteriorState = ReturnType<typeof useInteriorDesign>;
