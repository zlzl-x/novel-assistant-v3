/** 正文字数统计：去除空白字符 */
export function countWords(text: string): number {
  return text.replace(/\s+/g, '').length
}
