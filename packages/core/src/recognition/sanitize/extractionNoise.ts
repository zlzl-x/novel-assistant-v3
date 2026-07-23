/** 过滤叙事/UI 元信息，保留角色真实属性 */

const NOISE_VALUE_PATTERNS = [
  /能查看.*面板/,
  /^属性面板$/,
  /^面板展开$/,
  /在他面前展开$/,
  /^系统提示$/,
  /弹出了?面板$/,
  /打开了?面板$/,
  /^NPC$/i
]

const NOISE_KEY_PATTERNS = [/^面板$/, /^系统$/, /^UI$/i, /^界面$/]

/** 含具体数值/实义内容的字段，不因 excerpt 含「面板」而丢弃 */
const PROTECTED_FIELD_KEYS =
  /^(职业|等级|力量|敏捷|精神|智力|体质|魅力|幸运|生命|生命值|HP|MP|魔法|攻击|防御|境界|修为|自由属性点|属性点|金币|金钱|装备|技能|身份|称号|所在地|势力|年龄|性别|种族)/

export function isNoiseExtraction(key: string, value: string, excerpt: string): boolean {
  const trimmedKey = key.trim()
  const trimmedValue = value.trim()
  const trimmedExcerpt = excerpt.trim()

  if (PROTECTED_FIELD_KEYS.test(trimmedKey)) {
    return NOISE_VALUE_PATTERNS.some((pattern) => pattern.test(trimmedValue))
  }

  if (NOISE_VALUE_PATTERNS.some((pattern) => pattern.test(trimmedValue))) return true
  if (NOISE_KEY_PATTERNS.some((pattern) => pattern.test(trimmedKey))) return true
  if (trimmedValue.length <= 1 && !/\d/.test(trimmedValue)) return true
  if (/^(能|可以|得以).{0,8}(查看|看到|打开)/.test(trimmedValue)) return true
  return false
}
