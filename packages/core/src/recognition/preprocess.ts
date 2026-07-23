const AD_LINE_PATTERNS = [
  /^本章完[。.!！]?$/,
  /^请收藏/,
  /^求推荐票/,
  /^手机用户请浏览/,
  /^www\./i,
  /^https?:\/\//i
]

export function normalizeText(text: string): string {
  const withoutBom = text.replace(/^\uFEFF/, '')
  const unifiedNewlines = withoutBom.replace(/\r\n?/g, '\n')
  const lines = unifiedNewlines.split('\n').map((line) => line.trimEnd())
  const filtered = lines.filter((line) => {
    const trimmed = line.trim()
    if (!trimmed) return true
    return !AD_LINE_PATTERNS.some((pattern) => pattern.test(trimmed))
  })
  return filtered.join('\n').trim()
}

export async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
