export type RecognitionDebugStage =
  | 'step1-llm-raw'
  | 'step1-llm-parsed'
  | 'step1-enriched'
  | 'step1-final'
  | 'step1-preview'
  | 'step1-error'
  | 'step2-llm-raw'
  | 'step2-llm-parsed'
  | 'step2-sanitized'
  | 'step2-error'

export interface RecognitionDebugEntry {
  id: string
  timestamp: string
  stage: RecognitionDebugStage
  label: string
  characterName?: string
  payload: unknown
}

export type RecognitionDebugSink = (
  entry: Omit<RecognitionDebugEntry, 'id' | 'timestamp'>
) => void
