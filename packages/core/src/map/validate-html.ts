/**
 * Detect maps that rely too heavily on plain rectangles instead of organic outlines.
 */
export function isBoxDominantMapHtml(html: string): boolean {
  const regionBlocks = html.match(/data-place-id\s*=\s*["'][^"']+["'][^>]*>[\s\S]*?<\/g>/gi) ?? []
  if (regionBlocks.length === 0) {
    const rectCount = (html.match(/<rect\b/gi) ?? []).length
    const pathCount = (html.match(/<path\b/gi) ?? []).length
    const polygonCount = (html.match(/<polygon\b/gi) ?? []).length
    return rectCount >= 2 && pathCount + polygonCount === 0
  }

  let boxRegions = 0
  for (const block of regionBlocks) {
    const hasPath = /<path\b/i.test(block)
    const hasPolygon = /<polygon\b/i.test(block)
    const hasRect = /<rect\b/i.test(block)
    if (hasRect && !hasPath && !hasPolygon) {
      boxRegions += 1
    }
  }

  return boxRegions >= Math.max(2, Math.ceil(regionBlocks.length * 0.5))
}

export function countRenderableRegions(html: string): number {
  const blocks = html.match(/<g[^>]*data-place-id[\s\S]*?<\/g>/gi) ?? []
  return blocks.filter((block) => /<path\b|<polygon\b/i.test(block)).length
}

export function assertHasRenderableRegions(html: string, minRegions = 1): void {
  const count = countRenderableRegions(html)
  if (count < minRegions) {
    throw new Error(
      `地图缺少可渲染区域（仅检测到 ${count} 个含 path/polygon 的地点，至少需要 ${minRegions} 个）`
    )
  }
}

export function isTruncatedMapHtml(html: string): boolean {
  const trimmed = html.trim()
  if (!trimmed) return true
  if (/data-place-id\s*=\s*["'][^"']*$/m.test(trimmed)) return true
  if (/<[^>]+$/m.test(trimmed)) return true

  const svgOpen = (trimmed.match(/<svg\b/gi) ?? []).length
  const svgClose = (trimmed.match(/<\/svg>/gi) ?? []).length
  if (svgOpen > svgClose) return true

  if (/<html\b/i.test(trimmed) && !/<\/html>/i.test(trimmed)) return true
  if (/<body\b/i.test(trimmed) && !/<\/body>/i.test(trimmed)) return true

  const placeIdCount = (trimmed.match(/data-place-id\s*=/gi) ?? []).length
  const closedRegionCount = (trimmed.match(/<g[^>]*data-place-id[\s\S]*?<\/g>/gi) ?? []).length
  if (placeIdCount > 0 && closedRegionCount < placeIdCount) return true

  return false
}

export function repairTruncatedMapHtml(html: string): string {
  let result = html.trim()
  result = result.replace(/data-place-id\s*=\s*["'][^"']*$/m, 'data-place-id="truncated-region"')
  result = result.replace(/<[^>]*$/m, '')

  const gOpen = (result.match(/<g\b/gi) ?? []).length
  const gClose = (result.match(/<\/g>/gi) ?? []).length
  const closers: string[] = []
  for (let i = 0; i < gOpen - gClose; i += 1) {
    closers.push('</g>')
  }
  if (/<svg\b/i.test(result) && !/<\/svg>/i.test(result)) closers.push('</svg>')
  if (/<body\b/i.test(result) && !/<\/body>/i.test(result)) closers.push('</body>')
  if (/<html\b/i.test(result) && !/<\/html>/i.test(result)) closers.push('</html>')

  return `${result}\n${closers.join('\n')}`
}

export function buildMapHtmlRetryMessage(error: Error): string {
  if (error.message.includes('截断') || error.message.includes('不完整')) {
    return `${error.message} 请精简 CSS，优先用 <polygon> 画完全部地点板块，总长度控制在 120 行内，必须输出完整 </svg></body></html>。`
  }
  if (error.message.includes('方框') || error.message.includes('矩形')) {
    return `${error.message} 请改用 SVG <polygon> 拼成无缝拼图，板块紧密相邻不留空隙。`
  }
  return `上次输出未通过校验：${error.message}。请只输出修复后的完整 HTML，不要解释，不要 markdown 围栏。`
}
