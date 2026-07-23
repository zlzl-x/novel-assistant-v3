import { describe, expect, it } from 'vitest'
import {
  SETTING_TEMPLATES,
  createBlankPayload,
  getSettingTemplate
} from '../src/settings/templates'

describe('setting templates', () => {
  it('provides four built-in templates', () => {
    expect(SETTING_TEMPLATES.map((template) => template.id)).toEqual([
      'outline',
      'powerSystem',
      'characterSheet',
      'foreshadowing'
    ])
  })

  it('inserts blank outline content', () => {
    const template = getSettingTemplate('outline')
    expect(template?.modules[0]?.payload).toEqual({ content: '' })
  })

  it('creates empty table rows for power system', () => {
    const template = getSettingTemplate('powerSystem')
    const payload = template?.modules[0]?.payload as { rows: unknown[]; columns: unknown[] }
    expect(payload.rows).toHaveLength(0)
    expect(payload.columns.length).toBeGreaterThan(0)
  })

  it('creates blank checklist for foreshadowing', () => {
    const template = getSettingTemplate('foreshadowing')
    expect(template?.modules[0]?.payload).toEqual({ items: [] })
  })

  it('creates blank payloads by type', () => {
    expect(createBlankPayload('richtext')).toEqual({ content: '' })
    expect(createBlankPayload('checklist')).toEqual({ items: [] })
    expect(createBlankPayload('table')).toMatchObject({ rows: [] })
  })
})
