import type { ScenarioId, CellType } from '../domain/types'

import heatCollectorBase from '../assets/anvilcraft/models/block/heat_collector_base.json'
import heatCollectorHead from '../assets/anvilcraft/models/block/heat_collector_head.json'
import leadBlock from '../assets/anvilcraft/models/block/lead_block.json'
import negativeMatterBlock from '../assets/anvilcraft/models/block/negative_matter_block.json'
import plutoniumBlock from '../assets/anvilcraft/models/block/plutonium_block.json'
import voidEnergyCollectorBase from '../assets/anvilcraft/models/block/void_energy_collector_base.json'
import voidEnergyCollectorHead from '../assets/anvilcraft/models/block/void_energy_collector_head.json'
import voidMatterBlock from '../assets/anvilcraft/models/block/void_matter_block.json'

import heatCollectorBottom from '../assets/anvilcraft/textures/block/heat_collector_bottom.png'
import heatCollectorHeadTexture from '../assets/anvilcraft/textures/block/heat_collector_head.png'
import heatCollectorSide from '../assets/anvilcraft/textures/block/heat_collector_side.png'
import heatCollectorTop from '../assets/anvilcraft/textures/block/heat_collector_top.png'
import leadBlockTexture from '../assets/anvilcraft/textures/block/lead_block.png'
import negativeMatterTexture from '../assets/anvilcraft/textures/block/negative_matter_block.png'
import negativeMatterOutline from '../assets/anvilcraft/textures/block/negative_matter_block_outline.png'
import plutoniumBlockTexture from '../assets/anvilcraft/textures/block/plutonium_block.png'
import voidCollectorBottom from '../assets/anvilcraft/textures/block/void_energy_collector_bottom.png'
import voidCollectorHead from '../assets/anvilcraft/textures/block/void_energy_collector_head.png'
import voidCollectorSide from '../assets/anvilcraft/textures/block/void_energy_collector_side.png'
import voidCollectorTop from '../assets/anvilcraft/textures/block/void_energy_collector_top.png'
import voidMatterTexture from '../assets/anvilcraft/textures/block/void_matter_block.png'
import voidMatterInner from '../assets/anvilcraft/textures/block/void_matter_block_inner.png'
import voidMatterInner2 from '../assets/anvilcraft/textures/block/void_matter_block_inner_2.png'

export const TEXTURE_URLS: Record<string, string> = {
  'anvilcraft:block/heat_collector_bottom': heatCollectorBottom,
  'anvilcraft:block/heat_collector_head': heatCollectorHeadTexture,
  'anvilcraft:block/heat_collector_side': heatCollectorSide,
  'anvilcraft:block/heat_collector_top': heatCollectorTop,
  'anvilcraft:block/lead_block': leadBlockTexture,
  'anvilcraft:block/negative_matter_block': negativeMatterTexture,
  'anvilcraft:block/negative_matter_block_outline': negativeMatterOutline,
  'anvilcraft:block/plutonium_block': plutoniumBlockTexture,
  'anvilcraft:block/void_energy_collector_bottom': voidCollectorBottom,
  'anvilcraft:block/void_energy_collector_head': voidCollectorHead,
  'anvilcraft:block/void_energy_collector_side': voidCollectorSide,
  'anvilcraft:block/void_energy_collector_top': voidCollectorTop,
  'anvilcraft:block/void_matter_block': voidMatterTexture,
  'anvilcraft:block/void_matter_block_inner': voidMatterInner,
  'anvilcraft:block/void_matter_block_inner_2': voidMatterInner2,
}

export interface ScenarioModelAssets {
  primary: unknown
  separator: unknown
  deviceBase: unknown
  deviceHead: unknown
}

export const SCENARIO_MODELS: Record<ScenarioId, ScenarioModelAssets> = {
  'void-energy': {
    primary: voidMatterBlock,
    separator: negativeMatterBlock,
    deviceBase: voidEnergyCollectorBase,
    deviceHead: voidEnergyCollectorHead,
  },
  'plutonium-heat': {
    primary: plutoniumBlock,
    separator: leadBlock,
    deviceBase: heatCollectorBase,
    deviceHead: heatCollectorHead,
  },
}

export const ROLE_TEXTURES: Record<ScenarioId, Record<CellType, string>> = {
  'void-energy': {
    primary: voidMatterTexture,
    separator: negativeMatterTexture,
    device: voidCollectorTop,
  },
  'plutonium-heat': {
    primary: plutoniumBlockTexture,
    separator: leadBlockTexture,
    device: heatCollectorTop,
  },
}
