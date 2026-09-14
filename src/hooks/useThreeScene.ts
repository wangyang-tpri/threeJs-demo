import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'

export interface UseThreeSceneOptions {
  /** 场景背景色，默认 0xf5f7fa */
  background?: number | string
  /** 相机配置 */
  camera?: {
    fov?: number
    near?: number
    far?: number
    position?: [number, number, number]
    lookAt?: [number, number, number] | null
  }
  /** 轨道控制器配置 */
  controls?: {
    target?: [number, number, number]
    enabled?: boolean
  }
  /** 地面网格，传 false 关闭 */
  grid?: { size?: number; divisions?: number; color1?: number; color2?: number } | false
  /** 坐标轴长度，传 false 关闭 */
  axes?: number | false
  /** 灯光，传 false 关闭 */
  lights?: { ambient?: number; directional?: number; dirPosition?: [number, number, number] } | false
  /** 阴影配置 */
  shadow?: boolean | { enabled?: boolean; mapSize?: number; cameraBounds?: number }
  /** 是否由 hook 内部启动逐帧渲染循环，默认 true；Renderer 页演示渲染循环时传 false；后期处理等需接管渲染时传 'manual'（仅跑 controls+animate，不自动 render） */
  loop?: boolean | 'manual'
  /** 每帧回调（在 controls.update + render 之后调用），delta 为秒 */
  animate?: (delta: number, time: number) => void
  /** 容器尺寸变化回调（默认已处理透视/正交相机 aspect） */
  onResize?: (width: number, height: number) => void
  /** 组件卸载时的附加清理（页面资源：几何体/材质/模型等） */
  onDispose?: () => void
}

const DEFAULT_GRID = { size: 8, divisions: 16, color1: 0xcbd5e1, color2: 0xe2e8f0 }
const DEFAULT_LIGHTS = {
  ambient: 0.7,
  directional: 1.2,
  dirPosition: [5, 10, 7] as [number, number, number],
}

/**
 * Three.js 场景生命周期统一封装：
 * 场景/相机/渲染器/轨道控制器/网格/坐标轴/灯光/阴影 的创建、
 * 逐帧渲染循环、容器 Resize 同步、组件卸载销毁。
 *
 * 用法：
 * const { scene, camera, renderer, controls } = useThreeScene(containerRef, {
 *   camera: { fov: 55, position: [3, 2, 5], lookAt: [0, 0.5, 0] },
 *   grid: { size: 6, divisions: 12 },
 *   axes: 2,
 *   animate: (dt) => { mixer?.update(dt) },
 *   onDispose: () => { geo.dispose() },
 * })
 */
