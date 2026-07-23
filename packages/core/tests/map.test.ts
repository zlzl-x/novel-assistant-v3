import { describe, expect, it, vi } from 'vitest'
import {
  buildFallbackMapHtml,
  buildMapCodegenMessages,
  buildTessellatedMapHtml,
  buildTessellationPlates,
  extractRegionsFromDescriptionHeuristic,
  generateMapCode,
  isBoxDominantMapHtml,
  isMapPlateNode,
  isTruncatedMapHtml,
  countRenderableRegions,
  normalizeMapHtml,
  normalizeMapLayout,
  prepareMapCodeFromLlm,
  renderMapLayout,
  sanitizeMapHtml,
  selectMapPlateNodes,
  splitPlateLabel
} from '../src/map'
import { extractHtmlContent } from '../src/utils/html'
import type { MapNode, MapWorld } from '../src/models/map'

const world: MapWorld = {
  id: 'world-1',
  projectId: 'proj-1',
  name: '东洲',
  description: '东洲在西，西荒在东，中间隔万里妖山',
  stylePreset: '水墨仙侠',
  codeVersion: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

const node: MapNode = {
  id: 'node-qingyun',
  worldId: 'world-1',
  parentId: null,
  name: '青云宗',
  type: 'sect',
  summary: '主峰高耸',
  tags: [],
  geo: { relativePosition: '青云山主峰', neighbors: ['node-city'] },
  source: 'manual',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

const layoutJson = {
  viewBox: '0 0 1000 700',
  regions: [
    {
      id: 'node-qingyun',
      name: '青云宗',
      x: 120,
      y: 140,
      width: 160,
      height: 110,
      shape: 'rect' as const
    }
  ]
}

const safeHtml = `<!DOCTYPE html>
<html>
<head><style>body{margin:0;background:#e8eef5}text{font:16px sans-serif;fill:#1e293b}</style></head>
<body>
<svg viewBox="0 0 1000 800">
  <g data-place-id="node-qingyun"><polygon points="0,0 500,0 500,400 0,400" fill="#64748b" stroke="#334155" stroke-width="1"/><text x="250" y="200" text-anchor="middle" dominant-baseline="middle">青云宗</text></g>
</svg>
</body>
</html>`

describe('extractHtmlContent', () => {
  it('extracts fenced html from preamble text', () => {
    const raw = `这是地图代码：\n\`\`\`html\n${safeHtml}\n\`\`\`\n请查收`
    expect(extractHtmlContent(raw)).toContain('<html')
    expect(extractHtmlContent(raw)).toContain('node-qingyun')
  })

  it('extracts html document from mixed output', () => {
    const raw = `说明文字\n${safeHtml}\n结束`
    expect(extractHtmlContent(raw)).toBe(safeHtml)
  })

  it('extracts svg fragment when no html wrapper exists', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect width="10" height="10"/></svg>'
    expect(extractHtmlContent(`前缀\n${svg}\n后缀`)).toBe(svg)
  })
})

describe('normalizeMapHtml', () => {
  it('wraps svg fragment into full html document', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect width="10" height="10"/></svg>'
    const normalized = normalizeMapHtml(svg)
    expect(normalized).toContain('<html')
    expect(normalized).toContain('<body>')
    expect(normalized).toContain(svg)
  })

  it('wraps body fragment into full html document', () => {
    const fragment = '<body><div class="map">fetch valley</div></body>'
    const normalized = normalizeMapHtml(fragment)
    expect(normalized).toContain('<html')
    expect(normalized).toContain('fetch valley')
  })
})

describe('normalizeMapLayout', () => {
  it('fills missing region dimensions with defaults', () => {
    const layout = normalizeMapLayout({
      regions: [{ id: 'region-1', name: '测试' }]
    })
    expect(layout.regions[0]?.width).toBe(140)
    expect(layout.regions[0]?.height).toBe(100)
    expect(layout.regions[0]?.x).toBeGreaterThanOrEqual(0)
    expect(layout.regions[0]?.y).toBeGreaterThanOrEqual(0)
  })
})

