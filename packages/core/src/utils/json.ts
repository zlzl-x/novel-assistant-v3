function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

function extractFencedJson(raw: string): string | null {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  return match?.[1]?.trim() ?? null
}

function extractBalancedJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index]!
    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') inString = false
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return raw.slice(start, index + 1)
      }
    }
  }

  return null
}

function repairCommonJsonIssues(raw: string): string {
  return raw
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'")
}

export function extractJsonContent(raw: string): unknown {
  const trimmed = stripBom(raw.trim())
  const candidates = [
    trimmed,
    extractFencedJson(trimmed),
    extractBalancedJsonObject(trimmed)
  ].filter((value): value is string => Boolean(value))

  const unique = [...new Set(candidates)]
  let lastError: unknown

  for (const candidate of unique) {
    for (const body of [candidate, repairCommonJsonIssues(candidate)]) {
      try {
        return JSON.parse(body)
      } catch (error) {
        lastError = error
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }
  throw new SyntaxError('无法从模型输出中提取 JSON')
}
