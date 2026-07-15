import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LayerPreview from './LayerPreview.vue'
import { CELL, type StructureResult } from '../domain/types'
import { getBlockDimensions, toIndex } from '../domain/grid'

function createGoldenResult(): StructureResult {
  const request = { scenario: 'void-energy', mode: 'single', units: { x: 1, y: 1, z: 1 } } as const
  const blocks = getBlockDimensions(request.units)
  const cells = new Uint8Array(125)
  for (const position of [
    { x: 2, y: 0, z: 2 },
    { x: 1, y: 1, z: 1 }, { x: 3, y: 1, z: 1 },
    { x: 1, y: 1, z: 3 }, { x: 3, y: 1, z: 3 },
    { x: 2, y: 2, z: 0 }, { x: 0, y: 2, z: 2 },
    { x: 4, y: 2, z: 2 }, { x: 2, y: 2, z: 4 },
    { x: 1, y: 3, z: 1 }, { x: 3, y: 3, z: 1 },
    { x: 1, y: 3, z: 3 }, { x: 3, y: 3, z: 3 },
    { x: 2, y: 4, z: 2 },
  ]) cells[toIndex(position, blocks)] = CELL.separator
  cells[toIndex({ x: 2, y: 2, z: 2 }, blocks)] = CELL.device
  return {
    request,
    blocks,
    cells,
    primaryCount: 110,
    separatorCount: 14,
    deviceCount: 1,
    solver: { status: 'optimal', lowerBound: 14, upperBound: 14, durationMs: 0 },
  }
}

describe('LayerPreview', () => {
  it('renders the selected layer from the shared structure result', async () => {
    const wrapper = mount(LayerPreview, {
      props: {
        result: createGoldenResult(),
        scenario: 'void-energy',
        axis: 'y',
        layerIndex: 2,
      },
      global: {
        stubs: {
          'a-button': true,
          'a-radio': true,
          'a-radio-group': true,
          'a-slider': true,
          'a-tooltip': true,
          IconCopy: true,
          IconLeft: true,
          IconRight: true,
        },
      },
    })

    expect(wrapper.findAll('[role="gridcell"]')).toHaveLength(25)
    expect(wrapper.text()).toContain('虚空物质块 20')
    expect(wrapper.text()).toContain('负物质块 4')
    expect(wrapper.text()).toContain('虚空能收集器 1')

    await wrapper.setProps({ axis: 'z', layerIndex: 0 })
    expect(wrapper.findAll('[role="gridcell"]')).toHaveLength(25)
    expect(wrapper.text()).toContain('Z = 0')
  })
})
