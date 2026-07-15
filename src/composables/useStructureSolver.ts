import { onBeforeUnmount, ref } from 'vue'
import type { SolveOutcome, StructureRequest } from '../domain/types'
import type { SolverRequestMessage, SolverResponseMessage } from '../workers/messages'

export function useStructureSolver() {
  const solving = ref(false)
  const error = ref('')
  let requestId = 0
  let worker: Worker | null = null

  function cancel(): void {
    worker?.terminate()
    worker = null
    solving.value = false
  }

  function solve(request: StructureRequest): Promise<SolveOutcome> {
    cancel()
    requestId += 1
    const currentId = requestId
    solving.value = true
    error.value = ''
    worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), { type: 'module' })

    return new Promise((resolve) => {
      if (!worker) return
      worker.onmessage = (event: MessageEvent<SolverResponseMessage>) => {
        if (event.data.requestId !== currentId) return
        solving.value = false
        worker?.terminate()
        worker = null
        if (!event.data.outcome.ok) error.value = event.data.outcome.message
        resolve(event.data.outcome)
      }
      worker.onerror = (event) => {
        if (currentId !== requestId) return
        const message = event.message || '求解器 Worker 加载失败'
        solving.value = false
        error.value = message
        worker?.terminate()
        worker = null
        resolve({ ok: false, status: 'failed', message })
      }
      const message: SolverRequestMessage = { requestId: currentId, request }
      worker.postMessage(message)
    })
  }

  onBeforeUnmount(cancel)
  return { solve, cancel, solving, error }
}
