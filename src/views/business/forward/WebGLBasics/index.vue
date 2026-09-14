<template>
  <div class="flex h-full flex-col gap-3 p-4">
    <!-- 功能按钮区 -->
    <div class="flex flex-wrap gap-2">
      <n-button
        v-for="b in buttons"
        :key="b.key"
        :type="activeMode === b.key ? 'primary' : 'default'"
        size="small"
        @click="applyMode(b.key)"
      >
        {{ b.label }}
      </n-button>
    </div>

    <!-- 原生 WebGL 画布 + 代码讲解 -->
    <div class="flex min-h-0 flex-1 gap-3">
      <div class="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-slate-900">
        <canvas ref="canvasRef" class="h-full w-full"></canvas>
        <div class="pointer-events-none absolute left-3 top-3 z-10 rounded bg-black/55 px-2 py-1 text-xs text-white">
          {{ statusText }}
        </div>
      </div>
      <CodePanel title="WebGL 原理 · 原生渲染管线" :code="code" :explanation="explanation" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useCodeExplain } from '@/hooks/useCodeExplain';
import CodePanel from '@/components/base/CodePanel.vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const statusText = ref('加载中…');
const activeMode = ref('triangle');

let gl: WebGLRenderingContext | null = null;
let rafId = 0;
let lastTime = 0;

const buttons = [
  { key: 'triangle', label: '第一个三角形' },
  { key: 'color', label: '顶点着色' },
  { key: 'cube', label: '旋转立方体' },
  { key: 'points', label: '粒子点云' },
];

/* ================= 手写矩阵（列主序，与 WebGL 一致） ================= */
function mat4Perspective(fovy: number, aspect: number, near: number, far: number): number[] {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

function mat4Multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      const v =
        (a[r] ?? 0) * (b[c * 4] ?? 0) +
        (a[4 + r] ?? 0) * (b[c * 4 + 1] ?? 0) +
        (a[8 + r] ?? 0) * (b[c * 4 + 2] ?? 0) +
        (a[12 + r] ?? 0) * (b[c * 4 + 3] ?? 0);
      out[c * 4 + r] = v;
    }
  }
  return out;
}

