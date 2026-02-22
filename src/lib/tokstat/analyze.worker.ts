import { analyzeRecords } from '../../core/analyze.js'

type AnalyzeRequest = {
  type: 'analyze'
  requestId: number
  files: File[]
  options?: {
    glob?: string
    model?: string
    sampleValues?: number
  }
}

type ProgressMessage = {
  type: 'progress'
  requestId: number
  stage: 'parse' | 'analyze'
  completed: number
  total: number
  label: string
}

type DoneMessage = {
  type: 'done'
  requestId: number
  report: any
}

type ErrorMessage = {
  type: 'error'
  requestId: number
  message: string
}

self.onmessage = async (event: MessageEvent<AnalyzeRequest>) => {
  const message = event.data
  if (!message || message.type !== 'analyze') return

  const { requestId, files } = message

  try {
    const records: Array<{ path: string; parsed: unknown }> = []
    const total = files.length

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      }
      catch (error: any) {
        throw new Error(`Invalid JSON in ${file.name}: ${error?.message ?? String(error)}`)
      }
      records.push({ path: file.name, parsed })

      const progress: ProgressMessage = {
        type: 'progress',
        requestId,
        stage: 'parse',
        completed: i + 1,
        total,
        label: `Parsing ${i + 1}/${total}`,
      }
      self.postMessage(progress)
    }

    const analyzeProgress: ProgressMessage = {
      type: 'progress',
      requestId,
      stage: 'analyze',
      completed: total,
      total,
      label: `Analyzing ${total} files`,
    }
    self.postMessage(analyzeProgress)

    const report = analyzeRecords(records, {
      glob: message.options?.glob ?? `${total} uploaded files`,
      model: message.options?.model ?? 'gpt-4o',
      sampleValues: message.options?.sampleValues ?? 5,
    })

    const done: DoneMessage = { type: 'done', requestId, report }
    self.postMessage(done)
  }
  catch (error: any) {
    const failure: ErrorMessage = {
      type: 'error',
      requestId,
      message: error?.message ?? String(error),
    }
    self.postMessage(failure)
  }
}

export {}
