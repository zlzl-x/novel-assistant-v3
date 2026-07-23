/** 过滤明显不是人名的 mention / extraction 名称 */

const NON_CHARACTER_NAMES = new Set([
  '随后',
  '然后',
  '此时',
  '于是',
  '接着',
  '同时',
  '不久',
  '片刻',
  '当下',
  '只见',
  '忽然',
  '突然',
  '众人',
  '有人',
  '某人',
  '自己',
  '他们',
  '她们',
  '我们',
  '你们',
  '对方',
  '此人',
  '那人'
])

export function isPlausibleCharacterName(name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2 || trimmed.length > 8) return false
  if (NON_CHARACTER_NAMES.has(trimmed)) return false
  if (!/^[\u4e00-\u9fa5·]+$/.test(trimmed)) return false
  return true
}
