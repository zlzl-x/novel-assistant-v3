export interface SanitizeMapHtmlResult {
  ok: boolean
  html: string
  error?: string
}

const SCRIPT_DANGEROUS_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bfetch\s*\(/i, message: '禁止使用 fetch' },
  { pattern: /\bXMLHttpRequest\b/i, message: '禁止使用 XMLHttpRequest' },
  { pattern: /\beval\s*\(/i, message: '禁止使用 eval' }
]

const HTML_FRAGMENT_PATTERN =
  /<(?:html|head|body|svg|div|section|main|article|style|script|g|path|rect|circle|polygon|text)\b/i

function extractInlineScripts(html: string): string[] {
  const scripts: string[] = []
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    scripts.push(match[1] ?? '')
  }
  return scripts
}

function hasDangerousInlineScript(html: string): string | null {
  for (const script of extractInlineScripts(html)) {
    for (const rule of SCRIPT_DANGEROUS_PATTERNS) {
      if (rule.pattern.test(script)) {
        return rule.message
      }
    }
  }
  return null
}

export function repairMapHtml(html: string): string {
  let result = html

  result = result.replace(/<script\b[^>]*\bsrc\s*=[^>]*>[\s\S]*?<\/script>/gi, '')
  result = result.replace(/<script\b[^>]*\bsrc\s*=[^>]*\/?>/gi, '')
  result = result.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
  result = result.replace(/<object\b[\s\S]*?<\/object>/gi, '')
  result = result.replace(/<embed\b[^>]*\/?>/gi, '')
  result = result.replace(/<link\b[^>]*href\s*=\s*["']https?:[^"']*["'][^>]*\/?>/gi, '')
  result = result.replace(/<img\b[^>]*src\s*=\s*["']https?:[^"']*["'][^>]*\/?>/gi, '')
  result = result.replace(/\s(?:href|src|xlink:href)\s*=\s*["']javascript:[^"']*["']/gi, '')

  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    const contentMatch = block.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)
    const content = contentMatch?.[1] ?? ''
    if (hasDangerousInlineScript(`<script>${content}</script>`)) {
      return ''
    }
    return block
  })

  return result.trim()
}

export function normalizeMapHtml(html: string): string {
  const normalized = html.trim()
  if (!normalized) return normalized
  if (/<html[\s>]/i.test(normalized)) return normalized

  if (/<svg[\s>]/i.test(normalized)) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
${normalized}
</body>
</html>`
  }

  if (HTML_FRAGMENT_PATTERN.test(normalized)) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
${normalized}
</body>
</html>`
  }

  return normalized
}

export function sanitizeMapHtml(html: string): SanitizeMapHtmlResult {
  const normalized = normalizeMapHtml(html.trim())
  if (!normalized) {
    return { ok: false, html: '', error: 'HTML 为空' }
  }

  const repaired = repairMapHtml(normalized)
  if (!repaired) {
    return { ok: false, html: '', error: 'HTML 为空' }
  }

  if (!/<html[\s>]/i.test(repaired) && !/<svg[\s>]/i.test(repaired)) {
    return { ok: false, html: '', error: '输出必须是完整 HTML 或包含 SVG' }
  }

  if (/<script[^>]*\ssrc\s*=/i.test(repaired)) {
    return { ok: false, html: '', error: '禁止外链脚本' }
  }
  if (/<iframe\b/i.test(repaired)) {
    return { ok: false, html: '', error: '禁止嵌套 iframe' }
  }
  if (/<object\b/i.test(repaired)) {
    return { ok: false, html: '', error: '禁止 object 标签' }
  }
  if (/<embed\b/i.test(repaired)) {
    return { ok: false, html: '', error: '禁止 embed 标签' }
  }
  if (/javascript:/i.test(repaired)) {
    return { ok: false, html: '', error: '禁止 javascript: 协议' }
  }

  const dangerousScript = hasDangerousInlineScript(repaired)
  if (dangerousScript) {
    return { ok: false, html: '', error: dangerousScript }
  }

  return { ok: true, html: repaired }
}

export function injectMapBridge(html: string): string {
  const bridge = `
<style>
  [data-place-id].map-highlight path,
  [data-place-id].map-highlight polygon,
  .region.map-highlight path,
  .region.map-highlight polygon {
    stroke: #f59e0b !important;
    stroke-width: 4 !important;
    filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
  }
  [data-place-id].dimmed,
  .region.dimmed {
    opacity: 0.45;
  }
</style>
<script>
  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'highlight') return;
    var nodes = document.querySelectorAll('[data-place-id], .region');
    nodes.forEach(function (node) {
      node.classList.remove('map-highlight');
      node.classList.remove('dimmed');
    });
    if (!event.data.placeId) return;
    var target = document.querySelector('[data-place-id="' + event.data.placeId + '"]');
    if (!target) return;
    target.classList.add('map-highlight');
    nodes.forEach(function (node) {
      if (node !== target) node.classList.add('dimmed');
    });
  });
  document.addEventListener('click', function (event) {
    var node = event.target.closest('[data-place-id]');
    if (!node) return;
    parent.postMessage({ type: 'place-click', placeId: node.getAttribute('data-place-id') }, '*');
  });
</script>`

  if (html.includes('</body>')) {
    return html.replace('</body>', `${bridge}</body>`)
  }
  return `${html}${bridge}`
}
