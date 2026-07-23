/** 设定模块类型，对齐 md/07-settings-custom-modules.md §7 */

export type SettingModuleType = 'richtext' | 'checklist' | 'table' | 'mindmap' | 'embed'

export interface TableColumn {
  id: string
  name: string
  type: 'text' | 'number' | 'select'
}

export interface TablePayload {
  columns: TableColumn[]
  rows: Record<string, string | number>[]
}

export interface RichTextPayload {
  content: string
}

export interface ChecklistPayload {
  items: Array<{ id: string; text: string; checked: boolean }>
}

export interface MindmapPayload {
  nodes: unknown[]
}

export type SettingModulePayload =
  | RichTextPayload
  | ChecklistPayload
  | TablePayload
  | MindmapPayload
  | Record<string, unknown>

export interface SettingModule {
  id: string
  projectId: string
  type: SettingModuleType
  title: string
  order: number
  collapsed: boolean
  payload: SettingModulePayload
  createdAt: string
  updatedAt: string
}
