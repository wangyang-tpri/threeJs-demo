import { computed, ref, watch } from 'vue';
import {
  DESTINATIONS,
  ENTRANCE,
  findRoute,
  type Category,
  type FloorKey,
  type Place,
} from '../mall';
import type { MallRoute, NavigationStatus } from '../types';

/** 统一管理起终点、路线与演示进度，保持跨组件状态一致。 */
export function useMallNavigation() {
  const activeFloor = ref<FloorKey | 'all'>('1F');
  const exploded = ref(true);
  const topView = ref(false);
  const search = ref('');
  const category = ref<Category | '全部'>('全部');
  const selectedId = ref('1F-1');
  const startId = ref(ENTRANCE.id);
  const endId = ref('2F-1');
  const status = ref<NavigationStatus>('idle');
  const progress = ref(0);
  const error = ref('');
  const plannedRoute = ref<MallRoute | null>(null);
  const selected = computed(() => DESTINATIONS.find((p) => p.id === selectedId.value));
  const startPlace = computed(() => DESTINATIONS.find((p) => p.id === startId.value)!);
  const endPlace = computed(() => DESTINATIONS.find((p) => p.id === endId.value)!);
  const routeFloors = computed(() => [
    ...new Set(plannedRoute.value?.nodes.map((n) => n.floor) ?? []),
  ]);
  const routeSteps = computed(() => {
    if (!plannedRoute.value) return [];
    const steps = [
      { floor: startPlace.value.floor, text: `从 ${startPlace.value.name} 出发，沿公共走廊前行` },
    ];
    const nodes = plannedRoute.value.nodes;
    nodes.slice(1).forEach((node, i) => {
      if (node.floor !== nodes[i]!.floor)
        steps.push({
          floor: node.floor,
          text: `乘东侧电梯，从 ${nodes[i]!.floor} 前往 ${node.floor}`,
        });
    });
    steps.push({ floor: endPlace.value.floor, text: `到达 ${endPlace.value.name} 门口` });
    return steps;
  });
  const traveled = ref(0);

  function selectPlace(place: Place) {
    selectedId.value = place.id;
    activeFloor.value = place.floor;
  }

  function planRoute() {
    error.value = '';
    if (startId.value === endId.value) {
      clearRoute();
      error.value = '起点与终点相同，请选择另一个目的地。';
      return;
    }
    plannedRoute.value = findRoute(startId.value, endId.value);
    if (!plannedRoute.value) {
      error.value = '暂时无法找到可通行路线，请重新选择起终点。';
      return;
    }
    traveled.value = 0;
    progress.value = 0;
    status.value = 'idle';
    selectedId.value = endId.value;
    activeFloor.value =
      startPlace.value.floor === endPlace.value.floor ? startPlace.value.floor : 'all';
    if (activeFloor.value === 'all') exploded.value = true;
  }

  function clearRoute() {
    plannedRoute.value = null;
    status.value = 'idle';
    progress.value = 0;
    traveled.value = 0;
    error.value = '';
  }

  function animateNavigation(delta: number) {
    if (status.value !== 'playing' || !plannedRoute.value) return;
    // 8 m/s 加速演示，不作为真实定位或步行速度。
    traveled.value = Math.min(
      traveled.value + Math.min(delta, 0.1) * 8,
      plannedRoute.value.distance
    );
    progress.value = Math.round((traveled.value / plannedRoute.value.distance) * 100);
    if (traveled.value >= plannedRoute.value.distance) status.value = 'arrived';
  }

  function toggleNavigation() {
    if (!plannedRoute.value) return;
    if (status.value === 'playing') {
      status.value = 'paused';
      return;
    }
    if (status.value === 'arrived') {
      traveled.value = 0;
      progress.value = 0;
    }
    activeFloor.value = routeFloors.value.length > 1 ? 'all' : startPlace.value.floor;
    status.value = 'playing';
  }

  function swapEndpoints() {
    const previous = startId.value;
    startId.value = endId.value;
    endId.value = previous;
  }

  function resetAll() {
    clearRoute();
    search.value = '';
    category.value = '全部';
    selectedId.value = '1F-1';
    startId.value = ENTRANCE.id;
    endId.value = '2F-1';
    activeFloor.value = '1F';
    exploded.value = true;
    topView.value = false;
  }
  watch([startId, endId], clearRoute);

  return {
    activeFloor,
    exploded,
    topView,
    search,
    category,
    selectedId,
    startId,
    endId,
    status,
    progress,
    error,
    plannedRoute,
    selected,
    routeFloors,
    routeSteps,
    traveled,
    selectPlace,
    planRoute,
    clearRoute,
    animateNavigation,
    toggleNavigation,
    swapEndpoints,
    resetAll,
  };
}
