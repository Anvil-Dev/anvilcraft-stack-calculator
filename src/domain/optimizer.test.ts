import highsLoader from 'highs'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildOptimizationModel, solveWithHighs } from './optimizer'

type HighsInstance = Awaited<ReturnType<typeof highsLoader>>
let highs: HighsInstance

beforeAll(async () => {
  highs = await highsLoader()
})

describe('HiGHS structure optimizer', () => {
  it('builds constraints across a continuous multi-unit grid', () => {
    const model = buildOptimizationModel({
      scenario: 'void-energy',
      mode: 'planar',
      units: { x: 2, y: 1, z: 1 },
    })
    expect(model.blocks).toEqual({ x: 10, y: 5, z: 5 })
    expect(model.lp).toContain('cover_')
    expect(model.variableNames.size).toBe(248)
  })

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
