import type { ScenarioId } from '../domain/types'

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  shortName: string
  primaryName: string
  separatorName: string
  deviceName: string
  ruleId: 'six-face-enclosure-v1'
  minecraftVersion: string
  modVersion: string
  sourceRevision: string
  verifiedAt: string
}

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  'void-energy': {
    id: 'void-energy',
    name: '虚空发电',
    shortName: '虚空',
    primaryName: '虚空物质块',
    separatorName: '负物质块',
    deviceName: '虚空能收集器',
    ruleId: 'six-face-enclosure-v1',
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
    ruleId: 'six-face-enclosure-v1',
    minecraftVersion: '1.21.1',
    modVersion: '1.6-dev',
    sourceRevision: 'dev/1.21/1.6',
    verifiedAt: '2026-07-15',
  },
}
