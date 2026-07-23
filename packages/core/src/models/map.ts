/** 地图类型，对齐 md/05-map-system.md §5 */

export type MapNodeType =
  | 'continent'
  | 'country'
  | 'region'
  | 'city'
  | 'sect'
  | 'building'
  | 'wilderness'
  | 'other'

export interface MapWorld {
  id: string
  projectId: string
  name: string
  description: string
  stylePreset?: string
  generatedCode?: string
  codeGeneratedAt?: string
  codeVersion: number
  createdAt: string
  updatedAt: string
}

export interface MapNodeGeo {
  relativePosition?: string
  neighbors?: string[]
  distanceHint?: string
}

export interface MapNode {
  id: string
  worldId: string
  parentId: string | null
  name: string
  type: MapNodeType
  summary: string
  tags: string[]
  geo?: MapNodeGeo
  source: 'ai_generated' | 'manual'
  createdAt: string
  updatedAt: string
}
