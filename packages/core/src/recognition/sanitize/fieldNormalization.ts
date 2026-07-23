import type { ExtractedField } from '../../models/recognition'
import { RECOGNITION_FIELD_KEYS } from '../../constants'

/** 网文通用标准字段（优先使用这些 key，其余数值类可自由发挥） */
export const STANDARD_RECOGNITION_FIELD_NAMES = [
  '身份/称号',
  '境界',
  '职业',
  '所在地',
  '势力',
  '功法/技能',
  '法宝/装备',
  '年龄/寿命'
] as const

const STANDARD_FIELD_SET = new Set<string>([
  ...RECOGNITION_FIELD_KEYS,
  ...STANDARD_RECOGNITION_FIELD_NAMES,
  '职业'
])

const DROPPED_FIELD_KEYS = new Set([
  '外貌',
  '长相',
  '容貌',
  '外形',
  '样貌',
  '面容',
  '相貌',
  '对话',
  '台词',
  '对白',
  '语录'
])

const FIELD_KEY_ALIASES: Record<string, string> = {
  身份: '身份/称号',
  称号: '身份/称号',
  背景: '身份/称号',
  '身份/背景': '身份/称号',
  修为: '境界',
  等级: '境界',
  level: '境界',
  Level: '境界',
  LV: '境界',
  Lv: '境界',
  功法: '功法/技能',
  技能: '功法/技能',
  装备: '法宝/装备',
  法宝: '法宝/装备',
  武器: '法宝/装备',
  年龄: '年龄/寿命',
  寿命: '年龄/寿命'
}

export const RECOGNITION_FIELD_PROMPT_GUIDE = `标准字段（优先使用，不要自创同义 key）：
- 身份/称号：门派职位、官职、江湖绰号、出身背景（合并「身份」「背景」「称号」等）
- 境界：修为/等级/层数（合并「等级」「修为」「Lv」等，统一写入「境界」）
- 职业：职业、工种、身份职业（如矿工、剑客）
- 所在地：可复用的地名（城/山/矿/宗门/秘境名），如「火晶岩矿」「青云宗」
- 势力：组织/门派/家族/国家/阵营名称，如「赵家」「青云宗外门」
- 功法/技能、法宝/装备、年龄/寿命

value 填写规范（像人类编辑，不要照搬句子）：
- value 必须是简短名词短语，通常 ≤12 字；excerpt 引用原文依据，value 要提炼
- 所在地禁止填「矿脉出口」「洞口」「门口」「洞内」等临时方位词；应填所属大地名
- 势力禁止填「与某人合作/联手」等人际描述；这应写入 relations（targetName + type）
- 禁止把对话、叙事、动作描写写入任何 field 的 value

反例（禁止输出）：
❌ 所在地=矿脉出口 → 应写「火晶岩矿」
❌ 势力=与牛管事合作 → 应写 relations: { targetName:"牛管事", type:"合作" }
❌ value=赵侯微笑道："你可以多看几眼…" → 这是对话，整条丢弃

禁止提取：外貌/长相/容貌、对话/台词、临时状态。
游戏面板中的力量/敏捷/幸运等数值属性：保留原文 key 作为自由字段。
关系写入 relations，不要写入 fields。`

export function isDroppedFieldKey(key: string): boolean {
  const trimmed = key.trim()
  if (!trimmed) return true
  if (DROPPED_FIELD_KEYS.has(trimmed)) return true
  if (/^(外貌|长相|容貌|外形|样貌|对话|台词)/.test(trimmed)) return true
  if (isDialogueLike(trimmed)) return true
  return false
}

export function isStandardRecognitionField(key: string): boolean {
  return STANDARD_FIELD_SET.has(key) && key !== '状态' && key !== '关系'
}

export function normalizeFieldKey(key: string): string | null {
  const trimmed = key.trim()
  if (!trimmed || isDroppedFieldKey(trimmed)) return null
  return FIELD_KEY_ALIASES[trimmed] ?? trimmed
}

