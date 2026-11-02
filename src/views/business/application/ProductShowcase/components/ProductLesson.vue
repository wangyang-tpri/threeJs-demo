<script setup lang="ts">
import { computed } from 'vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
const props = defineProps<{ explode: number }>();
const lesson = computed(() => (props.explode > 0 ? 'explode' : 'display'));
const { code, explanation } = useCodeExplain(
  {
    display: () =>
      `// 每个零件由独立 Group 持有\nconst parts = new Map();\nparts.set('lens', buildLens());\n// 网格保留零件标识，用于射线拾取\nmesh.userData.partId = 'lens';\nconst hit = raycaster.intersectObjects(visibleMeshes)[0];\nselect(hit?.object.userData.partId);\n// 配色仅更新外壳材质\nbodyMaterial.color.set(finish);`,
    explode: () =>
      `// 保存装配位置，通过父 Group 位移拆解\nconst progress = explode / 100;\nfor (const part of PARTS) {\n  group.position.copy(part.offset).multiplyScalar(progress);\n}\n// 帧率无关的平滑过渡\ncurrent = THREE.MathUtils.damp(current, target, 9, delta);\n// 轨道控制器实现围绕产品旋转\ncontrols.autoRotate = autoRotate;`,
  },
  {
    display: () =>
      '【建模】相机结构由独立零件 Group 构成，镜头含镜筒与玻璃，电路板含芯片和接触点。所有资源本地生成。\n【交互】Raycaster 拾取最近的可见网格，映射到零件；目录与场景选择联动。隐藏或单件查看仅改变可见性。\n【材质】机身配色与粗糙度作用于外壳，不改变传感器、电路板等功能部件。\n【清理】组件卸载释放几何体、材质、纹理，并移除指针事件。',
    explode: () =>
      '【拆解】每个零件保留装配位置，父 Group 沿配置方向平移，零件内部几何关系保持完整。\n【动画】8 秒演示依次拆解、停留观察、组装；暂停保持进度，继续从暂停位置推进。手动调节会结束自动演示。\n【显示】标签仅在拆解或单件查看时显示，支持正面、背面、俯视及透视。\n【限制】内置相机为教学结构示例，不提供真实 CAD 尺寸或装配约束。',
  },
  lesson
);
</script>
<template>
  <section class="product-lesson shrink-0 min-w-0">
    <CodePanel
      class="!w-full min-h-[320px]"
      title="产品展示与零件拆解"
      :code="code"
      :explanation="explanation"
    />
  </section>
</template>
