import { BufferGeometry, Float32BufferAttribute, Quaternion, Vector3 } from 'three'

export type FaceName = 'north' | 'south' | 'east' | 'west' | 'up' | 'down'

interface ModelFace {
  texture: string
  uv?: [number, number, number, number]
  rotation?: number
  cullface?: FaceName
}

interface ModelElementRotation {
  angle: number
  axis: 'x' | 'y' | 'z'
  origin: [number, number, number]
}

interface ModelElement {
  from: [number, number, number]
  to: [number, number, number]
  faces: Partial<Record<FaceName, ModelFace>>
  rotation?: ModelElementRotation
  shade?: boolean
  light_emission?: number
}

export interface MinecraftModelSource {
  parent?: string
  render_type?: string
  ambientocclusion?: boolean
  textures?: Record<string, string>
  elements?: ModelElement[]
}

export interface ParsedModelPart {
  geometry: BufferGeometry
  texture: string
  emissive: boolean
  shaded: boolean
  inverted: boolean
  ambientOcclusion: boolean
  cutout: boolean
}

export interface ParseModelOptions {
  originMode?: 'block' | 'centered'
}

interface GeometryAccumulator {
  positions: number[]
  uvs: number[]
  indices: number[]
}

interface AccumulatorEntry {
  geometry: GeometryAccumulator
  texture: string
  emissive: boolean
  shaded: boolean
  inverted: boolean
}

const FACE_NAMES: readonly FaceName[] = ['north', 'south', 'east', 'west', 'up', 'down']

export function parseMinecraftModel(input: unknown, options: ParseModelOptions = {}): ParsedModelPart[] {
  const model = assertModel(input)
  const originMode = options.originMode ?? 'block'
  const elements = model.elements ?? createParentElements(model.parent)
  const accumulators = new Map<string, AccumulatorEntry>()

  for (const element of elements) {
    validateElement(element)
    for (const faceName of FACE_NAMES) {
      const face = element.faces[faceName]
      if (!face) continue
      const texture = resolveTexture(face.texture, model.textures ?? {})
      const emissive = (element.light_emission ?? 0) > 0
      const shaded = element.shade !== false
      const inverted = element.from.some((value, index) => value > (element.to[index] ?? value))
      const key = `${texture}|${emissive ? 'emissive' : 'lit'}|${shaded ? 'shaded' : 'unshaded'}|${inverted ? 'inverted' : 'normal'}`
      let entry = accumulators.get(key)
      if (!entry) {
        entry = {
          geometry: { positions: [], uvs: [], indices: [] },
          texture,
          emissive,
          shaded,
          inverted,
        }
        accumulators.set(key, entry)
      }
      appendFace(entry.geometry, element, faceName, face, originMode)
    }
  }

  return [...accumulators.values()].map((entry) => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(entry.geometry.positions, 3))
    geometry.setAttribute('uv', new Float32BufferAttribute(entry.geometry.uvs, 2))
    geometry.setIndex(entry.geometry.indices)
    geometry.computeVertexNormals()
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return {
      geometry,
      texture: entry.texture,
      emissive: entry.emissive,
      shaded: entry.shaded,
      inverted: entry.inverted,
      ambientOcclusion: model.ambientocclusion !== false,
      cutout: model.render_type === 'minecraft:cutout' || model.render_type === 'cutout',
    }
  })
}

function assertModel(input: unknown): MinecraftModelSource {
  if (!input || typeof input !== 'object') throw new Error('Minecraft 模型必须是 JSON 对象')
  const model = input as MinecraftModelSource
  if (!model.elements && model.parent !== 'minecraft:block/cube_all') {
    throw new Error(`不支持没有 elements 的父模型：${model.parent ?? 'none'}`)
  }
  return model
}

function validateElement(element: ModelElement): void {
  if (!Array.isArray(element.from) || element.from.length !== 3 || !Array.isArray(element.to) || element.to.length !== 3) {
    throw new Error('模型 element 缺少合法的 from/to')
  }
  if (!element.faces || typeof element.faces !== 'object') throw new Error('模型 element 缺少 faces')
  if (element.rotation && !['x', 'y', 'z'].includes(element.rotation.axis)) {
    throw new Error(`不支持的旋转轴：${element.rotation.axis}`)
  }
}

