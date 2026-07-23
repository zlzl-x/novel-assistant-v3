import type {
  ChecklistPayload,
  RichTextPayload,
  SettingModule,
  TablePayload
} from '../models/setting'

export function moduleMatchesSearch(module: SettingModule, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  if (module.title.toLowerCase().includes(normalized)) return true

  const payload = module.payload
  if (isRichTextPayload(payload) && payload.content.toLowerCase().includes(normalized)) {
    return true
  }
  if (isChecklistPayload(payload)) {
    return payload.items.some((item) => item.text.toLowerCase().includes(normalized))
  }
  if (isTablePayload(payload)) {
    if (payload.columns.some((column) => column.name.toLowerCase().includes(normalized))) {
      return true
    }
    return payload.rows.some((row) =>
      Object.values(row).some((value) => String(value).toLowerCase().includes(normalized))
    )
  }
  return false
}

function isRichTextPayload(payload: SettingModule['payload']): payload is RichTextPayload {
  return typeof (payload as RichTextPayload).content === 'string'
}

function isChecklistPayload(payload: SettingModule['payload']): payload is ChecklistPayload {
  return Array.isArray((payload as ChecklistPayload).items)
}

function isTablePayload(payload: SettingModule['payload']): payload is TablePayload {
  return (
    Array.isArray((payload as TablePayload).columns) &&
    Array.isArray((payload as TablePayload).rows)
  )
}
