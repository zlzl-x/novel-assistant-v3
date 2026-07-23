export type MapDebugStage =
  | 'map-codegen-start'
  | 'map-llm-request'
  | 'map-llm-response'
  | 'map-llm-raw'
  | 'map-layout-render'
  | 'map-fallback'
  | 'map-extract-html'
  | 'map-sanitize'
  | 'map-codegen-retry'
  | 'map-codegen-success'
  | 'map-codegen-error'
  | 'map-save'
  | 'map-render'

export interface MapDebugEntry {
  id: string
  timestamp: string
  stage: MapDebugStage
  label: string
  payload: unknown
}

export type MapDebugSink = (entry: Omit<MapDebugEntry, 'id' | 'timestamp'>) => void
