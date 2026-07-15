<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AmbientLight,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  FrontSide,
  GridHelper,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CELL, type Axis, type CellCode, type ScenarioId, type StructureResult } from '../domain/types'
import { fromIndex } from '../domain/grid'
import { CUTOUT_TEXTURES, SCENARIO_MODELS, TEXTURE_URLS } from '../data/visualAssets'
import { parseMinecraftModel, type ParsedModelPart } from '../rendering/minecraftModel'

interface Props {
  result: StructureResult | null
  scenario: ScenarioId
  showPrimary: boolean
  showSeparator: boolean
  showDevice: boolean
  fadePrimary: boolean
  sliceEnabled: boolean
  sliceAxis: Axis
  sliceIndex: number
}

interface RenderPart {
  geometry: ParsedModelPart['geometry']
  material: Material
}

interface ScenarioTemplates {
  primary: RenderPart[]
  separator: RenderPart[]
  deviceBase: RenderPart[]
  deviceHead: RenderPart[]
}

const props = defineProps<Props>()
const host = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const error = ref('')

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let frameId = 0
let layoutGroup: Group | null = null
let templates: ScenarioTemplates | null = null
let loadVersion = 0
let startedAt = performance.now()
const textureCache = new Map<string, Texture>()
const animatedHeadMeshes: InstancedMesh[] = []
let animatedHeadPositions: Vector3[] = []

onMounted(async () => {
  initializeScene()
  await loadScenario(props.scenario)

  watch(() => props.scenario, async (scenarioId) => {
    await loadScenario(scenarioId)
  })
  watch(
    () => [props.result, props.showPrimary, props.showSeparator, props.showDevice, props.fadePrimary, props.sliceEnabled, props.sliceAxis, props.sliceIndex],
    () => rebuildLayout(),
  )
})

onBeforeUnmount(() => {
  loadVersion += 1
  cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  controls?.dispose()
  clearLayout()
  disposeTemplates()
  for (const texture of textureCache.values()) texture.dispose()
  textureCache.clear()
  renderer?.dispose()
  renderer?.domElement.remove()
})

function initializeScene(): void {
  if (!host.value) return
  scene = new Scene()
  scene.background = new Color('#171a1f')
  camera = new PerspectiveCamera(38, 1, 0.05, 1000)
  renderer = new WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.domElement.className = 'preview-canvas'
  renderer.domElement.setAttribute('aria-label', '三维结构预览')
  renderer.domElement.tabIndex = 0
  host.value.prepend(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.zoomToCursor = true
  controls.listenToKeyEvents(renderer.domElement)

  scene.add(new AmbientLight('#c7d0dc', 1.15))
  const keyLight = new DirectionalLight('#fff4dd', 2.2)
  keyLight.position.set(8, 14, 10)
  scene.add(keyLight)
  const fillLight = new DirectionalLight('#8fc8ff', 1.1)
  fillLight.position.set(-10, 5, -8)
  scene.add(fillLight)

  layoutGroup = new Group()
  scene.add(layoutGroup)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host.value)
  resize()
  animate()
}

async function loadScenario(scenarioId: ScenarioId): Promise<void> {
  const currentVersion = ++loadVersion
  loading.value = true
  error.value = ''
  clearLayout()
  disposeTemplates()
  try {
    const assets = SCENARIO_MODELS[scenarioId]
    const [primary, separator, deviceBase, deviceHead] = await Promise.all([
      createRenderParts(assets.primary, 'block'),
      createRenderParts(assets.separator, 'block'),
      createRenderParts(assets.deviceBase, 'block'),
      createRenderParts(assets.deviceHead, 'centered'),
    ])
    if (currentVersion !== loadVersion) {
      disposeParts([...primary, ...separator, ...deviceBase, ...deviceHead])
      return
    }
    templates = { primary, separator, deviceBase, deviceHead }
    loading.value = false
    await nextTick()
    rebuildLayout()
  } catch (cause) {
    if (currentVersion !== loadVersion) return
    loading.value = false
    error.value = cause instanceof Error ? cause.message : '模型资源加载失败'
  }
}

