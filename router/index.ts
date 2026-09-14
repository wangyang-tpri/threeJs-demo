import { createRouter, createWebHashHistory } from 'vue-router';
import BasicsIndex from '@/views/business/basics/index.vue';
import ForwardIndex from '@/views/business/forward/index.vue';
import ApplicationIndex from '@/views/business/application/index.vue';
import Scene from '@/views/business/basics/Scene/index.vue';
import Camera from '@/views/business/basics/Camera/index.vue';
import Renderer from '@/views/business/basics/Renderer/index.vue';
import Geometry from '@/views/business/basics/Geometry/index.vue';
import Material from '@/views/business/basics/Material/index.vue';
import Light from '@/views/business/basics/Light/index.vue';
import Texture from '@/views/business/basics/Texture/index.vue';
import Transform from '@/views/business/basics/Transform/index.vue';
import Animation from '@/views/business/basics/Animation/index.vue';
import SceneGraph from '@/views/business/basics/SceneGraph/index.vue';
import ModelLoader from '@/views/business/forward/ModelLoader/index.vue';
import Raycaster from '@/views/business/forward/Raycaster/index.vue';
import Shader from '@/views/business/forward/Shader/index.vue';
import Particles from '@/views/business/forward/Particles/index.vue';
import Performance from '@/views/business/forward/Performance/index.vue';
import PostProcessing from '@/views/business/forward/PostProcessing/index.vue';
import BonesMorph from '@/views/business/forward/BonesMorph/index.vue';
import Physics from '@/views/business/forward/Physics/index.vue';
import MathAdvanced from '@/views/business/forward/MathAdvanced/index.vue';
import WebGLBasics from '@/views/business/forward/WebGLBasics/index.vue';
import CadFloorPlan from '@/views/business/application/CadFloorPlan/index.vue';
import MallNavigation from '@/views/business/application/MallNavigation/index.vue';

const routes = [
  {
    path: '/',
    redirect: '/basics/scene',
  },
  // 基础：一级目录 + children 子页面
  {
    path: '/basics',
    name: 'basics',
    component: BasicsIndex,
    redirect: '/basics/scene',
    children: [
      { path: 'scene', name: 'scene', component: Scene },
      { path: 'camera', name: 'camera', component: Camera },
      { path: 'renderer', name: 'renderer', component: Renderer },
      { path: 'geometry', name: 'geometry', component: Geometry },
      { path: 'material', name: 'material', component: Material },
      { path: 'light', name: 'light', component: Light },
      { path: 'texture', name: 'texture', component: Texture },
      { path: 'transform', name: 'transform', component: Transform },
      { path: 'animation', name: 'animation', component: Animation },
      { path: 'scene-graph', name: 'scene-graph', component: SceneGraph },
    ],
  },
  // 进阶：一级目录 + children 子页面
  {
    path: '/forward',
    name: 'forward',
    component: ForwardIndex,
    redirect: '/forward/model-load',
    children: [
      { path: 'model-load', name: 'model-load', component: ModelLoader },
      { path: 'raycaster', name: 'raycaster', component: Raycaster },
      { path: 'shader', name: 'shader', component: Shader },
      { path: 'particles', name: 'particles', component: Particles },
      { path: 'performance', name: 'performance', component: Performance },
      { path: 'post-processing', name: 'post-processing', component: PostProcessing },
      { path: 'bones-morph', name: 'bones-morph', component: BonesMorph },
      { path: 'physics', name: 'physics', component: Physics },
      { path: 'math-advanced', name: 'math-advanced', component: MathAdvanced },
      { path: 'webgl-basics', name: 'webgl-basics', component: WebGLBasics },
    ],
  },
  // 应用：一级目录 + children 子页面
  {
    path: '/application',
    name: 'application',
    component: ApplicationIndex,
    redirect: '/application/cad-floor-plan',
    children: [
      { path: 'cad-floor-plan', name: 'cad-floor-plan', component: CadFloorPlan },
      { path: 'mall-navigation', name: 'mall-navigation', component: MallNavigation },
    ],
  },
  // 旧路径重定向（兼容历史链接/刷新）
  { path: '/scene', redirect: '/basics/scene' },
  { path: '/camera', redirect: '/basics/camera' },
  { path: '/renderer', redirect: '/basics/renderer' },
  { path: '/geometry', redirect: '/basics/geometry' },
  { path: '/material', redirect: '/basics/material' },
  { path: '/light', redirect: '/basics/light' },
  { path: '/texture', redirect: '/basics/texture' },
  { path: '/transform', redirect: '/basics/transform' },
  { path: '/animation', redirect: '/basics/animation' },
  { path: '/scene-graph', redirect: '/basics/scene-graph' },
  { path: '/model-load', redirect: '/forward/model-load' },
  { path: '/raycaster', redirect: '/forward/raycaster' },
  { path: '/shader', redirect: '/forward/shader' },
  { path: '/particles', redirect: '/forward/particles' },
  { path: '/performance', redirect: '/forward/performance' },
  { path: '/post-processing', redirect: '/forward/post-processing' },
  { path: '/bones-morph', redirect: '/forward/bones-morph' },
  { path: '/physics', redirect: '/forward/physics' },
  { path: '/math-advanced', redirect: '/forward/math-advanced' },
  { path: '/webgl-basics', redirect: '/forward/webgl-basics' },
  { path: '/cad-floor-plan', redirect: '/application/cad-floor-plan' },
  { path: '/mall-navigation', redirect: '/application/mall-navigation' },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