describe('renderMapLayout', () => {
  it('outputs data-place-id and passes sanitize', () => {
    const html = renderMapLayout(layoutJson, '水墨仙侠')
    expect(html).toContain('data-place-id="node-qingyun"')
    expect(sanitizeMapHtml(html).ok).toBe(true)
  })
})

describe('buildFallbackMapHtml', () => {
  it('creates regions for nodes', () => {
    const html = buildFallbackMapHtml({ world, nodes: [node] })
    expect(html).toContain('node-qingyun')
    expect(sanitizeMapHtml(html).ok).toBe(true)
  })

  it('creates placeholder regions with no nodes', () => {
    const html = buildFallbackMapHtml({ world, nodes: [] })
    expect(html).toContain('region-1')
    expect(sanitizeMapHtml(html).ok).toBe(true)
  })
})

describe('isBoxDominantMapHtml', () => {
  it('detects rect-only regions', () => {
    const html = `<g data-place-id="a"><rect width="10"/></g><g data-place-id="b"><rect width="10"/></g>`
    expect(isBoxDominantMapHtml(html)).toBe(true)
  })

  it('accepts path-based regions', () => {
    expect(isBoxDominantMapHtml(safeHtml)).toBe(false)
  })
})

describe('countRenderableRegions', () => {
  it('counts regions with path or polygon', () => {
    const html = `<svg><g data-place-id="a"><path d="M0,0"/></g><g data-place-id="b"><rect/></g></svg>`
    expect(countRenderableRegions(html)).toBe(1)
  })
})

describe('isTruncatedMapHtml', () => {
  it('detects incomplete data-place-id attribute', () => {
    const html = '<html><body><svg><g data-place-id="'
    expect(isTruncatedMapHtml(html)).toBe(true)
  })

  it('detects missing closing svg tag', () => {
    const html = '<html><body><svg><path d="M1,1"/></body></html>'
    expect(isTruncatedMapHtml(html)).toBe(true)
  })

  it('accepts complete html', () => {
    expect(isTruncatedMapHtml(safeHtml)).toBe(false)
  })
})

describe('buildMapCodegenMessages', () => {
  it('includes world description and node ids', () => {
    const messages = buildMapCodegenMessages({ world, nodes: [node] })
    expect(messages[1]?.content).toContain('东洲')
    expect(messages[1]?.content).toContain('node-qingyun')
    expect(messages[1]?.content).toContain('青云宗')
  })

  it('asks for geographic map from world description', () => {
    const messages = buildMapCodegenMessages({ world, nodes: [node] })
    expect(messages[0]?.content).toContain('世界说明')
    expect(messages[0]?.content).toContain('万里妖山')
    expect(messages[0]?.content).toContain(':hover')
    expect(messages[1]?.content).toContain('严格遵循')
  })
})

describe('sanitizeMapHtml', () => {
  it('accepts safe inline html', () => {
    const result = sanitizeMapHtml(safeHtml)
    expect(result.ok).toBe(true)
  })

  it('accepts fetch word in body text', () => {
    const html = `<!DOCTYPE html><html><body><p>fetch valley</p></body></html>`
    const result = sanitizeMapHtml(html)
    expect(result.ok).toBe(true)
  })

  it('wraps svg-only output and accepts it', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect width="10" height="10"/></svg>'
    const result = sanitizeMapHtml(svg)
    expect(result.ok).toBe(true)
    expect(result.html).toContain('<html')
  })

  it('rejects external script src', () => {
    const result = sanitizeMapHtml('<html><script src="https://evil.com/a.js"></script><body><svg></svg></body></html>')
    expect(result.ok).toBe(true)
    expect(result.html).not.toContain('evil.com')
  })

  it('strips external images and keeps map html', () => {
    const html = `<!DOCTYPE html><html><body><img src="https://example.com/map.png" /><svg></svg></body></html>`
    const result = sanitizeMapHtml(html)
    expect(result.ok).toBe(true)
    expect(result.html).not.toContain('example.com')
    expect(result.html).toContain('<svg')
  })

  it('removes inline script that uses fetch', () => {
    const result = sanitizeMapHtml('<html><body><script>fetch("/x")</script><svg></svg></body></html>')
    expect(result.ok).toBe(true)
    expect(result.html).not.toContain('fetch(')
  })

  it('strips javascript protocol in attributes', () => {
    const result = sanitizeMapHtml('<html><body><a href="javascript:alert(1)">x</a><svg></svg></body></html>')
    expect(result.ok).toBe(true)
    expect(result.html).not.toContain('javascript:')
  })
})

