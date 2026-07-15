import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { composeCollectorHeadMatrix } from './collectorAnimation'

describe('collector head animation', () => {
  it('rotates around a fixed pivot on all three axes without bobbing', () => {
    const pivot = new Vector3(1, 2, 3)
    const firstPosition = new Vector3()
    const firstRotation = new Quaternion()
    const firstScale = new Vector3()
    const secondPosition = new Vector3()
    const secondRotation = new Quaternion()
    const secondScale = new Vector3()

    composeCollectorHeadMatrix(new Matrix4(), pivot, 1, 0)
      .decompose(firstPosition, firstRotation, firstScale)
    composeCollectorHeadMatrix(new Matrix4(), pivot, 2, 0)
      .decompose(secondPosition, secondRotation, secondScale)

    expect(firstPosition.toArray()).toEqual([1, 2.17, 3])
    expect(secondPosition.toArray()).toEqual(firstPosition.toArray())
    const angles = new Euler().setFromQuaternion(firstRotation)
    expect(Math.abs(angles.x)).toBeGreaterThan(0.1)
    expect(Math.abs(angles.y)).toBeGreaterThan(0.1)
    expect(Math.abs(angles.z)).toBeGreaterThan(0.1)
    expect(secondRotation.equals(firstRotation)).toBe(false)
  })
})
