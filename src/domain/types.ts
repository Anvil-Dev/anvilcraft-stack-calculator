export type ScenarioId = 'void-energy' | 'plutonium-heat'
export type StackMode = 'single' | 'planar' | 'volumetric'
export type Axis = 'x' | 'y' | 'z'
export type CellType = 'primary' | 'separator' | 'device'

export const CELL = {
  primary: 0,
  separator: 1,
  device: 2,
} as const

export type CellCode = (typeof CELL)[keyof typeof CELL]

export interface Dimensions {
  x: number
  y: number
  z: number
}

export interface Position {
  x: number
  y: number
  z: number
}

export interface StructureRequest {
  scenario: ScenarioId
  mode: StackMode
  units: Dimensions
}

export interface SolverMetadata {
  status: 'optimal' | 'feasible'
  lowerBound: number
  upperBound: number
  durationMs: number
}

export interface StructureResult {
  request: StructureRequest
  blocks: Dimensions
  cells: Uint8Array
  primaryCount: number
  separatorCount: number
  deviceCount: number
  solver: SolverMetadata
}

export type SolveFailureStatus = 'infeasible' | 'failed'

export type SolveOutcome =
  | { ok: true; result: StructureResult }
  | { ok: false; status: SolveFailureStatus; message: string }
