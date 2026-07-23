/** 不入预览/角色字段、改由关系网或其它模块承载的键 */

const EXCLUDED_PREVIEW_FIELD_KEYS = new Set([
  '状态',
  '关系',
  '外貌',
  '长相',
  '容貌',
  '外形',
  '样貌',
  '对话',
  '台词'
])

const EXCLUDED_PREVIEW_FIELD_PATTERNS = [/^与主角关系/, /^(外貌|长相|容貌|外形|对话|台词)/]

export function isExcludedPreviewFieldKey(key: string): boolean {
  const trimmed = key.trim()
  if (!trimmed) return true
  if (EXCLUDED_PREVIEW_FIELD_KEYS.has(trimmed)) return true
  return EXCLUDED_PREVIEW_FIELD_PATTERNS.some((pattern) => pattern.test(trimmed))
}
