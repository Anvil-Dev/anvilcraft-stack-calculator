import { describe, expect, it } from 'vitest'
import { CELL, type StructureResult } from './types'
import {
  createDeviceMask,
  fromIndex,
  getBlockDimensions,
  getDevicePositions,
  normalizeUnits,
  toIndex,
} from './grid'
import { validateStructure } from './validation'

describe('grid', () => {
  it('normalizes all three stack modes', () => {
    expect(normalizeUnits('single', { x: 4, y: 4, z: 4 })).toEqual({ x: 1, y: 1, z: 1 })
    expect(normalizeUnits('planar', { x: 3, y: 4, z: 2 })).toEqual({ x: 3, y: 1, z: 2 })
    expect(normalizeUnits('volumetric', { x: 2, y: 2, z: 1 })).toEqual({ x: 2, y: 2, z: 1 })
  })

  it('places one device in every unit center', () => {
    const units = { x: 2, y: 1, z: 2 }
    expect(getDevicePositions(units)).toEqual([
      { x: 2, y: 2, z: 2 },
      { x: 7, y: 2, z: 2 },
      { x: 2, y: 2, z: 7 },
      { x: 7, y: 2, z: 7 },
    ])
    expect(createDeviceMask(units).reduce((sum, value) => sum + value, 0)).toBe(4)
  })

  it('round-trips coordinates and indices', () => {
    const dimensions = { x: 10, y: 5, z: 15 }
    const position = { x: 8, y: 3, z: 11 }
    expect(fromIndex(toIndex(position, dimensions), dimensions)).toEqual(position)
  })
})

describe('independent validation', () => {
  it('accepts the proven 5 x 5 x 5 golden layout', () => {
    const request = { scenario: 'void-energy', mode: 'single', units: { x: 1, y: 1, z: 1 } } as const
    const blocks = getBlockDimensions(request.units)
    const cells = new Uint8Array(125)
    const separators = [
      { x: 2, y: 0, z: 2 },
      { x: 1, y: 1, z: 1 }, { x: 3, y: 1, z: 1 },
      { x: 1, y: 1, z: 3 }, { x: 3, y: 1, z: 3 },
      { x: 2, y: 2, z: 0 }, { x: 0, y: 2, z: 2 },
      { x: 4, y: 2, z: 2 }, { x: 2, y: 2, z: 4 },
      { x: 1, y: 3, z: 1 }, { x: 3, y: 3, z: 1 },
      { x: 1, y: 3, z: 3 }, { x: 3, y: 3, z: 3 },
      { x: 2, y: 4, z: 2 },
    ]
    for (const position of separators) cells[toIndex(position, blocks)] = CELL.separator
    cells[toIndex({ x: 2, y: 2, z: 2 }, blocks)] = CELL.device

    const result: StructureResult = {
      request,
      blocks,
      cells,
      primaryCount: 110,
      separatorCount: 14,
      deviceCount: 1,
      solver: { status: 'optimal', lowerBound: 14, upperBound: 14, durationMs: 0 },
    }
    expect(validateStructure(result)).toEqual({ valid: true, errors: [], decayPositions: [] })
  })

  it('rejects an enclosed primary block', () => {
    const request = { scenario: 'void-energy', mode: 'single', units: { x: 1, y: 1, z: 1 } } as const
    const cells = new Uint8Array(125)
    const blocks = getBlockDimensions(request.units)
    cells[toIndex({ x: 2, y: 2, z: 2 }, blocks)] = CELL.device
    const result: StructureResult = {
      request,
      blocks,
      cells,
      primaryCount: 124,
      separatorCount: 0,
      deviceCount: 1,
      solver: { status: 'feasible', lowerBound: 0, upperBound: 0, durationMs: 0 },
    }
    const report = validateStructure(result)
    expect(report.valid).toBe(false)
    expect(report.decayPositions).toHaveLength(80)
  })

  it('rejects a primary block with exactly five primary face neighbors', () => {
    const request = { scenario: 'void-energy', mode: 'single', units: { x: 1, y: 1, z: 1 } } as const
    const blocks = getBlockDimensions(request.units)
    const cells = new Uint8Array(125)
    cells.fill(CELL.separator)
    const target = { x: 2, y: 2, z: 1 }
    const primaryPositions = [
      target,
      { x: 1, y: 2, z: 1 }, { x: 3, y: 2, z: 1 },
      { x: 2, y: 1, z: 1 }, { x: 2, y: 3, z: 1 },
      { x: 2, y: 2, z: 0 },
    ]
    for (const position of primaryPositions) cells[toIndex(position, blocks)] = CELL.primary
    cells[toIndex({ x: 2, y: 2, z: 2 }, blocks)] = CELL.device
    const result: StructureResult = {
      request,
      blocks,
      cells,
      primaryCount: primaryPositions.length,
      separatorCount: cells.length - primaryPositions.length - 1,
      deviceCount: 1,
      solver: { status: 'feasible', lowerBound: 0, upperBound: 118, durationMs: 0 },
    }

    const report = validateStructure(result)
    expect(report.decayPositions).toContainEqual(target)
  })
})
