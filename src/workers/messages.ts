import type { SolveOutcome, StructureRequest } from '../domain/types'

export interface SolverRequestMessage {
  requestId: number
  request: StructureRequest
}

export interface SolverResponseMessage {
  requestId: number
  outcome: SolveOutcome
}
