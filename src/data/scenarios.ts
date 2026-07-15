import type { ScenarioId, StackMode } from '../domain/types'

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  shortName: string
  primaryName: string
  separatorName: string
  deviceName: string
  ruleId: 'five-same-face-neighbors-v1'
  provenOptimalSeparatorCounts: Readonly<Record<StackMode, number>>
  provenSeparatorIndices: Readonly<Partial<Record<StackMode, readonly number[]>>>
  minecraftVersion: string
  modVersion: string
  sourceRevision: string
  verifiedAt: string
}

const PROVEN_SEPARATOR_INDICES: Readonly<Record<StackMode, readonly number[]>> = {
  single: [12, 31, 33, 41, 43, 52, 60, 64, 72, 81, 83, 91, 93, 112],
  planar: [5, 13, 19, 21, 23, 27, 29, 32, 36, 39, 42, 45, 51, 55, 58, 65, 68, 72, 73, 75, 77, 79, 81, 87, 89, 91, 99, 108, 110, 118, 121],
  volumetric: [5, 7, 10, 13, 20, 22, 23, 26, 29, 33, 36, 41, 42, 44, 52, 55, 64, 66, 70, 73, 79, 81, 83, 85, 93, 95, 97, 101, 103, 104, 109, 112, 116, 119],
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
    provenOptimalSeparatorCounts: { single: 14, planar: 31, volumetric: 34 },
    provenSeparatorIndices: PROVEN_SEPARATOR_INDICES,
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
    ruleId: 'five-same-face-neighbors-v1',
    provenOptimalSeparatorCounts: { single: 14, planar: 31, volumetric: 34 },
    provenSeparatorIndices: PROVEN_SEPARATOR_INDICES,
    minecraftVersion: '1.21.1',
    modVersion: '1.6-dev',
    sourceRevision: 'dev/1.21/1.6',
    verifiedAt: '2026-07-15',
  },
}
