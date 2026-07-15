import { CELL, type Axis, type CellCode, type Dimensions, type Position, type StackMode, type StructureRequest } from './types'

export const UNIT_SIZE = 5
export const DEVICE_OFFSET = 2

const PLANAR_REPLICATION_AXES = ['x', 'z'] as const
const VOLUMETRIC_REPLICATION_AXES = ['x', 'y', 'z'] as const
const NO_REPLICATION_AXES: readonly Axis[] = []

export const NEIGHBOR_OFFSETS: readonly Position[] = [
  { x: -1, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: 0, z: 1 },
]

export function normalizeUnits(_mode: StackMode, _units: Dimensions): Dimensions {
  return { x: 1, y: 1, z: 1 }
}

export function normalizeRequest(request: StructureRequest): StructureRequest {
  const units = normalizeUnits(request.mode, request.units)
  validateUnits(request.mode, units)
  return { ...request, units }
}

export function validateUnits(mode: StackMode, units: Dimensions): void {
  for (const axis of ['x', 'y', 'z'] as const) {
    const value = units[axis]
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${axis.toUpperCase()} 方向单元数必须是正整数`)
    }
  }

  if (units.x !== 1 || units.y !== 1 || units.z !== 1) {
    throw new Error(`${mode} 模式固定求解一个 1 x 1 x 1 可复制单元`)
  }
}

export function getReplicationAxes(mode: StackMode): readonly Axis[] {
  if (mode === 'planar') return PLANAR_REPLICATION_AXES
  if (mode === 'volumetric') return VOLUMETRIC_REPLICATION_AXES
  return NO_REPLICATION_AXES
}

export function resolveNeighborPosition(
  position: Position,
  offset: Position,
  dimensions: Dimensions,
  mode: StackMode,
): Position | null {
  const resolved = {
    x: position.x + offset.x,
    y: position.y + offset.y,
    z: position.z + offset.z,
  }
  const replicationAxes = getReplicationAxes(mode)
  for (const axis of ['x', 'y', 'z'] as const) {
    if (resolved[axis] >= 0 && resolved[axis] < dimensions[axis]) continue
    if (!replicationAxes.includes(axis)) return null
    resolved[axis] = (resolved[axis] + dimensions[axis]) % dimensions[axis]
  }
  return resolved
}

export function getBlockDimensions(units: Dimensions): Dimensions {
  return {
    x: units.x * UNIT_SIZE,
    y: units.y * UNIT_SIZE,
    z: units.z * UNIT_SIZE,
  }
}

export function getVolume(dimensions: Dimensions): number {
  return dimensions.x * dimensions.y * dimensions.z
}

export function isInside(position: Position, dimensions: Dimensions): boolean {
  return position.x >= 0 && position.y >= 0 && position.z >= 0
    && position.x < dimensions.x && position.y < dimensions.y && position.z < dimensions.z
}

export function toIndex(position: Position, dimensions: Dimensions): number {
  if (!isInside(position, dimensions)) throw new Error('坐标超出结构范围')
  return position.x + dimensions.x * (position.z + dimensions.z * position.y)
}

export function fromIndex(index: number, dimensions: Dimensions): Position {
  const volume = getVolume(dimensions)
  if (!Number.isInteger(index) || index < 0 || index >= volume) throw new Error('线性索引超出结构范围')
  const layerSize = dimensions.x * dimensions.z
  const y = Math.floor(index / layerSize)
  const remainder = index - y * layerSize
  const z = Math.floor(remainder / dimensions.x)
  return { x: remainder - z * dimensions.x, y, z }
}

export function getDevicePositions(units: Dimensions): Position[] {
  const positions: Position[] = []
  for (let y = 0; y < units.y; y += 1) {
    for (let z = 0; z < units.z; z += 1) {
      for (let x = 0; x < units.x; x += 1) {
        positions.push({
          x: x * UNIT_SIZE + DEVICE_OFFSET,
          y: y * UNIT_SIZE + DEVICE_OFFSET,
          z: z * UNIT_SIZE + DEVICE_OFFSET,
        })
      }
    }
  }
  return positions
}

export function createDeviceMask(units: Dimensions, blocks = getBlockDimensions(units)): Uint8Array {
  const mask = new Uint8Array(getVolume(blocks))
  for (const position of getDevicePositions(units)) mask[toIndex(position, blocks)] = 1
  return mask
}

export function getCell(cells: Uint8Array, position: Position, dimensions: Dimensions): CellCode | null {
  if (!isInside(position, dimensions)) return null
  const value = cells[toIndex(position, dimensions)]
  if (value === CELL.primary || value === CELL.separator || value === CELL.device) return value
  throw new Error('布局包含未知方块类型')
}

export function getAxisLength(dimensions: Dimensions, axis: Axis): number {
  return dimensions[axis]
}
