function extractMarkdownCodeBlock(raw: string): string | null {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)\s*```/i)
  return fenced ? fenced[1]!.trim() : null
}

function extractHtmlDocument(raw: string): string | null {
  const doctypeMatch = raw.match(/<!DOCTYPE[\s\S]*?(?:<\/html>|$)/i)
  if (doctypeMatch) return doctypeMatch[0].trim()

  const htmlMatch = raw.match(/<html[\s\S]*?(?:<\/html>|$)/i)
  if (htmlMatch) return htmlMatch[0].trim()

  return null
}

function extractSvgFragment(raw: string): string | null {
  const svgMatch = raw.match(/<svg[\s\S]*?<\/svg>/i)
  return svgMatch ? svgMatch[0].trim() : null
}

export function extractHtmlContent(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed

  const fromFence = extractMarkdownCodeBlock(trimmed)
  if (fromFence) {
    const documentFromFence = extractHtmlDocument(fromFence)
    if (documentFromFence) return documentFromFence
    const svgFromFence = extractSvgFragment(fromFence)
    if (svgFromFence) return svgFromFence
    return fromFence
  }

  const document = extractHtmlDocument(trimmed)
  if (document) return document

  const svg = extractSvgFragment(trimmed)
  if (svg) return svg

  return trimmed
}
