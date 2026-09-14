<template>
  <n-layout has-sider class="h-full">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :inverted="inverted"
    >
      <n-menu
        :inverted="inverted"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        :expanded-keys="expandedKeys"
        @update:expanded-keys="handleExpandedChange"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>
    <n-layout class="h-full">
      <router-view></router-view>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import type { MenuOption } from 'naive-ui';
import type { Component } from 'vue';
import {
  AppsOutline as AppIcon,
  AttachOutline as PhysicsIcon,
  BodyOutline as BoneIcon,
  BulbOutline as LightIcon,
  CalculatorOutline as MathIcon,
  CameraOutline as CameraIcon,
  CloudDownloadOutline as ModelIcon,
  CodeSlashOutline as WebGLIcon,
  ColorFilterOutline as PostIcon,
  ColorPaletteOutline as MaterialIcon,
  CubeOutline as CubeIcon,
  DesktopOutline as DesktopIcon,
  FlaskOutline as ShaderIcon,
  GitNetworkOutline as SceneGraphIcon,
  GridOutline as TextureIcon,
  HomeOutline as CadIcon,
  LayersOutline as BasicIcon,
  LocateOutline as RayIcon,
  MapOutline as MallIcon,
  MoveOutline as TransformIcon,
  PlayCircleOutline as AnimationIcon,
  RocketOutline as AdvancedIcon,
  ShapesOutline as ShapesIcon,
  SparklesOutline as ParticlesIcon,
  SpeedometerOutline as PerformanceIcon,
} from '@vicons/ionicons5';
import { NIcon } from 'naive-ui';
import { computed, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const menuOptions: MenuOption[] = [
  {
    label: '基础',
    key: 'basics',
    icon: renderIcon(BasicIcon),
    children: [
      { label: '场景', key: 'scene', icon: renderIcon(CubeIcon) },
      { label: '相机', key: 'camera', icon: renderIcon(CameraIcon) },
      { label: '渲染器', key: 'renderer', icon: renderIcon(DesktopIcon) },
      { label: '几何体', key: 'geometry', icon: renderIcon(ShapesIcon) },
      { label: '材质', key: 'material', icon: renderIcon(MaterialIcon) },
      { label: '灯光', key: 'light', icon: renderIcon(LightIcon) },
      { label: '纹理', key: 'texture', icon: renderIcon(TextureIcon) },
      { label: '坐标与变换', key: 'transform', icon: renderIcon(TransformIcon) },
      { label: '动画入门', key: 'animation', icon: renderIcon(AnimationIcon) },
      { label: '场景图', key: 'scene-graph', icon: renderIcon(SceneGraphIcon) },
    ],
  },
  {
    label: '进阶',
    key: 'forward',
    icon: renderIcon(AdvancedIcon),
    children: [
      { label: '模型加载', key: 'model-load', icon: renderIcon(ModelIcon) },
      { label: '射线拾取', key: 'raycaster', icon: renderIcon(RayIcon) },
      { label: '着色器', key: 'shader', icon: renderIcon(ShaderIcon) },
      { label: '粒子系统', key: 'particles', icon: renderIcon(ParticlesIcon) },
      { label: '性能优化', key: 'performance', icon: renderIcon(PerformanceIcon) },
      { label: '后期处理', key: 'post-processing', icon: renderIcon(PostIcon) },
      { label: '骨骼与变形', key: 'bones-morph', icon: renderIcon(BoneIcon) },
      { label: '物理引擎', key: 'physics', icon: renderIcon(PhysicsIcon) },
      { label: '数学进阶', key: 'math-advanced', icon: renderIcon(MathIcon) },
      { label: 'WebGL原理', key: 'webgl-basics', icon: renderIcon(WebGLIcon) },
    ],
  },
  {
    label: '应用',
    key: 'application',
    icon: renderIcon(AppIcon),
    children: [
      { label: 'cad户型图', key: 'cad-floor-plan', icon: renderIcon(CadIcon) },
      { label: '商场三维导航', key: 'mall-navigation', icon: renderIcon(MallIcon) },
    ],
  },
];

const inverted = ref(false);

const router = useRouter();
const route = useRoute();

const activeKey = computed(() => String(route.name ?? ''));

const expandedKeys = ref<string[]>([]);

function handleExpandedChange(keys: string[]) {
  expandedKeys.value = keys;
}

// hash 路由首屏解析是异步的，等待路由就绪后再按当前路由设置初始展开，
onMounted(async () => {
  await router.isReady();
  const name = String(route.name ?? '');
  if (menuOptions.some((g) => g.key === name)) {
    expandedKeys.value = [name];
    return;
  }
  const group = menuOptions.find((g) => g.children?.some((c) => c.key === name));
  expandedKeys.value = group ? [group.key as string] : ['basics'];
});

function handleMenuSelect(key: string) {
  if (router.hasRoute(key)) router.push({ name: key });
}
</script>