async function createRenderParts(model: unknown, originMode: 'block' | 'centered'): Promise<RenderPart[]> {
  const parsedParts = parseMinecraftModel(model, { originMode })
  return Promise.all(parsedParts.map(async (part) => {
    const texture = await loadTexture(part.texture)
    const cutout = part.cutout || CUTOUT_TEXTURES.has(part.texture)
    const common = {
      map: texture,
      alphaTest: cutout ? 0.08 : 0,
      side: FrontSide,
    }
    const material = part.shaded
      ? new MeshStandardMaterial({
          ...common,
          roughness: 0.76,
          metalness: part.emissive ? 0.08 : 0.16,
          emissive: part.emissive ? new Color('#ffffff') : new Color('#000000'),
          emissiveMap: part.emissive ? texture : null,
          emissiveIntensity: part.emissive ? 1.25 : 0,
        })
      : new MeshBasicMaterial(common)
    material.userData.baseTransparent = false
    return { geometry: part.geometry, material }
  }))
}

async function loadTexture(reference: string): Promise<Texture> {
  const cached = textureCache.get(reference)
  if (cached) return cached
  const url = TEXTURE_URLS[reference]
  if (!url) throw new Error(`找不到纹理资源：${reference}`)
  const texture = await new TextureLoader().loadAsync(url)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.flipY = false
  textureCache.set(reference, texture)
  return texture
}

function rebuildLayout(): void {
  if (!layoutGroup || !templates) return
  clearLayout()
  const result = props.result
  if (!result) return

  setPrimaryOpacity(props.fadePrimary)
  const positions = new Map<CellCode, Vector3[]>([
    [CELL.primary, []],
    [CELL.separator, []],
    [CELL.device, []],
  ])
  const centerOffset = new Vector3(result.blocks.x / 2, result.blocks.y / 2, result.blocks.z / 2)

  for (let index = 0; index < result.cells.length; index += 1) {
    const type = result.cells[index]
    if (type !== CELL.primary && type !== CELL.separator && type !== CELL.device) continue
    if (type === CELL.primary && !props.showPrimary) continue
    if (type === CELL.separator && !props.showSeparator) continue
    if (type === CELL.device && !props.showDevice) continue
    const position = fromIndex(index, result.blocks)
    if (props.sliceEnabled && position[props.sliceAxis] !== props.sliceIndex) continue
    positions.get(type)?.push(new Vector3(
      position.x + 0.5 - centerOffset.x,
      position.y + 0.5 - centerOffset.y,
      position.z + 0.5 - centerOffset.z,
    ))
  }

  addInstancedParts(templates.primary, positions.get(CELL.primary) ?? [])
  addInstancedParts(templates.separator, positions.get(CELL.separator) ?? [])
  const devicePositions = positions.get(CELL.device) ?? []
  addInstancedParts(templates.deviceBase, devicePositions)
  animatedHeadPositions = devicePositions
  addInstancedParts(templates.deviceHead, devicePositions, true)

  const gridSize = Math.max(result.blocks.x, result.blocks.z) + 4
  const grid = new GridHelper(gridSize, gridSize, '#45505d', '#2b323b')
  grid.position.y = -result.blocks.y / 2 - 0.52
  grid.userData.disposable = true
  layoutGroup.add(grid)
  fitCamera()
}

function addInstancedParts(parts: RenderPart[], positions: Vector3[], animated = false): void {
  if (!layoutGroup || positions.length === 0) return
  const matrix = new Matrix4()
  for (const part of parts) {
    const mesh = new InstancedMesh(part.geometry, part.material, positions.length)
    mesh.frustumCulled = false
    for (let index = 0; index < positions.length; index += 1) {
      matrix.makeTranslation(positions[index]?.x ?? 0, positions[index]?.y ?? 0, positions[index]?.z ?? 0)
      mesh.setMatrixAt(index, matrix)
    }
    if (animated) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage)
      animatedHeadMeshes.push(mesh)
    }
    mesh.instanceMatrix.needsUpdate = true
    layoutGroup.add(mesh)
  }
}

