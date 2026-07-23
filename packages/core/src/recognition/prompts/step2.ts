import type { LlmChatMessage } from '../../llm/types'
import type { Character } from '../../models/character'
import type { ChapterExtraction } from '../../models/recognition'
import { RECOGNITION_FIELD_PROMPT_GUIDE } from '../sanitize/fieldNormalization'

export const STEP2_SYSTEM_PROMPT = `你是小说角色资料整合助手。根据「角色库已有资料」与「本章提取」，输出整合后的完整角色资料。

${RECOGNITION_FIELD_PROMPT_GUIDE}

规则：
1. 输出整合后的完整 fields 与 panelEntries：本章未提及的字段保留旧值；本章与旧值冲突时以本章为准并附 excerpt。
2. 所在地：若本章仅出现「出口/门口/洞内」等方位词，保留旧的地名，不要用方位词覆盖「火晶岩矿」这类正式地名。
3. 势力：只写组织名；「与某人合作」等人际关系写入 relations，不要写入势力。
4. value 必须是简短名词短语，禁止把对话或整句叙事写入 value；excerpt 引用原文。
5. 每个输出字段必须附 excerpt（来自本章提取；保留旧值时可沿用旧 excerpt 或注明「沿用角色库」）。
6. 人物关系只写入 relations 数组，不要写入 fields 或 panelEntries。
7. 与主角的关系也写入 relations，targetName 为主角姓名，type 为关系类型（师徒/同门/盟友等）。
8. 标准字段使用统一 key；游戏数值类（力量/敏捷等）可保留原文 key。
9. 不要输出外貌、对话、与主角关系远近等已废弃字段。
10. 只输出 JSON，不要 markdown 代码块。`

export interface Step2PromptInput {
  character: Character
  chapterExtraction: ChapterExtraction | null
  mentionCount: number
  protagonistName?: string | null
}

function truncate(value: string, max = 500): string {
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

function serializeCharacterSnapshot(character: Character): Record<string, unknown> {
  return {
    characterId: character.id,
    name: character.name,
    disambiguation: character.disambiguation,
    role: character.role,
    currentFields: {
      '身份/称号': truncate(character.identity.current),
      境界: truncate(character.realm.current),
      职业: truncate(character.panel.entries.find((entry) => entry.key === '职业')?.value ?? ''),
      所在地: truncate(character.location.current),
      势力: character.faction ? truncate(character.faction.current) : ''
    },
    panelEntries: character.panel.entries
      .filter((entry) => entry.key !== '职业')
      .map((entry) => ({
        key: entry.key,
        value: truncate(entry.value)
      })),
    existingRelations: character.relations.map((relation) => ({
      targetCharacterId: relation.targetCharacterId,
      type: relation.type,
      strength: relation.strength,
      label: relation.label
    }))
  }
}

export function buildStep2UserPrompt(input: Step2PromptInput): string {
  const snapshot = serializeCharacterSnapshot(input.character)
  const extraction = input.chapterExtraction ?? {
    inferredName: input.character.name,
    mentionCount: input.mentionCount,
    fields: {}
  }

  const protagonistHint = input.protagonistName
    ? `\n主角姓名：${input.protagonistName}（与主角的关系写入 relations，targetName 填主角名）`
    : ''

  return `请整合以下单角色资料。禁止参考其他角色。不要输出外貌和对话。${protagonistHint}

角色库已有（完整资料，仅此一人）：
${JSON.stringify(snapshot, null, 2)}

本章提取（Step 1）：
${JSON.stringify(extraction, null, 2)}

输出 JSON（整合后的完整资料，非增量）：
{
  "mentionCount": ${input.mentionCount},
  "fields": { "境界": { "value": "...", "excerpt": "...", "confidence": "high" } },
  "panelEntries": [{ "key": "力量", "value": "...", "excerpt": "..." }],
  "relations": [{ "targetName": "...", "type": "...", "excerpt": "..." }]
}`
}

export function buildStep2Messages(input: Step2PromptInput): LlmChatMessage[] {
  return [
    { role: 'system', content: STEP2_SYSTEM_PROMPT },
    { role: 'user', content: buildStep2UserPrompt(input) }
  ]
}

export function assertStep2PayloadIsSingleCharacter(
  messages: LlmChatMessage[],
  characterId: string
): void {
  const user = messages.find((message) => message.role === 'user')?.content ?? ''
  if (!user.includes(characterId)) {
    throw new Error('Step2 payload must include target characterId')
  }
  const idMatches = user.match(/"characterId"\s*:\s*"[^"]+"/g) ?? []
  const foreignIds = idMatches.filter((match) => !match.includes(characterId))
  if (foreignIds.length > 0) {
    throw new Error('Step2 payload must not include other character snapshots')
  }
}