function createParentElements(parent: string | undefined): ModelElement[] {
  if (parent !== 'minecraft:block/cube_all') throw new Error(`不支持的 Minecraft 父模型：${parent ?? 'none'}`)
  const faces = Object.fromEntries(FACE_NAMES.map((name) => [name, { texture: '#all', uv: [0, 0, 16, 16] }]))
  return [{
    from: [0, 0, 0],
    to: [16, 16, 16],
    faces: faces as Record<FaceName, ModelFace>,
  }]
}

function resolveTexture(reference: string, textures: Record<string, string>): string {
  let current = reference
  const visited = new Set<string>()
  while (current.startsWith('#')) {
    const key = current.slice(1)
    if (visited.has(key)) throw new Error(`纹理变量循环引用：${reference}`)
    visited.add(key)
    const next = textures[key]
    if (!next) throw new Error(`找不到纹理变量：${current}`)
    current = next
  }
  return current
}

function appendFace(
  accumulator: GeometryAccumulator,
  element: ModelElement,
  faceName: FaceName,
  face: ModelFace,
  originMode: 'block' | 'centered',
): void {
  const [rawX1, rawY1, rawZ1] = element.from
  const [rawX2, rawY2, rawZ2] = element.to
  const offset = originMode === 'block' ? -0.5 : 0
  const x1 = rawX1 / 16 + offset
  const y1 = rawY1 / 16 + offset
  const z1 = rawZ1 / 16 + offset
  const x2 = rawX2 / 16 + offset
  const y2 = rawY2 / 16 + offset
  const z2 = rawZ2 / 16 + offset

  const vertices = getFaceVertices(faceName, x1, y1, z1, x2, y2, z2)
  if (element.rotation && element.rotation.angle !== 0) {
    const axis = new Vector3(
      element.rotation.axis === 'x' ? 1 : 0,
      element.rotation.axis === 'y' ? 1 : 0,
      element.rotation.axis === 'z' ? 1 : 0,
    )
    const quaternion = new Quaternion().setFromAxisAngle(axis, element.rotation.angle * Math.PI / 180)
    const rotationOffset = originMode === 'block' ? -0.5 : 0
    const origin = new Vector3(
      element.rotation.origin[0] / 16 + rotationOffset,
      element.rotation.origin[1] / 16 + rotationOffset,
      element.rotation.origin[2] / 16 + rotationOffset,
    )
    for (const vertex of vertices) vertex.sub(origin).applyQuaternion(quaternion).add(origin)
  }

  const firstVertex = accumulator.positions.length / 3
  for (const vertex of vertices) accumulator.positions.push(vertex.x, vertex.y, vertex.z)
  accumulator.uvs.push(...getFaceUvs(face.uv ?? [0, 0, 16, 16], face.rotation ?? 0))
  accumulator.indices.push(firstVertex, firstVertex + 1, firstVertex + 2, firstVertex, firstVertex + 2, firstVertex + 3)
}

function getFaceVertices(
  face: FaceName,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
): Vector3[] {
  const vertices: Record<FaceName, Vector3[]> = {
    north: [new Vector3(x1, y1, z1), new Vector3(x1, y2, z1), new Vector3(x2, y2, z1), new Vector3(x2, y1, z1)],
    south: [new Vector3(x2, y1, z2), new Vector3(x2, y2, z2), new Vector3(x1, y2, z2), new Vector3(x1, y1, z2)],
    east: [new Vector3(x2, y1, z1), new Vector3(x2, y2, z1), new Vector3(x2, y2, z2), new Vector3(x2, y1, z2)],
    west: [new Vector3(x1, y1, z2), new Vector3(x1, y2, z2), new Vector3(x1, y2, z1), new Vector3(x1, y1, z1)],
    up: [new Vector3(x1, y2, z1), new Vector3(x1, y2, z2), new Vector3(x2, y2, z2), new Vector3(x2, y2, z1)],
    down: [new Vector3(x1, y1, z2), new Vector3(x1, y1, z1), new Vector3(x2, y1, z1), new Vector3(x2, y1, z2)],
  }
  return vertices[face]
}

function getFaceUvs(uv: [number, number, number, number], rotation: number): number[] {
  const [u1, v1, u2, v2] = uv.map((value) => value / 16) as [number, number, number, number]
  const corners = [
    [u1, v2],
    [u1, v1],
    [u2, v1],
    [u2, v2],
  ]
  const steps = ((rotation / 90) % 4 + 4) % 4
  const rotated = corners.map((_, index) => corners[(index - steps + 4) % 4] ?? corners[index])
  return rotated.flatMap((corner) => corner ?? [0, 0])
}
