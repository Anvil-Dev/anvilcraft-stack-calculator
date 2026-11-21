import { describe, expect, it } from 'vitest'
import { CELL, type Position, type StackMode, type StructureResult } from './types'
import {
  createDeviceMask,
  fromIndex,
  getBlockDimensions,
  getDevicePositions,
  getReplicationAxes,
  normalizeUnits,
  resolveNeighborPosition,
  toIndex,
} from './grid'
import { validateStructure } from './validation'

describe('grid', () => {
  it('normalizes all three stack modes', () => {
    expect(normalizeUnits('single', { x: 4, y: 4, z: 4 })).toEqual({ x: 1, y: 1, z: 1 })
    expect(normalizeUnits('planar', { x: 3, y: 4, z: 2 })).toEqual({ x: 1, y: 1, z: 1 })
    expect(normalizeUnits('volumetric', { x: 2, y: 2, z: 1 })).toEqual({ x: 1, y: 1, z: 1 })
  })

  it('wraps neighbor coordinates only on replication axes', () => {
    const blocks = { x: 5, y: 5, z: 5 }
    const origin = { x: 0, y: 0, z: 0 }
    expect(getReplicationAxes('single')).toEqual([])
    expect(getReplicationAxes('planar')).toEqual(['x', 'z'])
    expect(getReplicationAxes('volumetric')).toEqual(['x', 'y', 'z'])
    expect(resolveNeighborPosition(origin, { x: -1, y: 0, z: 0 }, blocks, 'single')).toBeNull()
    expect(resolveNeighborPosition(origin, { x: -1, y: 0, z: 0 }, blocks, 'planar')).toEqual({ x: 4, y: 0, z: 0 })
    expect(resolveNeighborPosition(origin, { x: 0, y: -1, z: 0 }, blocks, 'planar')).toBeNull()
    expect(resolveNeighborPosition(origin, { x: 0, y: -1, z: 0 }, blocks, 'volumetric')).toEqual({ x: 0, y: 4, z: 0 })
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

  it('decays at five void neighbors and stays stable with four beside the collector', () => {
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
    cells[toIndex({ x: 2, y: 2, z: 0 }, blocks)] = CELL.separator
    result.primaryCount -= 1
    result.separatorCount += 1
    expect(validateStructure(result).valid).toBe(true)
  })

  it('validates primary neighbors across planar unit boundaries', () => {
    const blocks = { x: 5, y: 5, z: 5 }
    const cells = new Uint8Array(125)
    cells.fill(CELL.separator)
    const target = { x: 0, y: 2, z: 1 }
    const primaryPositions = [
      target,
      { x: 4, y: 2, z: 1 }, { x: 1, y: 2, z: 1 },
      { x: 0, y: 1, z: 1 }, { x: 0, y: 3, z: 1 },
      { x: 0, y: 2, z: 0 },
    ]
    for (const position of primaryPositions) cells[toIndex(position, blocks)] = CELL.primary
    cells[toIndex({ x: 2, y: 2, z: 2 }, blocks)] = CELL.device

    const createResult = (mode: 'single' | 'planar'): StructureResult => ({
      request: { scenario: 'void-energy', mode, units: { x: 1, y: 1, z: 1 } },
      blocks,
      cells,
      primaryCount: primaryPositions.length,
      separatorCount: cells.length - primaryPositions.length - 1,
      deviceCount: 1,
      solver: { status: 'feasible', lowerBound: 0, upperBound: 118, durationMs: 0 },
    })

    expect(validateStructure(createResult('single')).valid).toBe(true)
    expect(validateStructure(createResult('planar')).decayPositions).toContainEqual(target)
  })
})

describe('plutonium cooling', () => {
  const blocks = { x: 5, y: 5, z: 5 }
  function meltingPositions(mode: StackMode, coolant: Position[]) {
    const cells = new Uint8Array(125).fill(CELL.primary)
    cells[toIndex({ x: 2, y: 2, z: 2 }, blocks)] = CELL.device
    for (const position of coolant) cells[toIndex(position, blocks)] = CELL.separator
    return validateStructure({
      request: { scenario: 'plutonium-heat', mode, units: { x: 1, y: 1, z: 1 } },
      blocks,
      cells,
      primaryCount: 124 - coolant.length,
      separatorCount: coolant.length,
      deviceCount: 1,
      solver: { status: 'feasible', lowerBound: 0, upperBound: coolant.length, durationMs: 0 },
    }).decayPositions
  }

  it('requires face contact and accepts one coolant beside five plutonium blocks', () => {
    const target = { x: 1, y: 1, z: 1 }
    expect(meltingPositions('single', [{ x: 0, y: 0, z: 1 }])).toContainEqual(target)
    expect(meltingPositions('single', [{ x: 0, y: 1, z: 1 }])).not.toContainEqual(target)
  })

  it('does not treat a dry collector or the open exterior as a coolant', () => {
    const melting = meltingPositions('single', [])
    expect(melting).toContainEqual({ x: 0, y: 0, z: 0 })
    expect(melting).toContainEqual({ x: 1, y: 2, z: 2 })
  })

  it('accepts a coolant across a boundary only when that axis repeats', () => {
    const target = { x: 0, y: 0, z: 0 }
    const acrossX = [{ x: 4, y: 0, z: 0 }]
    const acrossY = [{ x: 0, y: 4, z: 0 }]
    expect(meltingPositions('single', acrossX)).toContainEqual(target)
    expect(meltingPositions('planar', acrossX)).not.toContainEqual(target)
    expect(meltingPositions('planar', acrossY)).toContainEqual(target)
    expect(meltingPositions('volumetric', acrossY)).not.toContainEqual(target)
  })
})
