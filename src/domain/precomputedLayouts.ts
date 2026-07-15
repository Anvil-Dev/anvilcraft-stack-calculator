import { SCENARIOS } from '../data/scenarios'
import { CELL, type SolveOutcome, type StructureRequest, type StructureResult } from './types'
import { createDeviceMask, getBlockDimensions, getVolume, normalizeRequest } from './grid'
import { validateStructure } from './validation'

export function createPrecomputedLayout(input: StructureRequest): SolveOutcome | null {
  const startedAt = performance.now()
  const request = normalizeRequest(input)
  const layout = SCENARIOS[request.scenario].layouts[request.mode]
  if (!layout) return null
  const separatorCount = layout.separatorIndices.length
  if (layout.lowerBound > separatorCount) {
    return { ok: false, status: 'failed', message: '预计算布局下界高于隔离材料数量' }
  }
  if (layout.status === 'optimal' && layout.lowerBound !== separatorCount) {
    return { ok: false, status: 'failed', message: '最优布局的上下界不一致' }
  }

  const blocks = getBlockDimensions(request.units)
  const cells = new Uint8Array(getVolume(blocks))
  cells.fill(CELL.primary)
  for (const index of layout.separatorIndices) cells[index] = CELL.separator

  const deviceMask = createDeviceMask(request.units, blocks)
  let deviceCount = 0
  for (let index = 0; index < deviceMask.length; index += 1) {
    if (deviceMask[index] !== 1) continue
    cells[index] = CELL.device
    deviceCount += 1
  }

  const result: StructureResult = {
    request,
    blocks,
    cells,
    primaryCount: cells.length - separatorCount - deviceCount,
    separatorCount,
    deviceCount,
    solver: {
      status: layout.status,
      lowerBound: layout.lowerBound,
      upperBound: separatorCount,
      durationMs: performance.now() - startedAt,
    },
  }
  const report = validateStructure(result)
  if (!report.valid) {
    return { ok: false, status: 'failed', message: `预计算布局复核失败：${report.errors.join('；')}` }
  }
  return { ok: true, result }
}
