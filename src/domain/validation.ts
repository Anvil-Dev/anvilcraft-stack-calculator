import { CELL, type Position, type StructureResult } from './types'
import { createDeviceMask, getCell, getVolume, isInside, NEIGHBOR_OFFSETS, toIndex } from './grid'

export interface ValidationReport {
  valid: boolean
  errors: string[]
  decayPositions: Position[]
}

export function validateStructure(result: StructureResult): ValidationReport {
  const errors: string[] = []
  const decayPositions: Position[] = []
  const expectedVolume = getVolume(result.blocks)
  if (result.cells.length !== expectedVolume) errors.push('布局长度与结构体积不一致')

  const deviceMask = createDeviceMask(result.request.units, result.blocks)
  let primaryCount = 0
  let separatorCount = 0
  let deviceCount = 0

  for (let index = 0; index < Math.min(result.cells.length, expectedVolume); index += 1) {
    const value = result.cells[index]
    if (deviceMask[index] === 1 && value !== CELL.device) errors.push(`设备格 ${index} 被其他方块覆盖`)
    if (deviceMask[index] === 0 && value === CELL.device) errors.push(`非设备格 ${index} 出现设备`)
    if (value === CELL.primary) primaryCount += 1
    else if (value === CELL.separator) separatorCount += 1
    else if (value === CELL.device) deviceCount += 1
    else errors.push(`格 ${index} 包含未知方块类型`)
  }

  if (primaryCount !== result.primaryCount) errors.push('主材料统计不一致')
  if (separatorCount !== result.separatorCount) errors.push('隔离材料统计不一致')
  if (deviceCount !== result.deviceCount) errors.push('设备统计不一致')
  if (primaryCount + separatorCount + deviceCount !== expectedVolume) errors.push('方块总数不守恒')

  for (let y = 0; y < result.blocks.y; y += 1) {
    for (let z = 0; z < result.blocks.z; z += 1) {
      for (let x = 0; x < result.blocks.x; x += 1) {
        const position = { x, y, z }
        if (getCell(result.cells, position, result.blocks) !== CELL.primary) continue
        const primaryNeighborCount = NEIGHBOR_OFFSETS.reduce((count, offset) => {
          const neighbor = { x: x + offset.x, y: y + offset.y, z: z + offset.z }
          return count + Number(
            isInside(neighbor, result.blocks)
            && result.cells[toIndex(neighbor, result.blocks)] === CELL.primary,
          )
        }, 0)
        if (primaryNeighborCount >= 5) decayPositions.push(position)
      }
    }
  }

  if (decayPositions.length > 0) errors.push(`发现 ${decayPositions.length} 个会衰变的主材料格`)
  return { valid: errors.length === 0, errors, decayPositions }
}
