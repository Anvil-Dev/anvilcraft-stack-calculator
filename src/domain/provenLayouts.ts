import { SCENARIOS } from '../data/scenarios'
import { CELL, type SolveOutcome, type StructureRequest, type StructureResult } from './types'
import { createDeviceMask, getBlockDimensions, getVolume, normalizeRequest } from './grid'
import { validateStructure } from './validation'

export function createProvenLayout(input: StructureRequest): SolveOutcome | null {
  const startedAt = performance.now()
  const request = normalizeRequest(input)
  const scenario = SCENARIOS[request.scenario]
  const separatorIndices = scenario.provenSeparatorIndices[request.mode]
  if (!separatorIndices) return null
  const provenOptimalSeparatorCount = scenario.provenOptimalSeparatorCounts[request.mode]
  if (separatorIndices.length !== provenOptimalSeparatorCount) {
    return { ok: false, status: 'failed', message: '黄金布局坐标数量与已证明最优数量不一致' }
  }

  const blocks = getBlockDimensions(request.units)
  const cells = new Uint8Array(getVolume(blocks))
  cells.fill(CELL.primary)
  for (const index of separatorIndices) cells[index] = CELL.separator

  const deviceMask = createDeviceMask(request.units, blocks)
  let deviceCount = 0
  for (let index = 0; index < deviceMask.length; index += 1) {
    if (deviceMask[index] !== 1) continue
    cells[index] = CELL.device
    deviceCount += 1
  }

  const separatorCount = separatorIndices.length
  const result: StructureResult = {
    request,
    blocks,
    cells,
    primaryCount: cells.length - separatorCount - deviceCount,
    separatorCount,
    deviceCount,
    solver: {
      status: 'optimal',
      lowerBound: separatorCount,
      upperBound: separatorCount,
      durationMs: performance.now() - startedAt,
    },
  }
  const report = validateStructure(result)
  if (!report.valid) {
    return { ok: false, status: 'failed', message: `黄金布局复核失败：${report.errors.join('；')}` }
  }
  return { ok: true, result }
}
