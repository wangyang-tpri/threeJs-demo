# Three.js 核心 API 交互式教学站

基于 **Vue 3 + Vite + TypeScript** 构建的 Three.js 教学项目：左侧导航按「基础 / 进阶 / 应用」三级目录组织，每个教学页面采用 **功能按钮 + 3D 场景 + 代码讲解面板** 四联动模式，通过交互式演示讲解 Three.js 的核心概念与 API。

## 功能特性

- **基础**：场景、相机、渲染器、几何体、材质、灯光、纹理、坐标与变换、动画入门、场景图
- **进阶**：模型加载、射线拾取、着色器、粒子系统、性能优化、后期处理、骨骼与变形动画、物理引擎、数学进阶、WebGL 原理
- **应用**：CAD 户型图转三维、商场三维导航（24 家示例店铺 / 搜索筛选 / 楼层切换与展开 / 走廊最短路径 / 跨层电梯 / 导航动画）
- **产品展示**：相机结构示例、7 个零件、机身配色、自动旋转、拆解/组装动画、零件显隐与单件查看、截图与配置导出
- 每个页面统一提供：功能按钮区、可交互 3D 场景（左上角黑底状态提示条）、右侧 420px 代码讲解面板（代码高亮 + 原理讲解实时联动）
- 场景生命周期统一封装（`useThreeScene`），教学代码与讲解统一由 `useCodeExplain` 驱动

- **地理数据可视化**：三维地球、17 座示例城市、指标排行、区域筛选、球面流向动画、大圆距离、GeoJSON 与截图导出。简化大陆轮廓和本地模拟指标，不代表测绘或实时数据。

- **网页小游戏**：三维城市跑酷，换道与跳跃、金币计分、三档难度、碰撞保护、暂停恢复、1000 米通关和浏览器最高分。

- **园区数字孪生**：6 栋三维楼宇、总览/能耗/安防视图、昼夜切换、模拟传感器、告警确认恢复、道路巡检、趋势图与导出。

- **应急疏散模拟**：网格建筑、人群排队、多出口寻路、出口开关、危险区、速度倍率、疏散曲线与报告导出（教学示例）。

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
│   │       └── application/     # 应用模块（9 个综合案例）
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
| 应急疏散模拟 | `/application/evacuation-simulation` | 多源 BFS、人群占用排队、出口与危险区实时修改、过程统计、报告导出 |
| 园区数字孪生 | `/application/campus-twin` | 楼宇资产、能源视图、模拟设备告警、道路巡检、昼夜切换、数据与截图导出 |
| 网页小游戏 | `/application/web-game` | 三维跑酷、键盘/触屏操作、金币和生命值、三档难度、最高分、暂停与通关 |
| CAD 户型图 | `/application/cad-floor-plan` | DXF 单位识别与图层筛选、二维/三维切换、墙体参数、线段检查、测距与导出、室内装修设计 |
| 商场三维导航 | `/application/mall-navigation` | 平面图转三维、楼层切换、楼层爆炸 |
| 产品三维展示与零件拆解 | `/application/product-showcase` | 相机外观、配色、零件选择、显隐/隔离、拆解组装演示与导出 |
| 仓储物流可视化 | `/application/warehouse-visualization` | 三维货架与库位、库存筛选、单车入出库任务与路线动画 |
| 工业设备监控 | `/application/industrial-monitoring` | 三维设备回路、传感器趋势、模拟异常、告警确认与恢复、数据导出 |

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