function mat4RotationY(angle: number): number[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

function mat4Identity(): number[] {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/* ================= Shader 编译工具 ================= */
function compileShader(type: number, source: string): WebGLShader | null {
  const g = gl!;
  const sh = g.createShader(type)!;
  g.shaderSource(sh, source);
  g.compileShader(sh);
  if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) {
    console.error('shader error:', g.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

function createProgram(vsSrc: string, fsSrc: string): WebGLProgram | null {
  const g = gl!;
  const vs = compileShader(g.VERTEX_SHADER, vsSrc);
  const fs = compileShader(g.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = g.createProgram()!;
  g.attachShader(prog, vs);
  g.attachShader(prog, fs);
  g.linkProgram(prog);
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) {
    console.error('link error:', g.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

/* 通用着色器源码 */
const VERT_SIMPLE = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAG_RED = `
precision mediump float;
void main() {
  gl_FragColor = vec4(1.0, 0.3, 0.3, 1.0);
}`;
const VERT_COLOR = `
attribute vec2 aPos;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAG_COLOR = `
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}`;
const VERT_CUBE = `
attribute vec3 aPos;
attribute vec3 aColor;
uniform mat4 uMVP;
varying vec3 vColor;
void main() {
  vColor = aColor;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;
const FRAG_CUBE = `
precision mediump float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}`;
const VERT_POINTS = `
attribute vec3 aPos;
uniform mat4 uRot;
uniform float uSize;
void main() {
  gl_PointSize = uSize;
  gl_Position = uRot * vec4(aPos, 1.0);
}`;
const FRAG_POINTS = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.5, 0.85, 1.0, 1.0);
}`;

/* ================= 各模式实现 ================= */
let cubeRotation = 0;
let pointsRotation = 0;
let cubeFrame: ((dt: number) => void) | null = null;
let pointsFrame: ((dt: number) => void) | null = null;

function clearGL() {
  const g = gl;
  if (!g) return;
  g.clearColor(0.05, 0.08, 0.16, 1);
  g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
}

function buildTriangle() {
  const g = gl!;
  const prog = createProgram(VERT_SIMPLE, FRAG_RED)!;
  g.useProgram(prog);
  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(
    g.ARRAY_BUFFER,
    new Float32Array([-0.6, -0.5, 0.6, -0.5, 0.0, 0.6]),
    g.STATIC_DRAW
  );
  const loc = g.getAttribLocation(prog, 'aPos');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
  g.drawArrays(g.TRIANGLES, 0, 3);
  statusText.value = '渲染管线：编译着色器 → 上传顶点数据 → 绑定 attribute → drawArrays(TRIANGLES, 0, 3)';
}

function buildColorTriangle() {
  const g = gl!;
  const prog = createProgram(VERT_COLOR, FRAG_COLOR)!;
  g.useProgram(prog);
  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  // 顶点位置 + 颜色（stride = 5 floats）
  g.bufferData(
    g.ARRAY_BUFFER,
    new Float32Array([
      -0.6, -0.5, 1, 0, 0,
      0.6, -0.5, 0, 1, 0,
      0.0, 0.6, 0, 0, 1,
    ]),
    g.STATIC_DRAW
  );
  const locPos = g.getAttribLocation(prog, 'aPos');
  const locColor = g.getAttribLocation(prog, 'aColor');
  g.enableVertexAttribArray(locPos);
  g.vertexAttribPointer(locPos, 2, g.FLOAT, false, 5 * 4, 0);
  g.enableVertexAttribArray(locColor);
  g.vertexAttribPointer(locColor, 3, g.FLOAT, false, 5 * 4, 2 * 4);
  g.drawArrays(g.TRIANGLES, 0, 3);
  statusText.value = 'varying 插值：顶点颜色经光栅化阶段在片元间线性插值，形成渐变（GPU 自动完成）';
}

function buildCube() {
  const g = gl!;
  g.enable(g.DEPTH_TEST); // 深度测试：后画的像素只有更近才覆盖
  const prog = createProgram(VERT_CUBE, FRAG_CUBE)!;
  g.useProgram(prog);

  // 24 顶点（每面 4 个，颜色区分面）
  const positions: number[] = [];
  const colors: number[] = [];
  const faces: [number[], number[]][] = [
    [[-0.5, -0.5, 0.5], [0.9, 0.2, 0.2]],
    [[0.5, -0.5, 0.5], [0.2, 0.9, 0.2]],
    [[0.5, 0.5, 0.5], [0.2, 0.2, 0.9]],
    [[-0.5, 0.5, 0.5], [0.9, 0.9, 0.2]],
    [[-0.5, -0.5, -0.5], [0.9, 0.4, 0.9]],
    [[0.5, -0.5, -0.5], [0.2, 0.9, 0.9]],
    [[0.5, 0.5, -0.5], [0.9, 0.6, 0.2]],
    [[-0.5, 0.5, -0.5], [0.5, 0.9, 0.5]],
  ];
  // 6 个面（索引 0-7）
  const faceIdx: [number, number, number, number][] = [
    [0, 1, 2, 3], // 前 z+
    [4, 5, 6, 7], // 后 z-
    [0, 1, 5, 4], // 下
    [2, 3, 7, 6], // 上
    [0, 3, 7, 4], // 左
    [1, 2, 6, 5], // 右
  ];
  for (const [a, b, c, d] of faceIdx) {
    const quad = [a, b, c, c, d, a]; // 两个三角形
    for (const idx of quad) {
      const p = faces[idx]![0];
      const col = faces[idx]![1];
      positions.push(...p);
      colors.push(...col);
    }
  }
  const bufPos = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, bufPos);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array(positions), g.STATIC_DRAW);
  const locPos = g.getAttribLocation(prog, 'aPos');
  g.enableVertexAttribArray(locPos);
  g.vertexAttribPointer(locPos, 3, g.FLOAT, false, 0, 0);

  const bufColor = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, bufColor);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array(colors), g.STATIC_DRAW);
  const locColor = g.getAttribLocation(prog, 'aColor');
  g.enableVertexAttribArray(locColor);
  g.vertexAttribPointer(locColor, 3, g.FLOAT, false, 0, 0);

  cubeRotation = 0;
  const uMVP = g.getUniformLocation(prog, 'uMVP');

  cubeFrame = (dt: number) => {
    cubeRotation += dt * 0.8;
    clearGL();
    const aspect = g.drawingBufferWidth / Math.max(1, g.drawingBufferHeight);
    const proj = mat4Perspective((60 * Math.PI) / 180, aspect, 0.1, 100);
    const view = mat4Identity();
    view[14] = -3; // 平移 -3（沿 Z 轴后退）
    const mv = mat4Multiply(view, mat4RotationY(cubeRotation));
    const mvp = mat4Multiply(proj, mv);
    g.uniformMatrix4fv(uMVP, false, new Float32Array(mvp));
    g.drawArrays(g.TRIANGLES, 0, 36);
  };
  statusText.value = 'MVP 矩阵链：Model(旋转) × View(相机后退) × Projection(透视) → NDC 裁剪坐标';
}

function buildPoints() {
  const g = gl!;
  g.disable(g.DEPTH_TEST);
  const prog = createProgram(VERT_POINTS, FRAG_POINTS)!;
  g.useProgram(prog);

  // 15000 个随机球体分布点（NDC）
  const COUNT = 15000;
  const pts = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // 球体内均匀分布（cbrt 修正体积均匀）
    const r = Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pts[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pts[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pts[i * 3 + 2] = r * Math.cos(phi);
  }
  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(g.ARRAY_BUFFER, pts, g.STATIC_DRAW);
  const loc = g.getAttribLocation(prog, 'aPos');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 3, g.FLOAT, false, 0, 0);
  pointsRotation = 0;
  const uRot = g.getUniformLocation(prog, 'uRot');
  const uSize = g.getUniformLocation(prog, 'uSize');
  g.uniform1f(uSize, 2.5);

  pointsFrame = (dt: number) => {
    pointsRotation += dt * 0.3;
    clearGL();
    const rot = mat4RotationY(pointsRotation);
    g.uniformMatrix4fv(uRot, false, new Float32Array(rot));
    g.drawArrays(g.POINTS, 0, COUNT);
  };
  statusText.value = `POINTS 图元：一次 drawArrays 绘制 ${COUNT.toLocaleString()} 个点（gl_PointSize 控制点大小）`;
}

/* ================= 渲染循环 ================= */
function frame(time: number) {
  const dt = lastTime ? (time - lastTime) / 1000 : 0;
  lastTime = time;
  const g = gl;
  if (!g) return;
  if (activeMode.value === 'cube') {
    cubeFrame?.(dt);
  } else if (activeMode.value === 'points') {
    pointsFrame?.(dt);
  } else {
    clearGL();
    if (activeMode.value === 'triangle') buildTriangle();
    else if (activeMode.value === 'color') buildColorTriangle();
  }
  rafId = requestAnimationFrame(frame);
}

function applyMode(key: string) {
  activeMode.value = key;
  const g = gl;
  if (!g) return;
  lastTime = 0;
  if (key === 'cube') {
    buildCube();
  } else if (key === 'points') {
    buildPoints();
  } else {
    clearGL();
    if (key === 'triangle') buildTriangle();
    else if (key === 'color') buildColorTriangle();
  }
}

function onResize() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  canvas.width = w;
  canvas.height = h;
  gl?.viewport(0, 0, w, h);
}

/* ============ 代码讲解 ============ */
const CODE = {
  triangle: () => `// 1. 获取上下文
const gl = canvas.getContext('webgl')

// 2. 编译着色器（顶点 + 片元）
// 顶点着色器：决定顶点位置（每个顶点执行一次）
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
// 片元着色器：决定像素颜色（每个像素执行一次）
precision mediump float;
void main() { gl_FragColor = vec4(1.0, 0.3, 0.3, 1.0); }

// 3. 上传顶点数据到 GPU
const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(gl.ARRAY_BUFFER,
  new Float32Array([-0.6,-0.5, 0.6,-0.5, 0,0.6]),
  gl.STATIC_DRAW)

// 4. 告诉 GPU 顶点数据怎么读
const loc = gl.getAttribLocation(prog, 'aPos')
gl.enableVertexAttribArray(loc)
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

// 5. 发起绘制！
gl.drawArrays(gl.TRIANGLES, 0, 3)`,
  color: () => `// 顶点着色器输出 varying（每个顶点一个值）
attribute vec2 aPos;
attribute vec3 aColor;      // 每顶点颜色
varying vec3 vColor;        // 传给片元着色器
void main() {
  vColor = aColor;
  gl_Position = vec4(aPos, 0.0, 1.0);
}

// 片元着色器接收（每像素一个值）
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor, 1.0);
}

// GPU 自动在三角形内部对 3 个顶点颜色
// 做重心坐标插值 → 平滑渐变！

// 数据交错布局（stride=5，offset 区分）：
// [x,y, r,g,b,  x,y, r,g,b, ...]
gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 5*4, 0)
gl.vertexAttribPointer(locColor, 3, gl.FLOAT, false, 5*4, 2*4)`,
  cube: () => `// 三维需要矩阵：M(模型)×V(视图)×P(投影)
// 顶点着色器：
uniform mat4 uMVP;
void main() {
  gl_Position = uMVP * vec4(aPos, 1.0);
}

// 手写透视矩阵（列主序）：
function mat4Perspective(fovy, aspect, near, far) { ... }
// 视锥 → 归一化设备坐标（NDC），z 参与 w 除法

// 每帧：
mvp = proj × view × model
gl.uniformMatrix4fv(uMVP, false, mvp)
gl.drawArrays(gl.TRIANGLES, 0, 36)

// 深度测试：让远近遮挡正确
gl.enable(gl.DEPTH_TEST)
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

// 这就是 three.js 每帧在做的事：
// 它替你管理矩阵、缓冲、着色器、状态`,
  points: () => `// POINTS 图元：高效绘制海量点
// 顶点着色器：
attribute vec3 aPos;
uniform float uSize;
void main() {
  gl_PointSize = uSize;      // 点的大小（像素）
  gl_Position = vec4(aPos, 1.0);
}

// 片元着色器：每个"点精灵"执行一次
void main() {
  gl_FragColor = vec4(0.5, 0.85, 1.0, 1.0);
}

// 一次调用画 15000 个点：
const data = new Float32Array(15000 * 3)
// ...随机球面分布
gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
gl.drawArrays(gl.POINTS, 0, 15000)

// 对比 three.js 粒子（章节"粒子系统"）：
// Points 封装了完全相同的机制`,
};

const EXPLAIN = {
  triangle: () => `WebGL 渲染管线（固定流程）：

1. 顶点着色器：每个顶点执行一次，输出裁剪坐标
2. 图元装配：把顶点连成三角形
3. 光栅化：把三角形变成像素片段（fragment）
4. 片元着色器：每个像素执行一次，输出颜色
5. 写入帧缓冲 → 屏幕

CPU（JavaScript）只做三件事：编译着色器、上传数据（buffer）、发起绘制（drawArrays）。

three.js 的 WebGLRenderer.render() 内部就是这一整套流程——只是它帮你管理了所有重复代码。本页代码与 three.js 源码里 WebGLRenderer 做的事一一对应。`,
  color: () => `varying（可变变量）是着色器之间传值的通道：

- 顶点着色器为每个顶点写一个 varying 值
- 光栅化阶段按重心坐标对三角形内部插值
- 片元着色器收到每个像素的插值结果

这就是"Gouraud 着色"的基础——平滑渐变不是逐像素算的，是插值出来的。three.js 的顶点颜色、UV 坐标、法线全部走同样的 varying 通道。

数据交错布局（Interleaved）：位置和颜色放同一 buffer，用 stride 和 offset 区分——减少 buffer 绑定次数，是性能优化常用技巧。`,
  cube: () => `三维渲染的核心是 MVP 矩阵链：

- Model 矩阵：物体自身的旋转/平移/缩放（本页 = 绕 Y 轴旋转）
- View 矩阵：相机位置（本页 = 沿 Z 后退 3 个单位）
- Projection 矩阵：透视投影（近大远小），把视锥映射到 NDC [-1,1]³

gl_Position = P × V × M × 顶点

投影矩阵的关键：w 分量参与除法。透视矩阵把 z 编码进 w，顶点经齐次除法 (x/w, y/w, z/w) 后产生近大远小效果——这就是"3D 透视"的数学本质。

three.js 中 camera.projectionMatrix / camera.matrixWorldInverse 就是这里手写的 P 和 V。`,
  points: () => `POINTS 是 WebGL 四种基本图元之一（另外三种：TRIANGLES / LINES / LINE_STRIP）。

点精灵（Point Sprite）特性：
- 每个点由 gl_PointSize 控制屏幕像素大小
- 片元着色器可访问 gl_PointCoord 做纹理/圆形裁剪
- 海量粒子只需一次 drawArrays——CPU 开销极低

性能要点（呼应"性能优化"章节）：
- 顶点数据一次性上传 GPU（STATIC_DRAW），每帧只改 uniform
- 15000 个点 = 1 次 draw call
- three.js 的 Points/PointsMaterial 底层就是这个机制`,
};

const { code, explanation } = useCodeExplain(CODE, EXPLAIN, activeMode);

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  gl = canvas.getContext('webgl');
  if (!gl) {
    statusText.value = '当前环境不支持 WebGL';
    return;
  }
  onResize();
  window.addEventListener('resize', onResize);
  applyMode('triangle');
  rafId = requestAnimationFrame(frame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener('resize', onResize);
  gl = null;
});
</script>
