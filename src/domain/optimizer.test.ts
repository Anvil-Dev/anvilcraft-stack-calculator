import highsLoader from 'highs'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildOptimizationModel, solveWithHighs } from './optimizer'

type HighsInstance = Awaited<ReturnType<typeof highsLoader>>
let highs: HighsInstance

beforeAll(async () => {
  highs = await highsLoader()
})

describe('HiGHS structure optimizer', () => {
  it('builds a single periodic unit for planar mode', () => {
    const model = buildOptimizationModel({
      scenario: 'void-energy',
      mode: 'planar',
      units: { x: 2, y: 1, z: 1 },
    })
    expect(model.blocks).toEqual({ x: 5, y: 5, z: 5 })
    expect(model.lp).toContain('cover_')
    expect(model.lp).toContain('proven_optimum:')
    expect(model.lp).toMatch(/proven_optimum: .* = 31/)
    expect(model.variableNames.size).toBe(124)
  })

  it('builds the plutonium-minus-lead constraint without counting the collector', () => {
    const model = buildOptimizationModel({
      scenario: 'plutonium-heat',
      mode: 'single',
      units: { x: 1, y: 1, z: 1 },
    })
    expect(model.lp).toContain('known_upper_bound:')
    expect(model.lp).toMatch(/known_upper_bound: .* <= 36/)
    expect(model.lp).toContain('2 x_57 + x_56 + x_58 + x_32 + x_82 + x_52 >= 2')
    expect(model.lp).not.toContain('x_62')
  })

  it('proves periodic unit optima for planar and volumetric modes', () => {
    for (const [mode, separatorCount] of [['planar', 31], ['volumetric', 34]] as const) {
      const outcome = solveWithHighs(highs, {
        scenario: 'void-energy',
        mode,
        units: { x: 9, y: 9, z: 9 },
      })
      expect(outcome.ok).toBe(true)
      if (!outcome.ok) continue
      expect(outcome.result.blocks).toEqual({ x: 5, y: 5, z: 5 })
      expect(outcome.result.deviceCount).toBe(1)
      expect(outcome.result.separatorCount).toBe(separatorCount)
      expect(outcome.result.primaryCount).toBe(124 - separatorCount)
      expect(outcome.result.solver.status).toBe('optimal')
      expect(outcome.result.solver.lowerBound).toBe(separatorCount)
      expect(outcome.result.solver.upperBound).toBe(separatorCount)
    }
  }, 30_000)

  it('proves the 1 x 1 x 1 optimum is fourteen separators', () => {
    const outcome = solveWithHighs(highs, {
      scenario: 'void-energy',
      mode: 'single',
      units: { x: 9, y: 9, z: 9 },
    })
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.solver.status).toBe('optimal')
    expect(outcome.result.separatorCount).toBe(14)
    expect(outcome.result.primaryCount).toBe(110)
    expect(outcome.result.deviceCount).toBe(1)
  })

  it('returns deterministic coordinates for identical requests', () => {
    const request = {
      scenario: 'void-energy',
      mode: 'single',
      units: { x: 1, y: 1, z: 1 },
    } as const
    const first = solveWithHighs(highs, request)
    const second = solveWithHighs(highs, request)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect([...first.result.cells]).toEqual([...second.result.cells])
  })
})
