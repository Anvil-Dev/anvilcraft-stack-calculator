/// <reference lib="webworker" />

import highsLoader from 'highs'
import wasmUrl from 'highs/runtime?url'
import { solveWithHighs } from '../domain/optimizer'
import { createPrecomputedLayout } from '../domain/precomputedLayouts'
import type { SolverRequestMessage, SolverResponseMessage } from './messages'

let highsPromise: ReturnType<typeof highsLoader> | null = null

function loadHighs(): ReturnType<typeof highsLoader> {
  highsPromise ??= highsLoader({ locateFile: () => wasmUrl })
  return highsPromise
}

self.onmessage = async (event: MessageEvent<SolverRequestMessage>) => {
  const precomputedOutcome = createPrecomputedLayout(event.data.request)
  const response: SolverResponseMessage = {
    requestId: event.data.requestId,
    outcome: precomputedOutcome ?? solveWithHighs(await loadHighs(), event.data.request),
  }
  self.postMessage(response, response.outcome.ok ? [response.outcome.result.cells.buffer] : [])
}
