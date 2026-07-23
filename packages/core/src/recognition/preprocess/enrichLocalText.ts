import type { Step1LlmResponse } from '../schemas/step1'
import {
  extractInlineFactsFromText,
  mergeInlineFactsIntoStep1Response
} from './extractInlineFacts'
import {
  mergeLocalPanelsIntoStep1Response,
  parseAttributePanelsFromText
} from './parseAttributePanels'

/** 将本地正则补抓结果合并进 Step1 LLM 响应（在清洗前一次性完成） */
export function enrichStep1FromLocalText(
  text: string,
  response: Step1LlmResponse
): Step1LlmResponse {
  const localPanels = parseAttributePanelsFromText(text)
  const inlineFacts = extractInlineFactsFromText(text)
  const withPanels = mergeLocalPanelsIntoStep1Response(response, localPanels)
  return mergeInlineFactsIntoStep1Response(withPanels, inlineFacts)
}
