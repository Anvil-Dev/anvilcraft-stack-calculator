import { describe, expect, it } from 'vitest'
import heatCollectorHead from '../assets/anvilcraft/models/block/heat_collector_head.json'
import negativeMatterBlock from '../assets/anvilcraft/models/block/negative_matter_block.json'
import plutoniumBlock from '../assets/anvilcraft/models/block/plutonium_block.json'
import voidEnergyCollectorHead from '../assets/anvilcraft/models/block/void_energy_collector_head.json'
import voidMatterBlock from '../assets/anvilcraft/models/block/void_matter_block.json'
import { parseMinecraftModel } from './minecraftModel'

describe('Minecraft model parser', () => {
  it('resolves cube_all into textured geometry', () => {
    const parts = parseMinecraftModel(plutoniumBlock)
    expect(parts).toHaveLength(1)
    expect(parts[0]?.texture).toBe('anvilcraft:block/plutonium_block')
    expect(parts[0]?.geometry.getAttribute('position').count).toBe(24)
  })

  it('keeps cutout, inner and emissive parts', () => {
    const voidParts = parseMinecraftModel(voidMatterBlock)
    expect(voidParts.some((part) => part.cutout)).toBe(true)
    expect(new Set(voidParts.map((part) => part.texture))).toEqual(new Set([
      'anvilcraft:block/void_matter_block',
      'anvilcraft:block/void_matter_block_inner',
      'anvilcraft:block/void_matter_block_inner_2',
    ]))

    const negativeParts = parseMinecraftModel(negativeMatterBlock)
    expect(negativeParts.some((part) => part.emissive)).toBe(true)
  })

  it('preserves unshaded and inverted negative-space elements', () => {
    const negativeParts = parseMinecraftModel(negativeMatterBlock)
    expect(negativeParts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        texture: 'anvilcraft:block/negative_matter_block',
        shaded: false,
        inverted: false,
        ambientOcclusion: false,
      }),
      expect.objectContaining({
        texture: 'anvilcraft:block/negative_matter_block_outline',
        shaded: false,
        inverted: true,
        emissive: true,
      }),
    ]))

    expect(parseMinecraftModel(heatCollectorHead, { originMode: 'centered' })
      .every((part) => !part.shaded && !part.inverted)).toBe(true)
    expect(parseMinecraftModel(voidEnergyCollectorHead, { originMode: 'centered' })
      .some((part) => part.inverted)).toBe(true)
  })

  it('maps Minecraft top-left UVs without vertically flipping unflipped textures', () => {
    const heatParts = parseMinecraftModel(heatCollectorHead, { originMode: 'centered' })
    const coreUvs = heatParts[0]?.geometry.getAttribute('uv')
    expect(coreUvs ? Array.from(coreUvs.array.slice(0, 8)) : []).toEqual([
      0, 0.5,
      0, 0,
      0.5, 0,
      0.5, 0.5,
    ])
  })

  it('rejects an unsupported implicit parent', () => {
    expect(() => parseMinecraftModel({ parent: 'minecraft:block/unknown' })).toThrow('不支持')
  })
})
