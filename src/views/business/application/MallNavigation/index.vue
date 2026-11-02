<script setup lang="ts">
import { nextTick, ref } from 'vue';
import MallHeader from './components/MallHeader.vue';
import ShopDirectory from './components/ShopDirectory.vue';
import MallMap from './components/MallMap.vue';
import RoutePlanner from './components/RoutePlanner.vue';
import MallLesson from './components/MallLesson.vue';
import { useMallNavigation } from './composables/useMallNavigation';
const showCode = ref(false);
const mapRef = ref<InstanceType<typeof MallMap> | null>(null);
const {
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
} = useMallNavigation();
async function resetPage() {
  resetAll();
  await nextTick();
  mapRef.value?.fitCamera();
}
</script>

<template>
  <div
    class="mall-page h-full overflow-auto p-[22px] bg-[#f6f8fa] text-[#273e48] flex flex-col gap-[20px] min-[1000.01px]:max-[1250px]:p-[15px] min-[720.01px]:max-[1000px]:p-[15px] max-[720px]:p-[12px]"
  >
    <MallHeader v-model:show-code="showCode" @reset="resetPage" />
    <div
      class="workspace grid grid-cols-[235px_minmax(300px,_1fr)_285px] gap-[16px] flex-1 min-h-[560px] min-[1000.01px]:max-[1250px]:grid-cols-[200px_minmax(260px,_1fr)_260px] min-[1000.01px]:max-[1250px]:gap-[10px] min-[720.01px]:max-[1000px]:grid-cols-[minmax(0,_1fr)_270px] min-[720.01px]:max-[1000px]:gap-[10px] max-[720px]:flex max-[720px]:grid-cols-[minmax(0,_1fr)_270px] max-[720px]:gap-[10px] max-[720px]:flex-col"
    >
      <ShopDirectory
        v-model:search="search"
        v-model:category="category"
        :active-floor="activeFloor"
        :selected-id="selectedId"
        @select="selectPlace"
      />
      <MallMap
        ref="mapRef"
        v-model:active-floor="activeFloor"
        v-model:exploded="exploded"
        v-model:top-view="topView"
        :selected-id="selectedId"
        :planned-route="plannedRoute"
        :traveled="traveled"
        :status="status"
        @select="selectPlace"
        @advance="animateNavigation"
      />
      <RoutePlanner
        v-model:start-id="startId"
        v-model:end-id="endId"
        :planned-route="plannedRoute"
        :route-floors="routeFloors"
        :route-steps="routeSteps"
        :status="status"
        :progress="progress"
        :error="error"
        :selected="selected"
        @plan="planRoute"
        @swap="swapEndpoints"
        @toggle="toggleNavigation"
        @clear="clearRoute"
        @floor="activeFloor = $event"
      />
    </div>
    <MallLesson v-if="showCode" :has-route="!!plannedRoute" />
  </div>
</template>
