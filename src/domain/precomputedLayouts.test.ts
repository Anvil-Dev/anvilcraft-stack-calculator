import { describe, expect, it } from 'vitest'
import { createPrecomputedLayout } from './precomputedLayouts'

describe('versioned precomputed layouts', () => {
  it.each([
    ['void-energy', 'single', 110, 14],
    ['void-energy', 'planar', 93, 31],
    ['void-energy', 'volumetric', 90, 34],
  ] as const)('returns the validated optimal %s %s unit', (scenario, mode, primaryCount, separatorCount) => {
    const outcome = createPrecomputedLayout({ scenario, mode, units: { x: 9, y: 9, z: 9 } })
    expect(outcome?.ok).toBe(true)
    if (!outcome?.ok) return
    expect(outcome.result.request.units).toEqual({ x: 1, y: 1, z: 1 })
    expect(outcome.result.blocks).toEqual({ x: 5, y: 5, z: 5 })
    expect(outcome.result.primaryCount).toBe(primaryCount)
    expect(outcome.result.separatorCount).toBe(separatorCount)
    expect(outcome.result.deviceCount).toBe(1)
    expect(outcome.result.solver).toMatchObject({ status: 'optimal', lowerBound: separatorCount, upperBound: separatorCount })
  })

  it.each([
    ['single', 88, 36, 33],
    ['planar', 86, 38, 35],
    ['volumetric', 90, 34, 33],
  ] as const)('returns the validated feasible plutonium %s unit', (mode, primaryCount, separatorCount, lowerBound) => {
    const outcome = createPrecomputedLayout({
      scenario: 'plutonium-heat',
      mode,
      units: { x: 1, y: 1, z: 1 },
    })
    expect(outcome?.ok).toBe(true)
    if (!outcome?.ok) return
    expect(outcome.result.primaryCount).toBe(primaryCount)
    expect(outcome.result.separatorCount).toBe(separatorCount)
    expect(outcome.result.deviceCount).toBe(1)
    expect(outcome.result.solver).toMatchObject({ status: 'feasible', lowerBound, upperBound: separatorCount })
  })
})
