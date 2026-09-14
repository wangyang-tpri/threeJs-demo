# Three.js 核心 API 交互式教学站

基于 **Vue 3 + Vite + TypeScript** 构建的 Three.js 教学项目：左侧导航按「基础 / 进阶 / 应用」三级目录组织，每个教学页面采用 **功能按钮 + 3D 场景 + 代码讲解面板** 四联动模式，通过交互式演示讲解 Three.js 的核心概念与 API。

## 功能特性

- **基础**：场景、相机、渲染器、几何体、材质、灯光、纹理、坐标与变换、动画入门、场景图
- **进阶**：模型加载、射线拾取、着色器、粒子系统、性能优化、后期处理、骨骼与变形动画、物理引擎、数学进阶、WebGL 原理
- **应用**：CAD 户型图转三维、商场三维导航（楼层切换 / 楼层爆炸）
- 每个页面统一提供：功能按钮区、可交互 3D 场景（左上角黑底状态提示条）、右侧 420px 代码讲解面板（代码高亮 + 原理讲解实时联动）
- 场景生命周期统一封装（`useThreeScene`），教学代码与讲解统一由 `useCodeExplain` 驱动

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | Vue 3.5、Vue Router 5（hash 模式） |
| 构建 | Vite 8、TypeScript 6、vue-tsc |
| UI | naive-ui 2、@vicons/ionicons5、UnoCSS |
| 3D | three 0.185、three/addons、cannon-es（物理引擎） |
| 质量 | ESLint、Prettier、Husky、Commitlint、lint-staged |

## 快速开始

```bash
# 安装依赖（Node >= 22.18 或 >= 24.12）
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 生产构建（类型检查 + 打包）
npm run build

# 预览构建产物
npm run preview
```

开发服务器默认端口 `5173`，如需固定端口：

```bash
npm run dev -- --port 5174 --strictPort
```

## 目录结构

```
Three.js
├── router/index.ts              # 路由表：/basics、/forward、/application 三大模块
├── src
│   ├── main.ts                  # 应用入口（naive-ui、router、uno.css）
│   ├── App.vue
│   ├── assets/                  # 全局样式
│   ├── components
│   │   ├── base/CodePanel.vue   # 代码讲解面板（标题绿色竖杠 + 高亮代码 + 原理讲解）
│   │   └── business/            # 业务组件
│   ├── hooks
│   │   ├── useThreeScene.ts     # Three.js 场景生命周期统一封装
│   │   └── useCodeExplain.ts    # 代码/讲解联动逻辑
│   ├── utils
│   │   └── codeHighlight.ts     # 轻量代码语法高亮（无第三方依赖）
│   ├── views
│   │   ├── base/NavBar/         # 左侧导航菜单
│   │   └── business
│   │       ├── basics/          # 基础模块（10 个教学页）
│   │       ├── forward/         # 进阶模块（10 个教学页）
│   │       └── application/     # 应用模块（2 个综合案例）
```

## 页面清单

### 基础（`/basics`）

| 页面 | 路由 | 核心内容 |
| --- | --- | --- |
| 场景 | `/basics/scene` | Scene、添加/移除物体、坐标系 |
| 相机 | `/basics/camera` | 透视/正交相机、视野角度、相机位置、裁剪面、环绕旋转 |
| 渲染器 | `/basics/renderer` | WebGLRenderer、渲染循环、尺寸/像素比 |
| 几何体 | `/basics/geometry` | Box、Sphere、Cylinder、Plane 等常用几何体 |
| 材质 | `/basics/material` | 基础材质、标准材质、线框/透明等属性 |
| 灯光 | `/basics/light` | 环境光、平行光、点光、聚光灯 |
| 纹理 | `/basics/texture` | 贴图、纹理映射、重复/偏移 |
| 坐标与变换 | `/basics/transform` | position / rotation / scale、局部与世界坐标 |
| 动画入门 | `/basics/animation` | requestAnimationFrame、动画循环、混合器 |
| 场景图 | `/basics/scene-graph` | 父子层级、Group、物体间联动 |

### 进阶（`/forward`）

