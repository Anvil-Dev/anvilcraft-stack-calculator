import { describe, expect, it } from 'vitest'
import { createProvenLayout } from './provenLayouts'

describe('versioned proven layouts', () => {
  it.each([
    ['single', 110, 14],
    ['planar', 93, 31],
    ['volumetric', 90, 34],
  ] as const)('returns the validated %s unit', (mode, primaryCount, separatorCount) => {
    const outcome = createProvenLayout({
      scenario: 'void-energy',
      mode,
      units: { x: 9, y: 9, z: 9 },
    })
    expect(outcome?.ok).toBe(true)
    if (!outcome?.ok) return
    expect(outcome.result.request.units).toEqual({ x: 1, y: 1, z: 1 })
    expect(outcome.result.blocks).toEqual({ x: 5, y: 5, z: 5 })
    expect(outcome.result.primaryCount).toBe(primaryCount)
    expect(outcome.result.separatorCount).toBe(separatorCount)
    expect(outcome.result.deviceCount).toBe(1)
    expect(outcome.result.solver.status).toBe('optimal')
  })
})
