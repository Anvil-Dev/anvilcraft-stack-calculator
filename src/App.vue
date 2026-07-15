<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconCopy, IconEye, IconEyeInvisible, IconFullscreen, IconLayers, IconRefresh, IconScan } from '@arco-design/web-vue/es/icon'
import StructurePreview from './components/StructurePreview.vue'
import LayerPreview from './components/LayerPreview.vue'
import { SCENARIOS } from './data/scenarios'
import { ROLE_TEXTURES } from './data/visualAssets'
import { CELL, type Axis, type ScenarioId, type StackMode, type StructureRequest, type StructureResult } from './domain/types'
import { getReplicationAxes, normalizeRequest } from './domain/grid'
import { useStructureSolver } from './composables/useStructureSolver'

const scenario = ref<ScenarioId>('void-energy')
const mode = ref<StackMode>('single')
const result = shallowRef<StructureResult | null>(null)
const preview = ref<InstanceType<typeof StructurePreview> | null>(null)
const previewShell = ref<HTMLElement | null>(null)
const layerAxis = ref<Axis>('y')
const layerIndex = ref(2)
const showPrimary = ref(true)
const showSeparator = ref(true)
const showDevice = ref(true)
const fadePrimary = ref(true)
const sliceEnabled = ref(false)
const { solve, solving, error: solverError } = useStructureSolver()
const brandIconUrl = `${import.meta.env.BASE_URL}icon.png`

const scenarioDefinition = computed(() => SCENARIOS[scenario.value])
const replicationAxisLabel = computed(() => {
  const axes = getReplicationAxes(mode.value)
  return axes.length > 0 ? axes.map((axis) => axis.toUpperCase()).join(' / ') : '不复制'
})
const totalMaterial = computed(() => result.value ? result.value.primaryCount + result.value.separatorCount : 0)
const separatorRatio = computed(() => totalMaterial.value > 0 && result.value
  ? result.value.separatorCount / totalMaterial.value * 100
  : 0)
const statusText = computed(() => {
  if (solving.value) return '正在求解'
  if (solverError.value) return '求解失败'
  if (!result.value) return '等待计算'
  return result.value.solver.status === 'optimal' ? '已证明最优' : '可行方案'
})
onMounted(() => runCalculation())

watch(mode, () => {
  void nextTick(runCalculation)
})
watch(scenario, () => void runCalculation())
watch([result, layerAxis], () => {
  const current = result.value
  if (!current) return
  layerIndex.value = Math.min(Math.max(layerIndex.value, 0), current.blocks[layerAxis.value] - 1)
})

function createRequest(): StructureRequest {
  return normalizeRequest({ scenario: scenario.value, mode: mode.value, units: { x: 1, y: 1, z: 1 } })
}

async function runCalculation(): Promise<void> {
  const outcome = await solve(createRequest())
  if (!outcome.ok) return
  result.value = outcome.result
  layerIndex.value = Math.min(2, outcome.result.blocks[layerAxis.value] - 1)
}

function resetAll(): void {
  scenario.value = 'void-energy'
  mode.value = 'single'
  showPrimary.value = true
  showSeparator.value = true
  showDevice.value = true
  fadePrimary.value = true
  sliceEnabled.value = false
  layerAxis.value = 'y'
  layerIndex.value = 2
  void nextTick(runCalculation)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value)
}

async function copyText(text: string, success: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    Message.success(success)
  } catch {
    Message.error('复制失败')
  }
}

function copyMaterialList(): void {
  if (!result.value) return
  const lines = [
    `${scenarioDefinition.value.name} 可复制单元 ${result.value.blocks.x}x${result.value.blocks.y}x${result.value.blocks.z}`,
    `复制方向: ${replicationAxisLabel.value}`,
    `${scenarioDefinition.value.primaryName}: ${result.value.primaryCount}`,
    `${scenarioDefinition.value.separatorName}: ${result.value.separatorCount}`,
    `${scenarioDefinition.value.deviceName}: ${result.value.deviceCount}`,
  ]
  void copyText(lines.join('\n'), '材料清单已复制')
}

