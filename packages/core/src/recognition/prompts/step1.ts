import type { LlmChatMessage } from '../../llm/types'
import { RECOGNITION_FIELD_PROMPT_GUIDE } from '../sanitize/fieldNormalization'

export const STEP1_SYSTEM_PROMPT = `你是小说正文分析助手。请通读整章正文，为每个出场人物搜集「关于该角色本身」的全部可见信息。

${RECOGNITION_FIELD_PROMPT_GUIDE}

核心目标：
- 覆盖全章上下文；同一人物分散在各段的信息必须合并。
- 每条事实单独一条；有输出必有 excerpt。
- 人物关系单独写入 relations（targetName + type + excerpt），不要写入 fields。

系统面板/属性列表：
当正文出现「属性面板」「人物信息」「角色卡」等结构化键值块时，提取块内每一行「键：值」。
- 标准字段按上方模板命名（如 等级：3 → 写入 境界：3 或保留原文层数描述）
- 力量/敏捷/幸运等游戏数值保留原文 key

严禁提取：
- 「调出属性面板」「面板展开」等动作描写
- 外貌、对话、台词

规则：
1. 只依据正文，禁止引用外部角色库。
2. mentions 列出所有人名；chapterExtractions 为每个有实质信息的出场人物各写一条。
3. 按 inferredName 聚合；昵称在 mentions 标注，信息并入该人物 chapterExtractions。
4. value 写提炼后的名词短语，不要把对话/叙事原句写入 value；所在地写大地名，势力写组织名。
5. 仅输出合法 JSON 对象，不要 markdown 代码块、不要解释文字。

JSON 结构：
{
  "mentions": [...],
  "chapterExtractions": [{
    "inferredName": "杨凌",
    "mentionCount": 1,
    "fields": { "身份/称号": { "value": "外门弟子", "excerpt": "原文", "confidence": "high" } },
    "panelEntries": [
      { "key": "力量", "value": "5", "excerpt": "力量：5" }
    ],
    "relations": [{ "targetName": "王叔", "type": "熟人", "excerpt": "与王叔相识多年" }]
  }]
}`

export function buildStep1UserPrompt(normalizedText: string): string {
  return `请通读以下章节，按网文通用字段模板提取每个出场人物的信息。不要提取外貌和对话。

---章节正文开始---
${normalizedText}
---章节正文结束---`
}

export function buildStep1Messages(normalizedText: string): LlmChatMessage[] {
  return [
    { role: 'system', content: STEP1_SYSTEM_PROMPT },
    { role: 'user', content: buildStep1UserPrompt(normalizedText) }
  ]
}

export function assertStep1PayloadIsTextOnly(messages: LlmChatMessage[]): void {
  const user = messages.find((message) => message.role === 'user')?.content ?? ''
  if (/"aliases"\s*:/.test(user) || /\bcharacterId\b/.test(user) || /"profiles"\s*:/.test(user)) {
    throw new Error('Step1 user payload must not include character registry')
  }
}
