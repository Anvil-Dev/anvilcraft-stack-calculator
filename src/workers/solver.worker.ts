/// <reference lib="webworker" />

import highsLoader from 'highs'
import wasmUrl from 'highs/runtime?url'
import { solveWithHighs } from '../domain/optimizer'
import type { SolverRequestMessage, SolverResponseMessage } from './messages'

const highsPromise = highsLoader({ locateFile: () => wasmUrl })

self.onmessage = async (event: MessageEvent<SolverRequestMessage>) => {
  const highs = await highsPromise
  const response: SolverResponseMessage = {
    requestId: event.data.requestId,
    outcome: solveWithHighs(highs, event.data.request),
  }
  self.postMessage(response, response.outcome.ok ? [response.outcome.result.cells.buffer] : [])
}
