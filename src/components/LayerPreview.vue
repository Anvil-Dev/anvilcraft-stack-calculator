<script setup lang="ts">
import { computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconCopy, IconLeft, IconRight } from '@arco-design/web-vue/es/icon'
import { CELL, type Axis, type CellCode, type Position, type ScenarioId, type StructureResult } from '../domain/types'
import { getAxisLength, toIndex } from '../domain/grid'
import { ROLE_TEXTURES } from '../data/visualAssets'
import { SCENARIOS } from '../data/scenarios'

interface Props {
  result: StructureResult | null
  scenario: ScenarioId
  axis: Axis
  layerIndex: number
}

interface LayerCell {
  code: CellCode
  position: Position
  name: string
  texture: string
  marker: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:axis': [value: Axis]
  'update:layerIndex': [value: number]
}>()

const maxLayer = computed(() => props.result ? getAxisLength(props.result.blocks, props.axis) - 1 : 0)
const layerNumber = computed(() => Math.min(Math.max(props.layerIndex, 0), maxLayer.value))

const grid = computed(() => {
  const result = props.result
  if (!result) return { columns: 0, rows: 0, cells: [] as LayerCell[] }
  let columns = 0
  let rows = 0
  const positions: Position[] = []

  if (props.axis === 'y') {
    columns = result.blocks.x
    rows = result.blocks.z
    for (let z = 0; z < result.blocks.z; z += 1) {
      for (let x = 0; x < result.blocks.x; x += 1) positions.push({ x, y: layerNumber.value, z })
    }
  } else if (props.axis === 'x') {
    columns = result.blocks.z
    rows = result.blocks.y
    for (let y = result.blocks.y - 1; y >= 0; y -= 1) {
      for (let z = 0; z < result.blocks.z; z += 1) positions.push({ x: layerNumber.value, y, z })
    }
  } else {
    columns = result.blocks.x
    rows = result.blocks.y
    for (let y = result.blocks.y - 1; y >= 0; y -= 1) {
      for (let x = 0; x < result.blocks.x; x += 1) positions.push({ x, y, z: layerNumber.value })
    }
  }

  const definition = SCENARIOS[props.scenario]
  const cells = positions.map((position): LayerCell => {
    const rawCode = result.cells[toIndex(position, result.blocks)]
    const code = rawCode === CELL.separator || rawCode === CELL.device ? rawCode : CELL.primary
    const role = code === CELL.primary ? 'primary' : code === CELL.separator ? 'separator' : 'device'
    const name = role === 'primary' ? definition.primaryName : role === 'separator' ? definition.separatorName : definition.deviceName
    return {
      code,
      position,
      name,
      texture: ROLE_TEXTURES[props.scenario][role],
      marker: role === 'separator' ? '隔' : role === 'device' ? '机' : '',
    }
  })
  return { columns, rows, cells }
})

const counts = computed(() => {
  const values = { primary: 0, separator: 0, device: 0 }
  for (const cell of grid.value.cells) {
    if (cell.code === CELL.primary) values.primary += 1
    else if (cell.code === CELL.separator) values.separator += 1
    else values.device += 1
  }
  return values
})

function setAxis(axis: string | number | boolean): void {
  if (axis !== 'x' && axis !== 'y' && axis !== 'z') return
  emit('update:axis', axis)
  emit('update:layerIndex', 0)
}

function setLayer(value: number | [number, number]): void {
  if (Array.isArray(value)) return
  emit('update:layerIndex', Math.min(Math.max(Math.round(value), 0), maxLayer.value))
}

async function copyLayerSeparators(): Promise<void> {
  const coordinates = grid.value.cells
    .filter((cell) => cell.code === CELL.separator)
    .map((cell) => `(${cell.position.x},${cell.position.y},${cell.position.z})`)
    .join('\n')
  await navigator.clipboard.writeText(coordinates || '本层无隔离材料')
  Message.success('本层坐标已复制')
}
</script>