export function isDialogueLike(value: string, excerpt?: string): boolean {
  const trimmedValue = value.trim()
  if (!trimmedValue) return false

  if (/^[「『"“‘'].+[」』"”’']$/.test(trimmedValue)) return true
  if (/^(?:说|道|问|答|喊|叫|笑道|沉声道|冷冷道|喝道|怒道|微笑道)/.test(trimmedValue)) return true
  if (/^[\u4e00-\u9fa5]{1,6}(?:微笑|冷冷|沉声|轻声|淡淡|冷声)?[说道问答喊叫喝怒]道[：:]/.test(trimmedValue)) {
    return true
  }
  if (/^[\u4e00-\u9fa5]{1,10}[说道问答喊叫喝怒笑冷淡]道$/.test(trimmedValue)) {
    return true
  }
  if (trimmedValue.length >= 6 && /[说道问答喊叫喝怒]道[：:]\s*[「"'"']/.test(trimmedValue)) {
    return true
  }

  const combined = `${trimmedValue} ${excerpt ?? ''}`
  if (/[「『"“''].+[」』"”'']/.test(combined) && trimmedValue.length >= 6) return true
  if (/[说道问答喊叫笑道沉声冷冷喝怒微笑]道[：:]["「『'']/.test(combined)) return true
  if (trimmedValue.length > 20 && /[，。！？；]/.test(trimmedValue)) return true
  if (trimmedValue.length > 10 && /[「』"”'']/.test(trimmedValue)) return true
  return false
}

export function shouldDropRecognitionEntry(key: string, value: string, excerpt?: string): boolean {
  const trimmedKey = key.trim()
  const trimmedValue = value.trim()
  const trimmedExcerpt = (excerpt?.trim() || trimmedValue).trim()
  if (!trimmedKey && !trimmedValue) return true
  if (isDroppedFieldKey(trimmedKey)) return true
  if (isDialogueLike(trimmedKey, trimmedExcerpt)) return true
  if (trimmedValue && isDialogueLike(trimmedValue, trimmedExcerpt)) return true
  return false
}

const WEAK_LOCATION_PATTERN =
  /(?:出口|入口|门口|洞口|洞内|路上|一旁|附近|尽头|拐角|转角|深处|外围|内侧|外侧|前方|后方|左侧|右侧)$/

const PROPER_LOCATION_PATTERN = /[市县镇村庄国郡州府岛山湖海江河峰谷林原矿洞府秘境宗门寨堡营]$/

export function isInvalidFactionValue(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (/^与.+/.test(trimmed)) return true
  if (/合作|联手|结交|同盟|同伙|搭档/.test(trimmed) && !/[国朝宗门家族帮会堂殿阁院]$/.test(trimmed)) {
    return true
  }
  return false
}

export function isWeakLocationValue(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (WEAK_LOCATION_PATTERN.test(trimmed)) return true
  if (trimmed.length <= 3 && /[内外上下前后左右]/.test(trimmed)) return true
  return false
}

function scoreLocationValue(value: string): number {
  let score = value.length
  if (PROPER_LOCATION_PATTERN.test(value)) score += 18
  if (WEAK_LOCATION_PATTERN.test(value)) score -= 35
  if (value.length <= 4 && /[内外上下前后左右]/.test(value)) score -= 20
  return score
}

function scoreFactionValue(value: string): number {
  let score = value.length
  if (isInvalidFactionValue(value)) score -= 50
  if (/[国朝宗门家族帮会堂殿阁院寨堡]$/.test(value)) score += 15
  return score
}

function scoreFieldValue(canonicalKey: string, value: string): number {
  let score = value.length
  if (canonicalKey === '境界') {
    if (/[练筑金丹元婴化神渡劫天人]/.test(value)) score += 20
    if (/层|期|阶|段|重/.test(value)) score += 10
    if (/^\d+$/.test(value)) score -= 5
  }
  if (canonicalKey === '身份/称号' && value.length >= 2) score += 2
  if (canonicalKey === '所在地') score += scoreLocationValue(value)
  if (canonicalKey === '势力') score += scoreFactionValue(value)
  return score
}

export function isInvalidFieldValue(canonicalKey: string, value: string, excerpt?: string): boolean {
  if (isDialogueLike(value, excerpt)) return true
  if (canonicalKey === '势力' && isInvalidFactionValue(value)) return true
  if (canonicalKey === '所在地' && isWeakLocationValue(value)) return true
  return false
}

export function pickBetterExtractedField(
  canonicalKey: string,
  existing: ExtractedField,
  incoming: ExtractedField
): ExtractedField {
  const existingScore = scoreFieldValue(canonicalKey, existing.value)
  const incomingScore = scoreFieldValue(canonicalKey, incoming.value)
  if (incomingScore > existingScore) return incoming
  if (existingScore > incomingScore) return existing
  if (incoming.confidence === 'high' && existing.confidence !== 'high') return incoming
  return existing
}

export function normalizeExtractedFields(
  entries: Array<{ key: string; field: ExtractedField }>
): { fields: Record<string, ExtractedField>; panelEntries: Array<{ key: string; value: string; excerpt: string }> } {
  const merged = new Map<string, ExtractedField>()

  for (const { key, field } of entries) {
    const trimmedValue = field.value?.trim() ?? ''
    const trimmedExcerpt = (field.excerpt?.trim() || trimmedValue).trim()
    if (shouldDropRecognitionEntry(key, trimmedValue, trimmedExcerpt)) continue
    if (!trimmedValue) continue

    const canonical = normalizeFieldKey(key)
    if (!canonical) continue
    if (isInvalidFieldValue(canonical, trimmedValue, trimmedExcerpt)) continue

    const next: ExtractedField = {
      value: trimmedValue,
      excerpt: trimmedExcerpt,
      confidence: field.confidence ?? 'medium'
    }
    const existing = merged.get(canonical)
    merged.set(canonical, existing ? pickBetterExtractedField(canonical, existing, next) : next)
  }

  const fields: Record<string, ExtractedField> = {}
  const panelEntries: Array<{ key: string; value: string; excerpt: string }> = []

  for (const [key, field] of merged) {
    if (isStandardRecognitionField(key)) {
      fields[key] = field
    } else {
      panelEntries.push({ key, value: field.value, excerpt: field.excerpt })
    }
  }

  return { fields, panelEntries }
}
