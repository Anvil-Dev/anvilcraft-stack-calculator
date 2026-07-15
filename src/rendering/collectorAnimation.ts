import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

const PIVOT_Y_OFFSET = 0.17
const ROTATION_SPEED = new Vector3(0.43, 0.61, 0.37)
const position = new Vector3()
const rotation = new Euler()
const quaternion = new Quaternion()
const scale = new Vector3(1, 1, 1)

export function composeCollectorHeadMatrix(
  target: Matrix4,
  pivot: Vector3,
  elapsedSeconds: number,
  instanceIndex: number,
): Matrix4 {
  position.copy(pivot)
  position.y += PIVOT_Y_OFFSET
  const phase = instanceIndex * 0.18
  rotation.set(
    elapsedSeconds * ROTATION_SPEED.x + phase,
    elapsedSeconds * ROTATION_SPEED.y + phase,
    elapsedSeconds * ROTATION_SPEED.z + phase,
  )
  quaternion.setFromEuler(rotation)
  return target.compose(position, quaternion, scale)
}