<template>
  <section class="layer-preview" aria-labelledby="layer-heading">
    <header class="layer-header">
      <div>
        <h2 id="layer-heading">分层预览</h2>
        <span class="layer-coordinate">{{ axis.toUpperCase() }} = {{ layerNumber }}</span>
      </div>
      <div class="layer-tools">
        <a-radio-group :model-value="axis" type="button" size="small" aria-label="切片轴向" @change="setAxis">
          <a-radio value="x">X</a-radio>
          <a-radio value="y">Y</a-radio>
          <a-radio value="z">Z</a-radio>
        </a-radio-group>
        <a-tooltip content="复制本层隔离材料坐标">
          <a-button type="text" size="small" aria-label="复制本层隔离材料坐标" @click="copyLayerSeparators">
            <template #icon><IconCopy /></template>
          </a-button>
        </a-tooltip>
      </div>
    </header>

    <div class="layer-body">
      <div class="layer-stepper">
        <a-button type="text" size="small" :disabled="layerNumber <= 0" aria-label="上一层" @click="setLayer(layerNumber - 1)">
          <template #icon><IconLeft /></template>
        </a-button>
        <a-slider :model-value="layerNumber" :min="0" :max="maxLayer" :step="1" :disabled="!result" @change="setLayer" />
        <a-button type="text" size="small" :disabled="layerNumber >= maxLayer" aria-label="下一层" @click="setLayer(layerNumber + 1)">
          <template #icon><IconRight /></template>
        </a-button>
      </div>

      <div class="layer-grid-wrap">
        <div
          v-if="result"
          class="layer-grid"
          role="grid"
          :aria-label="`${axis.toUpperCase()} 轴第 ${layerNumber + 1} 层`"
          :style="{ '--grid-columns': grid.columns }"
        >
          <div
            v-for="cell in grid.cells"
            :key="`${cell.position.x}-${cell.position.y}-${cell.position.z}`"
            class="layer-cell"
            :class="{ separator: cell.code === CELL.separator, device: cell.code === CELL.device }"
            role="gridcell"
            :aria-label="`${cell.name}，坐标 ${cell.position.x}, ${cell.position.y}, ${cell.position.z}`"
            :title="`${cell.name} (${cell.position.x}, ${cell.position.y}, ${cell.position.z})`"
            :style="{ backgroundImage: `url(${cell.texture})` }"
          >
            <span v-if="cell.marker">{{ cell.marker }}</span>
          </div>
        </div>
        <div v-else class="layer-empty">等待计算结果</div>
      </div>

      <div class="layer-stats" aria-label="当前层方块统计">
        <span><i class="legend-dot primary-dot"></i>{{ SCENARIOS[scenario].primaryName }} {{ counts.primary }}</span>
        <span><i class="legend-dot separator-dot"></i>{{ SCENARIOS[scenario].separatorName }} {{ counts.separator }}</span>
        <span><i class="legend-dot device-dot"></i>{{ SCENARIOS[scenario].deviceName }} {{ counts.device }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.layer-preview { min-width: 0; background: #fff; border-top: 1px solid #d9dee5; }
.layer-header { min-height: 48px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e4e8ed; }
.layer-header > div, .layer-tools, .layer-stepper, .layer-stats { display: flex; align-items: center; }
.layer-header h2 { margin: 0; font-size: 14px; line-height: 1.2; font-weight: 650; }
.layer-coordinate { margin-left: 10px; color: #687481; font: 12px/1.2 var(--mono-font); }
.layer-tools { gap: 8px; }
.layer-body { padding: 12px 16px 16px; }
.layer-stepper { max-width: 520px; margin: 0 auto 12px; gap: 8px; }
.layer-stepper :deep(.arco-slider) { flex: 1; }
.layer-grid-wrap { min-height: 160px; padding: 12px; display: grid; place-items: center; overflow: auto; background: #1c2026; border: 1px solid #2b323b; }
.layer-grid { display: grid; grid-template-columns: repeat(var(--grid-columns), minmax(24px, 40px)); gap: 2px; width: max-content; }
.layer-cell { width: 100%; aspect-ratio: 1; display: grid; place-items: center; box-sizing: border-box; background-size: cover; image-rendering: pixelated; border: 1px solid rgba(255,255,255,.12); color: #fff; font-size: 11px; font-weight: 700; text-shadow: 0 1px 2px #000; }
.layer-cell.separator { box-shadow: inset 0 0 0 2px #f5c451; }
.layer-cell.device { box-shadow: inset 0 0 0 2px #55d6be; }
.layer-empty { color: #9da8b5; font-size: 13px; }
.layer-stats { justify-content: center; flex-wrap: wrap; gap: 14px; margin-top: 12px; color: #53606d; font-size: 12px; }
.legend-dot { width: 8px; height: 8px; margin-right: 5px; display: inline-block; border-radius: 2px; }
.primary-dot { background: #596675; }
.separator-dot { background: #e0aa2f; }
.device-dot { background: #22a888; }
@media (max-width: 600px) {
  .layer-header { align-items: flex-start; padding-block: 10px; flex-direction: column; }
  .layer-tools { width: 100%; justify-content: space-between; }
  .layer-body { padding-inline: 10px; }
  .layer-grid-wrap { justify-content: start; }
}
</style>