describe('prepareMapCodeFromLlm', () => {
  it('strips markdown fences and injects bridge', () => {
    const fenced = '```html\n' + safeHtml + '\n```'
    const result = prepareMapCodeFromLlm(fenced)
    expect(result.renderHtml).toContain('place-click')
  })

  it('accepts preamble plus fenced html', () => {
    const raw = `下面是地图：\n\`\`\`html\n${safeHtml}\n\`\`\``
    const result = prepareMapCodeFromLlm(raw)
    expect(result.sanitizedHtml).toContain('node-qingyun')
  })
})

describe('buildTessellatedMapHtml', () => {
  it('tiles plates without gaps', () => {
    const plates = buildTessellationPlates([
      { id: 'a', name: '甲' },
      { id: 'b', name: '乙' },
      { id: 'c', name: '丙' },
      { id: 'd', name: '丁' }
    ])
    expect(plates).toHaveLength(4)
    const first = plates[0]!
    const second = plates[1]!
    expect(first.points.startsWith('0,0')).toBe(true)
    expect(second.points.startsWith(`${first.cellWidth},0`)).toBe(true)
    expect(first.cellWidth).toBeCloseTo(1000 / 3, 5)
    expect(first.cellHeight * 2).toBeCloseTo(700, 5)
  })

  it('excludes building nodes', () => {
    const buildingNode: MapNode = {
      ...node,
      id: 'node-building',
      name: '矿洞',
      type: 'building'
    }
    const html = buildTessellatedMapHtml({ world, nodes: [node, buildingNode] })
    expect(html).toContain('node-qingyun')
    expect(html).not.toContain('node-building')
    expect(selectMapPlateNodes([node, buildingNode])).toHaveLength(1)
    expect(isMapPlateNode(buildingNode)).toBe(false)
  })

  it('wraps long names onto multiple lines', () => {
    expect(splitPlateLabel('火晶岩矿·矿洞·棚区')).toEqual(['火晶岩矿', '矿洞', '棚区'])
    const html = buildTessellatedMapHtml({
      world,
      nodes: [{ ...node, name: '火晶岩矿·矿洞·棚区' }]
    })
    expect(html).toContain('<tspan')
    expect(html).toContain('火晶岩矿')
    expect(html).toContain('棚区')
  })
})

describe('extractRegionsFromDescriptionHeuristic', () => {
  it('extracts bold and numbered region names', () => {
    const description = `
1. 万里妖山
2. **青山城**
3. 火晶岩矿（不含矿道·棚区）
4. 乱石荒原
`
    const regions = extractRegionsFromDescriptionHeuristic(description)
    expect(regions.map((item) => item.name)).toContain('万里妖山')
    expect(regions.map((item) => item.name)).toContain('青山城')
    expect(regions.map((item) => item.name)).toContain('乱石荒原')
    expect(regions.some((item) => item.name.includes('矿道'))).toBe(false)
  })
})

describe('generateMapCode', () => {
  it('generates map html via llm', async () => {
    const complete = vi.fn().mockResolvedValue(safeHtml)

    const result = await generateMapCode({
      world,
      nodes: [node],
      complete
    })

    expect(complete).toHaveBeenCalledTimes(1)
    expect(result.sanitizedHtml).toContain('node-qingyun')
    expect(result.sanitizedHtml).toContain('<polygon')
  })

  it('retries when html is truncated', async () => {
    const truncated = '<html><body><svg><g data-place-id="'
    const complete = vi.fn().mockResolvedValueOnce(truncated).mockResolvedValueOnce(safeHtml)

    const result = await generateMapCode({ world, nodes: [node], complete })

    expect(complete).toHaveBeenCalledTimes(2)
    expect(result.sanitizedHtml).toContain('node-qingyun')
  })

  it('throws when llm fails', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('network'))

    await expect(generateMapCode({ world, nodes: [node], complete })).rejects.toThrow('network')
  })
})