function setPrimaryOpacity(faded: boolean): void {
  if (!templates) return
  for (const part of templates.primary) {
    part.material.opacity = faded ? 0.24 : 1
    part.material.transparent = faded || Boolean(part.material.userData.baseTransparent)
    part.material.depthWrite = !faded
    part.material.needsUpdate = true
  }
}

function clearLayout(): void {
  animatedHeadMeshes.length = 0
  animatedHeadPositions = []
  if (!layoutGroup) return
  for (const child of [...layoutGroup.children]) {
    layoutGroup.remove(child)
    if (child.userData.disposable) {
      const disposable = child as GridHelper
      disposable.geometry.dispose()
      disposeMaterial(disposable.material)
    }
  }
}

function disposeTemplates(): void {
  if (!templates) return
  disposeParts([
    ...templates.primary,
    ...templates.separator,
    ...templates.deviceBase,
    ...templates.deviceHead,
  ])
  templates = null
}

function disposeParts(parts: RenderPart[]): void {
  for (const part of parts) {
    part.geometry.dispose()
    part.material.dispose()
  }
}

function disposeMaterial(material: Material | Material[]): void {
  if (Array.isArray(material)) material.forEach((item) => item.dispose())
  else material.dispose()
}

function resize(): void {
  if (!host.value || !renderer || !camera) return
  const width = Math.max(host.value.clientWidth, 1)
  const height = Math.max(host.value.clientHeight, 1)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function fitCamera(): void {
  if (!camera || !controls || !props.result) return
  const { x, y, z } = props.result.blocks
  const radius = Math.sqrt(x * x + y * y + z * z) / 2
  const distance = Math.max(8, radius / Math.sin(camera.fov * Math.PI / 360) * 1.08)
  camera.position.set(distance * 0.72, distance * 0.58, distance * 0.86)
  controls.target.set(0, 0, 0)
  controls.minDistance = Math.max(2, radius * 0.35)
  controls.maxDistance = distance * 4
  controls.update()
}

function animate(timestamp = performance.now()): void {
  frameId = requestAnimationFrame(animate)
  const elapsed = (timestamp - startedAt) / 1000
  const matrix = new Matrix4()
  const quaternion = new Quaternion()
  const scale = new Vector3(1, 1, 1)
  for (const mesh of animatedHeadMeshes) {
    for (let index = 0; index < animatedHeadPositions.length; index += 1) {
      const base = animatedHeadPositions[index]
      if (!base) continue
      const position = base.clone()
      position.y += 0.17 + Math.sin(elapsed * 1.6 + index * 0.4) * 0.035
      quaternion.setFromAxisAngle(new Vector3(0, 1, 0), elapsed * 0.32 + index * 0.18)
      matrix.compose(position, quaternion, scale)
      mesh.setMatrixAt(index, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
  controls?.update()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

defineExpose({ resetView: fitCamera })
</script>

<template>
  <div ref="host" class="structure-preview">
    <div v-if="loading" class="scene-state" role="status">正在加载模型</div>
    <div v-else-if="error" class="scene-state scene-error" role="alert">{{ error }}</div>
    <div v-else-if="!result" class="scene-state" role="status">等待计算结果</div>
  </div>
</template>

<style scoped>
.structure-preview {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  overflow: hidden;
  background: #171a1f;
}

.structure-preview :deep(.preview-canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}

.structure-preview :deep(.preview-canvas:focus-visible) {
  box-shadow: inset 0 0 0 2px #35a875;
}

.scene-state {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: grid;
  place-items: center;
  color: #aeb8c5;
  font-size: 14px;
  pointer-events: none;
}

.scene-error {
  color: #ffb4ac;
}

@media (max-width: 767px) {
  .structure-preview {
    min-height: 360px;
  }
}
</style>