| 页面 | 路由 | 核心内容 |
| --- | --- | --- |
| 模型加载 | `/forward/model-load` | GLB/GLTF/FBX/Draco 模型解析、本地模型上传、加载进度条 |
| 射线拾取 | `/forward/raycaster` | Raycaster、鼠标拾取、点击高亮 |
| 着色器 | `/forward/shader` | ShaderMaterial、顶点/片元着色器、uniforms |
| 粒子系统 | `/forward/particles` | Points、BufferGeometry 粒子、CPU/GPU 粒子 |
| 性能优化 | `/forward/performance` | InstancedMesh 实例化渲染、draw calls 优化 |
| 后期处理 | `/forward/post-processing` | EffectComposer、Bloom、暗角、胶片、色差 |
| 骨骼与变形 | `/forward/bones-morph` | SkinnedMesh 骨骼动画、MorphTargets 变形 |
| 物理引擎 | `/forward/physics` | cannon-es 刚体、碰撞、约束（双摆/堆叠） |
| 数学进阶 | `/forward/math-advanced` | 点积/叉积、矩阵、四元数 slerp、万向锁 |
| WebGL 原理 | `/forward/webgl-basics` | 原生 WebGL 渲染管线、MVP 矩阵、点云 |

### 应用（`/application`）

| 页面 | 路由 | 核心内容 |
| --- | --- | --- |
| CAD 户型图 | `/application/cad-floor-plan` | DXF 图纸解析、墙体/门窗转三维场景 |
| 商场三维导航 | `/application/mall-navigation` | 平面图转三维、楼层切换、楼层爆炸 |

## 核心封装

### `useThreeScene`（`src/hooks/useThreeScene.ts`）

统一封装 Three.js 场景生命周期：场景 / 相机 / 渲染器 / 轨道控制器 / 网格 / 坐标轴 / 灯光 / 阴影的创建、逐帧渲染循环、容器 Resize 同步与组件卸载销毁。

```ts
const { scene, camera, renderer, controls } = useThreeScene(containerRef, {
  camera: { fov: 55, position: [3, 2, 5], lookAt: [0, 0.5, 0] },
  grid: { size: 6, divisions: 12 },
  axes: 2,
  animate: (delta) => { mixer?.update(delta) },
  onDispose: () => { geo.dispose() },
})
```

关键选项：`loop` 支持 `true / false / 'manual'`（`'manual'` 用于 EffectComposer 后期处理等需要页面接管渲染的场景）。

### `useCodeExplain`（`src/hooks/useCodeExplain.ts`）

由 `codeMap` / `explainMap`（函数式动态生成）驱动，输出高亮后的代码 HTML 与讲解文本，随 `activeKey` 实时刷新。缺失的 key 自动降级为空串，避免渲染中断。

### `CodePanel.vue`（`src/components/base/CodePanel.vue`）

代码讲解面板：标题（左侧绿色竖杠）+ 高亮代码区 + 原理讲解区。

### `codeHighlight`（`src/utils/codeHighlight.ts`）

轻量手写语法高亮（关键字 / 字符串 / 数字 / 注释 / THREE 类名），输出 `c-code-*` 系列 CSS 类，无第三方依赖。

## 路由与菜单约定

- 路由采用 **hash 模式**，一级目录为 `/basics`、`/forward`、`/application`，子页面挂在各自 children 下
- 菜单项 `key` 与路由 `name` 保持一致（如 `scene`、`performance`），点击菜单通过 `router.push({ name: key })` 跳转
- 菜单展开为受控状态：**页面初始化/刷新时只展开当前路由所属的一级菜单**，之后由用户操作接管，路由切换不重置
- 旧路径（如 `/scene`）保留重定向，兼容历史链接

### 新增教学页面步骤

1. 在对应模块目录下新建页面文件夹（如 `src/views/business/forward/Shader/index.vue`）
2. `router/index.ts` 中注册路由（children 下添加 `path + name + component`）
3. `src/views/base/NavBar/index.vue` 中添加菜单项（key 与路由 name 一致，可选 `@vicons/ionicons5` 图标）

## 工程规范

- 提交信息遵循 Conventional Commits（`npm run commit` 使用 czg 引导）
- 提交前 Husky + lint-staged 自动执行 ESLint / Prettier
- 代码风格：Prettier 统一格式化，UnoCSS 原子类（`flex`、`p-4`、`gap-3` 等）
