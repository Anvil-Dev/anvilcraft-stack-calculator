import type highsLoader from 'highs'
import { SCENARIOS } from '../data/scenarios'
import { CELL, type SolveOutcome, type StructureRequest, type StructureResult } from './types'
import {
  createDeviceMask,
  fromIndex,
  getBlockDimensions,
  getVolume,
  NEIGHBOR_OFFSETS,
  normalizeRequest,
  resolveNeighborPosition,
  toIndex,
} from './grid'
import { validateStructure } from './validation'

type HighsInstance = Awaited<ReturnType<typeof highsLoader>>

export interface OptimizationModel {
  request: StructureRequest
  blocks: ReturnType<typeof getBlockDimensions>
  deviceMask: Uint8Array
  variableNames: Map<number, string>
  lp: string
}

export function buildOptimizationModel(input: StructureRequest): OptimizationModel {
  const request = normalizeRequest(input)
  const blocks = getBlockDimensions(request.units)
  const volume = getVolume(blocks)
  const deviceMask = createDeviceMask(request.units, blocks)
  const variableNames = new Map<number, string>()

  for (let index = 0; index < volume; index += 1) {
    if (deviceMask[index] === 0) variableNames.set(index, `x_${index}`)
  }

  const objectiveTerms: string[] = []
  for (const name of variableNames.values()) objectiveTerms.push(name)
  const provenOptimalSeparatorCount = SCENARIOS[request.scenario].provenOptimalSeparatorCounts[request.mode]

  const constraints: string[] = []
  let constraintIndex = 0
  for (const [index, variableName] of variableNames) {
    const position = fromIndex(index, blocks)
    let fixedSafeNeighbors = 0
    const materialNeighbors: string[] = []
    for (const offset of NEIGHBOR_OFFSETS) {
      const neighbor = resolveNeighborPosition(position, offset, blocks, request.mode)
      if (!neighbor) {
        fixedSafeNeighbors += 1
        continue
      }
      const neighborName = variableNames.get(toIndex(neighbor, blocks))
      if (neighborName) materialNeighbors.push(neighborName)
      else fixedSafeNeighbors += 1
    }
    const requiredSafeNeighbors = 2 - fixedSafeNeighbors
    if (requiredSafeNeighbors <= 0) continue

    const terms = [requiredSafeNeighbors === 1 ? variableName : `2 ${variableName}`, ...materialNeighbors]
    constraints.push(` cover_${constraintIndex}: ${terms.join(' + ')} >= ${requiredSafeNeighbors}`)
    constraintIndex += 1
  }
  constraints.push(` proven_optimum: ${objectiveTerms.join(' + ')} = ${provenOptimalSeparatorCount}`)

  const binaryNames = [...variableNames.values()]
  const binaryLines: string[] = []
  for (let index = 0; index < binaryNames.length; index += 24) {
    binaryLines.push(` ${binaryNames.slice(index, index + 24).join(' ')}`)
  }

  const lp = [
    'Minimize',
    ` obj: ${objectiveTerms.join(' + ')}`,
    'Subject To',
    ...constraints,
    'Binary',
    ...binaryLines,
    'End',
  ].join('\n')

  return { request, blocks, deviceMask, variableNames, lp }
}

export function solveWithHighs(highs: HighsInstance, input: StructureRequest, timeLimitSeconds = 12): SolveOutcome {
  const startedAt = performance.now()
  try {
    const model = buildOptimizationModel(input)
    const solution = highs.solve(model.lp, {
      mip_abs_gap: 0,
      mip_rel_gap: 0,
      output_flag: false,
      presolve: 'on',
      random_seed: 0,
      time_limit: timeLimitSeconds,
    })

    if (solution.Status === 'Infeasible') {
      return { ok: false, status: 'infeasible', message: '当前尺寸没有可行布局' }
    }
    if (solution.Status !== 'Optimal' && solution.Status !== 'Time limit reached') {
      return { ok: false, status: 'failed', message: `求解器状态：${solution.Status}` }
    }

    const cells = new Uint8Array(getVolume(model.blocks))
    cells.fill(CELL.primary)
    let separatorCount = 0
    let deviceCount = 0
    for (let index = 0; index < cells.length; index += 1) {
      if (model.deviceMask[index] === 1) {
        cells[index] = CELL.device
        deviceCount += 1
        continue
      }
      const name = model.variableNames.get(index)
      const column = name ? solution.Columns[name] : undefined
      if (column && 'Primal' in column && column.Primal > 0.5) {
        cells[index] = CELL.separator
        separatorCount += 1
      }
    }

    const provenOptimalSeparatorCount = SCENARIOS[model.request.scenario].provenOptimalSeparatorCounts[model.request.mode]
    const optimal = solution.Status === 'Optimal' || separatorCount === provenOptimalSeparatorCount
    const result: StructureResult = {
      request: model.request,
      blocks: model.blocks,
      cells,
      primaryCount: cells.length - separatorCount - deviceCount,
      separatorCount,
      deviceCount,
      solver: {
        status: optimal ? 'optimal' : 'feasible',
        lowerBound: optimal ? separatorCount : provenOptimalSeparatorCount,
        upperBound: separatorCount,
        durationMs: performance.now() - startedAt,
      },
    }

    const report = validateStructure(result)
    if (!report.valid) {
      return { ok: false, status: 'failed', message: `结果复核失败：${report.errors.join('；')}` }
    }
    return { ok: true, result }
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : '未知求解错误',
    }
  }
}