export function useThreeScene(
  containerRef: Ref<HTMLDivElement | null>,
  options: UseThreeSceneOptions = {}
) {
  const scene = shallowRef<THREE.Scene | null>(null)
  const camera = shallowRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null)
  const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
  const controls = shallowRef<OrbitControls | null>(null)

  let resizeObserver: ResizeObserver | null = null
  let lastTime = 0
  let disposed = false

  type ResolvedOptions = {
    background: number | string
    camera: {
      fov: number
      near: number
      far: number
      position: [number, number, number]
      lookAt: [number, number, number] | null
    }
    controls: { target: [number, number, number]; enabled: boolean }
    grid: { size: number; divisions: number; color1: number; color2: number } | false
    axes: number | false
    lights: { ambient: number; directional: number; dirPosition: [number, number, number] } | false
    shadow: boolean | { enabled?: boolean; mapSize?: number; cameraBounds?: number }
    loop: boolean | 'manual'
    animate?: (delta: number, time: number) => void
    onResize?: (width: number, height: number) => void
    onDispose?: () => void
  }

  const opt: ResolvedOptions = {
    background: options.background ?? 0xf5f7fa,
    camera: {
      fov: options.camera?.fov ?? 55,
      near: options.camera?.near ?? 0.1,
      far: options.camera?.far ?? 1000,
      position: options.camera?.position ?? ([3, 2, 5] as [number, number, number]),
      lookAt: options.camera?.lookAt ?? null,
    },
    controls: {
      target: options.controls?.target ?? ([0, 0, 0] as [number, number, number]),
      enabled: options.controls?.enabled ?? true,
    },
    grid:
      options.grid === undefined
        ? { ...DEFAULT_GRID }
        : options.grid === false
          ? false
          : { ...DEFAULT_GRID, ...options.grid },
    axes: options.axes ?? 2,
    lights:
      options.lights === undefined
        ? { ...DEFAULT_LIGHTS }
        : options.lights === false
          ? false
          : { ...DEFAULT_LIGHTS, ...options.lights },
    shadow: options.shadow ?? false,
    loop: options.loop ?? true,
    animate: options.animate,
    onResize: options.onResize,
    onDispose: options.onDispose,
  }

  function init() {
    const container = containerRef.value
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) return
    if (disposed) return

    const s = new THREE.Scene()
    s.background = new THREE.Color(opt.background)
    scene.value = s

    const c = new THREE.PerspectiveCamera(
      opt.camera.fov,
      container.clientWidth / container.clientHeight,
      opt.camera.near,
      opt.camera.far
    )
    c.position.set(...opt.camera.position)
    if (opt.camera.lookAt) c.lookAt(...opt.camera.lookAt)
    camera.value = c

    const r = new THREE.WebGLRenderer({ antialias: true })
    r.setSize(container.clientWidth, container.clientHeight)
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    if (opt.shadow) {
      r.shadowMap.enabled = typeof opt.shadow === 'boolean' ? true : (opt.shadow.enabled ?? true)
    }
    container.appendChild(r.domElement)
    renderer.value = r

    const ct = new OrbitControls(c, r.domElement)
    ct.enableDamping = true
    ct.target.set(...opt.controls.target)
    ct.enabled = opt.controls.enabled
    ct.update()
    controls.value = ct

    if (opt.grid !== false) {
      s.add(new THREE.GridHelper(opt.grid.size, opt.grid.divisions, opt.grid.color1, opt.grid.color2))
    }
    if (opt.axes !== false) {
      s.add(new THREE.AxesHelper(opt.axes))
    }
    if (opt.lights !== false) {
      s.add(new THREE.AmbientLight(0xffffff, opt.lights.ambient))
      const dir = new THREE.DirectionalLight(0xffffff, opt.lights.directional)
      dir.position.set(...opt.lights.dirPosition)
      if (opt.shadow) {
        dir.castShadow = true
        const mapSize = typeof opt.shadow === 'boolean' ? 1024 : (opt.shadow.mapSize ?? 1024)
        dir.shadow.mapSize.set(mapSize, mapSize)
        const bounds = typeof opt.shadow === 'boolean' ? 10 : (opt.shadow.cameraBounds ?? 10)
        dir.shadow.camera.left = -bounds
        dir.shadow.camera.right = bounds
        dir.shadow.camera.top = bounds
        dir.shadow.camera.bottom = -bounds
      }
      s.add(dir)
    }

    if (opt.loop !== false) {
      r.setAnimationLoop((time: number) => {
        const delta = lastTime ? (time - lastTime) / 1000 : 0
        lastTime = time
        controls.value?.update()
        // 'manual' 模式由页面接管渲染（如 EffectComposer 后期处理）
        if (opt.loop !== 'manual') {
          renderer.value?.render(scene.value!, camera.value!)
        }
        opt.animate?.(delta, time)
      })
    }

    resizeObserver = new ResizeObserver(() => {
      const el = containerRef.value
      const cam = camera.value
      const rdr = renderer.value
      if (!el || !cam || !rdr) return
      const w = el.clientWidth
      const h = el.clientHeight
      if (w === 0 || h === 0) return
      if (cam instanceof THREE.PerspectiveCamera) {
        cam.aspect = w / h
        cam.updateProjectionMatrix()
      } else if (cam instanceof THREE.OrthographicCamera) {
        const aspect = w / h
        cam.left = (-3 * aspect) / 2
        cam.right = (3 * aspect) / 2
        cam.top = 1.5
        cam.bottom = -1.5
        cam.updateProjectionMatrix()
      }
      rdr.setSize(w, h)
      opt.onResize?.(w, h)
    })
    resizeObserver.observe(container)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    resizeObserver?.disconnect()
    resizeObserver = null
    controls.value?.dispose()
    controls.value = null
    renderer.value?.setAnimationLoop(null)
    renderer.value?.dispose()
    renderer.value?.domElement.remove()
    renderer.value = null
    scene.value = null
    camera.value = null
    opt.onDispose?.()
  }

  onMounted(init)
  onBeforeUnmount(dispose)

  return { scene, camera, renderer, controls, init, dispose }
}
