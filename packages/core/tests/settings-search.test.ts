import { describe, expect, it } from 'vitest'
import type { SettingModule } from '../src/models/setting'
import { moduleMatchesSearch } from '../src/settings/search'

function createModule(overrides: Partial<SettingModule> = {}): SettingModule {
  return {
    id: 'module-1',
    projectId: 'project-1',
    type: 'richtext',
    title: '故事大纲',
    order: 0,
    collapsed: false,
    payload: { content: '起承转合' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('moduleMatchesSearch', () => {
  it('matches title and richtext content', () => {
    expect(moduleMatchesSearch(createModule(), '大纲')).toBe(true)
    expect(moduleMatchesSearch(createModule(), '起承')).toBe(true)
    expect(moduleMatchesSearch(createModule(), '不存在')).toBe(false)
  })

  it('matches checklist items', () => {
    const module = createModule({
      type: 'checklist',
      title: '伏笔',
      payload: {
        items: [{ id: '1', text: '主角身世', checked: false }]
      }
    })
    expect(moduleMatchesSearch(module, '身世')).toBe(true)
  })

  it('matches table columns and rows', () => {
    const module = createModule({
      type: 'table',
      title: '力量体系',
      payload: {
        columns: [{ id: 'realm', name: '境界', type: 'text' }],
        rows: [{ realm: '筑基' }]
      }
    })
    expect(moduleMatchesSearch(module, '境界')).toBe(true)
    expect(moduleMatchesSearch(module, '筑基')).toBe(true)
  })
})
