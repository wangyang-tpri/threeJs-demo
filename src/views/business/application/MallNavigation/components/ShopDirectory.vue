<script setup lang="ts">
import { computed, toRefs } from 'vue';
import { PLACES, type Category, type FloorKey, type Place } from '../mall';
import { categories, categoryStyles } from '../ui';
const props = defineProps<{ activeFloor: FloorKey | 'all'; selectedId: string }>();
const { activeFloor, selectedId } = toRefs(props);
const search = defineModel<string>('search', { required: true });
const category = defineModel<Category | '全部'>('category', { required: true });
const emit = defineEmits<{ select: [place: Place] }>();
const visiblePlaces = computed(() =>
  PLACES.filter(
    (p) =>
      (activeFloor.value === 'all' || p.floor === activeFloor.value) &&
      (category.value === '全部' || p.category === category.value) &&
      `${p.name}${p.floor}${p.category}`.toLowerCase().includes(search.value.trim().toLowerCase())
  )
);
</script>

<template>
  <aside
    class="directory panel border-[1px] border-solid border-[#e3eaee] rounded-[14px] bg-white overflow-hidden p-[18px] flex flex-col min-h-0 min-[1000.01px]:max-[1250px]:p-[14px] min-[720.01px]:max-[1000px]:p-[14px] min-[720.01px]:max-[1000px]:col-span-full min-[720.01px]:max-[1000px]:max-h-[260px] max-[720px]:p-[14px] max-[720px]:col-span-full max-[720px]:max-h-[250px]"
  >
    <div
      class="panel-heading flex justify-between items-center mb-[18px] min-[720.01px]:max-[1000px]:mb-[10px] max-[720px]:mb-[10px]"
    >
      <h2 class="text-[15px] font-650 m-0">发现目的地</h2>
      <span class="text-[10px] text-[#8b9ba4]">{{ visiblePlaces.length }} 家店铺</span>
    </div>
    <n-input
      v-model:value="search"
      clearable
      placeholder="搜索店铺、餐饮、娱乐…"
      aria-label="搜索店铺"
    />
    <div
      class="category-tabs flex gap-[4px] m-[14px_0_20px] min-[1000.01px]:max-[1250px]:gap-[0] min-[720.01px]:max-[1000px]:gap-[0] min-[720.01px]:max-[1000px]:m-[8px_0] max-[720px]:gap-[0] max-[720px]:m-[8px_0]"
    >
      <button
        class="cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] whitespace-nowrap border-0 border-none border-current p-[6px_7px] rounded-[6px] text-[11px] focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
        v-for="item in categories"
        :key="item"
        :class="
          category === item
            ? 'bg-[#e7f3f0] text-[#188a80] font-650'
            : 'bg-transparent text-[#819199]'
        "
        @click="category = item"
      >
        {{ item }}
      </button>
    </div>
    <div
      class="directory-caption text-[10px] text-[#9aa8ae] tracking-[1px] mb-[10px] min-[720.01px]:max-[1000px]:hidden max-[720px]:hidden"
    >
      {{ activeFloor === 'all' ? '全部楼层' : activeFloor }} · 店铺指南
    </div>
    <div
      class="shop-list overflow-auto flex-1 min-h-[150px] min-[720.01px]:max-[1000px]:min-h-[70px] min-[720.01px]:max-[1000px]:grid min-[720.01px]:max-[1000px]:grid-cols-[repeat(auto-fill,_minmax(170px,_1fr))] max-[720px]:min-h-[70px] max-[720px]:grid max-[720px]:grid-cols-[repeat(auto-fill,_minmax(170px,_1fr))]"
    >
      <button
        v-for="place in visiblePlaces"
        :key="place.id"
        class="shop-card cursor-pointer [font-family:inherit] [transition:background_0.15s,_color_0.15s] flex items-center gap-[10px] w-full text-left p-[12px_8px] border-[1px] border-solid rounded-[9px] mb-[5px] focus-visible:[outline:2px_solid_#188a80] focus-visible:outline-offset-[3px]"
        :class="
          selectedId === place.id
            ? 'bg-[#f0f8f6] border-[#c4e3da]'
            : 'bg-white border-transparent hover:bg-[#f7faf9]'
        "
        @click="emit('select', place)"
      >
        <span
          class="shop-icon grid place-items-center w-[35px] h-[38px] rounded-[8px] text-[17px] shrink-0"
          :class="[categoryStyles[place.category].tint, categoryStyles[place.category].text]"
          >{{ place.name.slice(0, 1) }}</span
        ><span class="shop-copy flex flex-col gap-[5px] flex-1"
          ><strong class="text-[#40535c] text-[12px] font-semibold">{{ place.name }}</strong
          ><small class="text-[#9aa6ad] text-[9px]"
            >{{ place.floor }} · {{ place.category }} · {{ place.id.replace('-', '0') }}</small
          ></span
        ><span class="arrow text-[#a1b3bb]">↗</span>
      </button>
      <div
        v-if="!visiblePlaces.length"
        class="empty-state text-center p-[35px_0] text-[12px] text-[#8b9ba4] leading-[2]"
      >
        没有找到匹配店铺<br /><small class="text-[10px]">试试其他关键词、分类或楼层</small>
      </div>
    </div>
    <div
      class="directory-footer border-t-[1px] border-t-solid border-t-[#eef2f3] pt-[14px] mt-[10px] text-[10px] text-[#96a4ac] min-[720.01px]:max-[1000px]:hidden max-[720px]:hidden"
    >
      ● 点击店铺或三维模型查看详情
    </div>
  </aside>
</template>
