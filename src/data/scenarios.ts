import type { ScenarioId, StackMode } from '../domain/types'

export type DecayRuleId = 'five-same-face-neighbors-v1' | 'primary-minus-separator-at-most-two-v1'

export interface PrecomputedLayoutDefinition {
  status: 'optimal' | 'feasible'
  lowerBound: number
  separatorIndices: readonly number[]
}

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  shortName: string
  primaryName: string
  separatorName: string
  deviceName: string
  ruleId: DecayRuleId
  layouts: Readonly<Partial<Record<StackMode, PrecomputedLayoutDefinition>>>
  minecraftVersion: string
  modVersion: string
  sourceRevision: string
  verifiedAt: string
}

const VOID_SEPARATOR_INDICES: Readonly<Record<StackMode, readonly number[]>> = {
  single: [12, 31, 33, 41, 43, 52, 60, 64, 72, 81, 83, 91, 93, 112],
  planar: [5, 13, 19, 21, 23, 27, 29, 32, 36, 39, 42, 45, 51, 55, 58, 65, 68, 72, 73, 75, 77, 79, 81, 87, 89, 91, 99, 108, 110, 118, 121],
  volumetric: [5, 7, 10, 13, 20, 22, 23, 26, 29, 33, 36, 41, 42, 44, 52, 55, 64, 66, 70, 73, 79, 81, 83, 85, 93, 95, 97, 101, 103, 104, 109, 112, 116, 119],
}

const PLUTONIUM_SEPARATOR_INDICES: Readonly<Record<StackMode, readonly number[]>> = {
  single: [6, 9, 12, 17, 20, 23, 25, 27, 28, 33, 35, 38, 41, 44, 47, 51, 56, 59, 65, 68, 72, 78, 80, 82, 86, 89, 93, 96, 99, 101, 108, 109, 111, 115, 117, 118],
  planar: [1, 3, 5, 8, 13, 15, 16, 17, 24, 25, 32, 36, 39, 42, 47, 49, 53, 56, 59, 65, 68, 71, 75, 76, 77, 85, 88, 92, 99, 100, 107, 108, 109, 111, 116, 119, 121, 123],
  volumetric: [0, 7, 9, 11, 19, 21, 23, 27, 29, 31, 35, 38, 42, 45, 51, 55, 58, 66, 69, 73, 79, 82, 86, 89, 93, 95, 97, 101, 103, 105, 113, 115, 117, 124],
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  'void-energy': {
    id: 'void-energy',
    name: '虚空发电',
    shortName: '虚空',
    primaryName: '虚空物质块',
    separatorName: '负物质块',
    deviceName: '虚空能收集器',
    ruleId: 'five-same-face-neighbors-v1',
    layouts: {
      single: { status: 'optimal', lowerBound: 14, separatorIndices: VOID_SEPARATOR_INDICES.single },
      planar: { status: 'optimal', lowerBound: 31, separatorIndices: VOID_SEPARATOR_INDICES.planar },
      volumetric: { status: 'optimal', lowerBound: 34, separatorIndices: VOID_SEPARATOR_INDICES.volumetric },
    },
    minecraftVersion: '1.21.1',
    modVersion: '1.6-dev',
    sourceRevision: 'dev/1.21/1.6',
    verifiedAt: '2026-07-15',
  },
  'plutonium-heat': {
    id: 'plutonium-heat',
    name: '钚块集热',
    shortName: '钚块',
    primaryName: '钚块',
    separatorName: '铅块',
    deviceName: '集热器',
    ruleId: 'primary-minus-separator-at-most-two-v1',
    layouts: {
      single: { status: 'feasible', lowerBound: 33, separatorIndices: PLUTONIUM_SEPARATOR_INDICES.single },
      planar: { status: 'feasible', lowerBound: 35, separatorIndices: PLUTONIUM_SEPARATOR_INDICES.planar },
      volumetric: { status: 'feasible', lowerBound: 33, separatorIndices: PLUTONIUM_SEPARATOR_INDICES.volumetric },
    },
    minecraftVersion: '1.21.1',
    modVersion: '1.6-dev',
    sourceRevision: 'user-confirmed/2026-07-15',
    verifiedAt: '2026-07-15',
  },
}
