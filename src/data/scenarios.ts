import type { ScenarioId, StackMode } from '../domain/types'

// AnvilCraftServerConfig.WorldSettings.voidMatterDecayThreshold (server default).
export const VOID_MATTER_DECAY_THRESHOLD = 5

export type DecayRuleId = 'five-same-face-neighbors-v1' | 'ice-or-water-face-neighbor-v1'

export interface PrecomputedLayoutDefinition {
  status: 'optimal' | 'feasible'
  lowerBound: number
  separatorIndices: readonly number[]
}

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  shortName: string
  ruleDescription: string
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

// Offline CP-SAT minimized the number of packed ice blocks with no objective cutoff.
const PLUTONIUM_SEPARATOR_INDICES: Readonly<Record<StackMode, readonly number[]>> = {
  single: [5, 8, 16, 19, 22, 26, 27, 29, 37, 44, 45, 58, 60, 61, 73, 75, 77, 89, 92, 96, 104, 106, 113, 115, 117, 124],
  planar: [1, 9, 12, 15, 23, 29, 32, 39, 41, 55, 68, 70, 72, 76, 78, 83, 86, 90, 101, 106, 114, 117, 124],
  volumetric: [5, 7, 15, 23, 29, 36, 38, 46, 52, 55, 67, 69, 83, 86, 95, 98, 101, 104, 114, 117],
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  'void-energy': {
    id: 'void-energy',
    name: '虚空发电',
    shortName: '虚空',
    ruleDescription: `按服务器默认配置，虚空物质块有 ${VOID_MATTER_DECAY_THRESHOLD} 个或更多面紧邻虚空物质块时会衰变。`,
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
    modVersion: '1.6.0-dev',
    sourceRevision: '6a4cde43b4ece65b765137a7aab145b9b4c002bf',
    verifiedAt: '2026-11-22',
  },
  'plutonium-heat': {
    id: 'plutonium-heat',
    name: '钚块集热',
    shortName: '钚块',
    ruleDescription: '每个钚块至少有一面须接触冰、水或含水方块，否则会融毁为岩浆块。布局用浮冰冷却。',
    primaryName: '钚块',
    separatorName: '浮冰',
    deviceName: '集热器',
    ruleId: 'ice-or-water-face-neighbor-v1',
    layouts: {
      single: { status: 'optimal', lowerBound: 26, separatorIndices: PLUTONIUM_SEPARATOR_INDICES.single },
      planar: { status: 'optimal', lowerBound: 23, separatorIndices: PLUTONIUM_SEPARATOR_INDICES.planar },
      volumetric: { status: 'optimal', lowerBound: 20, separatorIndices: PLUTONIUM_SEPARATOR_INDICES.volumetric },
    },
    minecraftVersion: '1.21.1',
    modVersion: '1.6.0-dev',
    sourceRevision: '6a4cde43b4ece65b765137a7aab145b9b4c002bf',
    verifiedAt: '2026-11-22',
  },
}