function copyAllSeparatorCoordinates(): void {
  if (!result.value) return
  const coordinates: string[] = []
  const { blocks, cells } = result.value
  for (let y = 0; y < blocks.y; y += 1) {
    for (let z = 0; z < blocks.z; z += 1) {
      for (let x = 0; x < blocks.x; x += 1) {
        const index = x + blocks.x * (z + blocks.z * y)
        if (cells[index] === CELL.separator) coordinates.push(`(${x},${y},${z})`)
      }
    }
  }
  void copyText(coordinates.join('\n'), '隔离材料坐标已复制')
}

async function toggleFullscreen(): Promise<void> {
  if (!previewShell.value) return
  if (document.fullscreenElement) await document.exitFullscreen()
  else await previewShell.value.requestFullscreen()
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-block">
        <span class="brand-mark" aria-hidden="true"></span>
        <img class="brand-icon" :src="brandIconUrl" alt="" aria-hidden="true" />
        <div>
          <h1>铁砧工艺 · 最密堆积</h1>
          <span>AnvilCraft Stack Calculator</span>
        </div>
      </div>
      <div class="topbar-status" aria-live="polite">
        <span class="version-label">{{ scenarioDefinition.minecraftVersion }} / {{ scenarioDefinition.modVersion }}</span>
        <a-tag :color="solverError ? 'red' : solving ? 'arcoblue' : 'green'" size="small">{{ statusText }}</a-tag>
      </div>
    </header>

    <main class="workspace">
      <aside class="control-panel" aria-label="计算参数">
        <section class="control-section">
          <div class="section-heading">
            <h2>结构参数</h2>
            <a-tooltip content="恢复默认">
              <a-button type="text" size="small" aria-label="恢复默认" @click="resetAll"><template #icon><IconRefresh /></template></a-button>
            </a-tooltip>
          </div>

          <label class="field-label">场景</label>
          <a-radio-group v-model="scenario" type="button" class="full-segmented">
            <a-radio value="void-energy">虚空发电</a-radio>
            <a-radio value="plutonium-heat">钚块集热</a-radio>
          </a-radio-group>

          <label class="field-label">堆积模式</label>
          <a-radio-group v-model="mode" type="button" class="full-segmented mode-segmented">
            <a-radio value="single">不堆积</a-radio>
            <a-radio value="planar">平面</a-radio>
            <a-radio value="volumetric">立体</a-radio>
          </a-radio-group>

          <div class="unit-definition">
            <div><span>{{ mode === 'single' ? '独立单元' : '可复制单元' }}</span><strong>5 × 5 × 5</strong></div>
            <div><span>复制方向</span><strong>{{ replicationAxisLabel }}</strong></div>
          </div>

          <a-button type="primary" size="large" long :loading="solving" @click="runCalculation">计算布局</a-button>
        </section>

        <section class="control-section material-section">
          <div class="section-heading"><h2>单元材料统计</h2></div>
          <div class="material-line">
            <img :src="ROLE_TEXTURES[scenario].primary" alt="" />
            <div><span>{{ scenarioDefinition.primaryName }}</span><strong>{{ formatNumber(result?.primaryCount ?? 0) }}</strong></div>
          </div>
          <div class="material-line separator-line">
            <img :src="ROLE_TEXTURES[scenario].separator" alt="" />
            <div><span>{{ scenarioDefinition.separatorName }}</span><strong>{{ formatNumber(result?.separatorCount ?? 0) }}</strong></div>
          </div>
          <div class="material-line">
            <img :src="ROLE_TEXTURES[scenario].device" alt="" />
            <div><span>{{ scenarioDefinition.deviceName }}</span><strong>{{ formatNumber(result?.deviceCount ?? 0) }}</strong></div>
          </div>
          <div class="copy-actions">
            <a-button size="small" :disabled="!result" @click="copyMaterialList"><template #icon><IconCopy /></template>材料清单</a-button>
            <a-button size="small" :disabled="!result" @click="copyAllSeparatorCoordinates"><template #icon><IconCopy /></template>坐标</a-button>
          </div>
        </section>

        <section class="control-section view-section">
          <div class="section-heading"><h2>显示</h2></div>
          <label class="switch-line"><span>{{ scenarioDefinition.primaryName }}</span><a-switch v-model="showPrimary" size="small" /></label>
          <label class="switch-line"><span>{{ scenarioDefinition.separatorName }}</span><a-switch v-model="showSeparator" size="small" /></label>
          <label class="switch-line"><span>{{ scenarioDefinition.deviceName }}</span><a-switch v-model="showDevice" size="small" /></label>
          <label class="switch-line"><span>主材料淡化</span><a-switch v-model="fadePrimary" size="small" /></label>
          <label class="switch-line"><span>同步切片</span><a-switch v-model="sliceEnabled" size="small" /></label>
        </section>
      </aside>

      <section class="result-area" aria-label="计算结果">
        <div class="metrics-strip">
          <div><span>单元尺寸</span><strong>{{ result ? `${result.blocks.x} × ${result.blocks.y} × ${result.blocks.z}` : '—' }}</strong></div>
          <div><span>复制方向</span><strong>{{ replicationAxisLabel }}</strong></div>
          <div><span>隔离材料占比</span><strong>{{ result ? `${separatorRatio.toFixed(2)}%` : '—' }}</strong></div>
          <div><span>求解耗时</span><strong>{{ result ? `${Math.round(result.solver.durationMs)} ms` : '—' }}</strong></div>
        </div>

        <div ref="previewShell" class="preview-shell">
          <StructurePreview ref="preview" :result="result" :scenario="scenario" :show-primary="showPrimary" :show-separator="showSeparator" :show-device="showDevice" :fade-primary="fadePrimary" :slice-enabled="sliceEnabled" :slice-axis="layerAxis" :slice-index="layerIndex" />
          <div class="preview-toolbar" aria-label="三维视图工具">
            <a-tooltip content="重置视角"><a-button shape="circle" aria-label="重置视角" @click="preview?.resetView()"><IconScan /></a-button></a-tooltip>
            <a-tooltip :content="showPrimary ? '隐藏主材料' : '显示主材料'">
              <a-button shape="circle" :aria-label="showPrimary ? '隐藏主材料' : '显示主材料'" @click="showPrimary = !showPrimary"><IconEye v-if="showPrimary" /><IconEyeInvisible v-else /></a-button>
            </a-tooltip>
            <a-tooltip :content="sliceEnabled ? '退出切片' : '同步当前层'"><a-button shape="circle" :status="sliceEnabled ? 'success' : 'normal'" :aria-label="sliceEnabled ? '退出切片' : '同步当前层'" @click="sliceEnabled = !sliceEnabled"><IconLayers /></a-button></a-tooltip>
            <a-tooltip content="全屏"><a-button shape="circle" aria-label="全屏" @click="toggleFullscreen"><IconFullscreen /></a-button></a-tooltip>
          </div>
          <div class="scene-legend" aria-label="方块图例">
            <span><img :src="ROLE_TEXTURES[scenario].primary" alt="" />{{ scenarioDefinition.primaryName }}</span>
            <span><img :src="ROLE_TEXTURES[scenario].separator" alt="" />{{ scenarioDefinition.separatorName }}</span>
            <span><img :src="ROLE_TEXTURES[scenario].device" alt="" />{{ scenarioDefinition.deviceName }}</span>
          </div>
          <div v-if="solving" class="solving-mask" role="status"><IconRefresh spin />正在求解最优布局</div>
        </div>

        <LayerPreview :result="result" :scenario="scenario" :axis="layerAxis" :layer-index="layerIndex" @update:axis="layerAxis = $event" @update:layer-index="layerIndex = $event" />
      </section>
    </main>
  </div>
</template>
