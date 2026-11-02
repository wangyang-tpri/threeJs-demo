<script setup lang="ts">
import { computed } from 'vue';
import CodePanel from '@/components/base/CodePanel.vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import type { ViewMode } from '../types';
const props = defineProps<{
  interior?: boolean;
  mode: ViewMode;
  height: number;
  thickness: number;
  name: string;
  count: number;
}>();
const mode = computed(() => (props.interior ? ('interior' as const) : props.mode));
const { code, explanation } = useCodeExplain(
  {
    interior: () =>
      `// 与 CAD 共用米制坐标：二维 XY → 三维 XZ\nconst hit = raycaster.ray.intersectPlane(ground, new THREE.Vector3());\nconst x = Math.round(hit.x * 10) / 10;\nconst y = Math.round(-hit.z * 10) / 10;\nfurniture.position.set(x, 0, -y);\nfurniture.rotation.y = rotation * Math.PI / 180;\n// 每次编辑保存快照，用于撤销 / 重做\nhistory.push(JSON.stringify(design));`,
    '2d': () =>
      `// 解析并保留实体、图层与实际单位\nconst drawing = parseDXF(text, filename);\nconst segments = toMeters(drawing, unitChoice);\nconst visible = segments.filter(s => layers.includes(s.layer));\n// DXF 的 XY 平面映射到 Three.js 的 XZ 平面\nconst point = ([x, y]) => new THREE.Vector3(x, 0, -y);\n// 正交相机：距离不影响投影比例\ncamera = new THREE.OrthographicCamera(left, right, top, bottom);`,
    '3d': () =>
      `// 共享几何体，使用实例化批量构建墙体\nconst walls = new THREE.InstancedMesh(box, material, segments.length);\nsegments.forEach((s, index) => {\n  dummy.scale.set(length(s), ${props.height}, ${props.thickness});\n  dummy.position.set(midX(s), ${props.height / 2}, -midY(s));\n  dummy.rotation.y = Math.atan2(deltaY(s), deltaX(s));\n  dummy.updateMatrix();\n  walls.setMatrixAt(index, dummy.matrix);\n});\n// Raycaster 的 instanceId 对应线段索引`,
  },
  {
    interior: () =>
      '【布置】射线与地面求交获得米制坐标，可吸附到 0.1 m。家具组按真实宽、深、高缩放，绕 Y 轴旋转。\n【碰撞】使用旋转矩形的分离轴检测家具重叠，墙线转换到家具局部坐标做区间裁剪；提示仅作预览，不验证通行或房间边界。\n【材质】地板纹理通过 CanvasTexture 本地生成，按实际尺寸平铺。矮墙预览只改变显示，不修改图纸参数。\n【保存】装修方案独立导出，导入时校验版本、图纸、单位和墙段，操作可撤销恢复。',
    '2d': () =>
      `【解析】支持直线、轻量多段线、传统 POLYLINE/VERTEX、圆与圆弧；多段线 bulge 转圆弧，跨 0° 圆弧按逆时针展开。\n【单位】读取 $INSUNITS 或手动指定单位，只平移到图纸中心并转换为米，不做任意缩放。\n【测量】屏幕射线与 XY 地面求交，靠近线段端点时吸附，测距为平面直线距离。\n【限制】仅解析 ASCII DXF 的二维实体，不展开块引用、标注、填充或非默认 OCS。曲线长度来自离散近似。\n【当前】${props.name} · ${props.count} 段可见线`,
    '3d': () =>
      `【建模】每段可见线作为墙体中心线，InstancedMesh 共享几何体和材质。墙高 ${props.height} m，墙厚 ${props.thickness} m。\n【选取】射线拾取 instanceId，查回所属图层、实体及中心线长度。\n【资源】图层、参数改变时释放旧几何体、材质和纹理，页面离开时清理事件与场景。\n【限制】这是中心线拉伸预览，不自动识别门窗、房间或墙体双线；地板是可见图形的包围盒矩形。\n【当前】${props.name} · ${props.count} 段可见线`,
  },
  mode
);
</script>
<template>
  <div class="cad-lesson shrink-0 min-w-0">
    <CodePanel
      class="!w-full min-h-[320px]"
      :title="interior ? '室内装修设计' : 'CAD 解析与三维建模'"
      :code="code"
      :explanation="explanation"
    />
  </div>
</template>
