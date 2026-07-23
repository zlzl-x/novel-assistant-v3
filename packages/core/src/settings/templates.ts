import type {
  ChecklistPayload,
  RichTextPayload,
  SettingModulePayload,
  SettingModuleType,
  TablePayload
} from '../models/setting'

export type SettingTemplateId = 'outline' | 'powerSystem' | 'characterSheet' | 'foreshadowing'

export interface SettingTemplateModuleDef {
  type: SettingModuleType
  title: string
  payload: SettingModulePayload
}

export interface SettingTemplate {
  id: SettingTemplateId
  name: string
  description: string
  modules: SettingTemplateModuleDef[]
}

export const SETTING_TEMPLATES: SettingTemplate[] = [
  {
    id: 'outline',
    name: '大纲（起承转合）',
    description: '富文本模块，用于故事大纲',
    modules: [
      {
        type: 'richtext',
        title: '故事大纲',
        payload: { content: '' } satisfies RichTextPayload
      }
    ]
  },
  {
    id: 'powerSystem',
    name: '力量体系',
    description: '表格模块，可填写境界与规则',
    modules: [
      {
        type: 'table',
        title: '力量体系',
        payload: {
          columns: [
            { id: 'realm', name: '境界', type: 'text' },
            { id: 'requirement', name: '突破条件', type: 'text' },
            { id: 'ability', name: '能力特征', type: 'text' }
          ],
          rows: []
        } satisfies TablePayload
      }
    ]
  },
  {
    id: 'characterSheet',
    name: '人设表',
    description: '表格模块，记录角色设定',
    modules: [
      {
        type: 'table',
        title: '人设表',
        payload: {
          columns: [
            { id: 'name', name: '角色名', type: 'text' },
            { id: 'identity', name: '身份', type: 'text' },
            { id: 'personality', name: '性格', type: 'text' },
            { id: 'notes', name: '备注', type: 'text' }
          ],
          rows: []
        } satisfies TablePayload
      }
    ]
  },
  {
    id: 'foreshadowing',
    name: '伏笔追踪',
    description: '清单模块，追踪伏笔埋设与回收',
    modules: [
      {
        type: 'checklist',
        title: '伏笔追踪',
        payload: { items: [] } satisfies ChecklistPayload
      }
    ]
  }
]

export function getSettingTemplate(id: SettingTemplateId): SettingTemplate | undefined {
  return SETTING_TEMPLATES.find((template) => template.id === id)
}

export function createBlankPayload(type: SettingModuleType): SettingModulePayload {
  switch (type) {
    case 'richtext':
      return { content: '' } satisfies RichTextPayload
    case 'checklist':
      return { items: [] } satisfies ChecklistPayload
    case 'table':
      return {
        columns: [
          { id: 'col-1', name: '列 1', type: 'text' },
          { id: 'col-2', name: '列 2', type: 'text' }
        ],
        rows: []
      } satisfies TablePayload
    default:
      return {}
  }
}

export function defaultTitleForType(type: SettingModuleType): string {
  switch (type) {
    case 'richtext':
      return '富文本模块'
    case 'checklist':
      return '清单模块'
    case 'table':
      return '表格模块'
    default:
      return '设定模块'
  }
}
