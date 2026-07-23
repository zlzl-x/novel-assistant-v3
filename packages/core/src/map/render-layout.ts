import type { MapLayout, MapRegionLayout } from './layout-schema'

const KIND_TONES: Record<string, { fill: string; stroke: string }> = {
  mountain: { fill: '#166534', stroke: '#14532d' },
  wilderness: { fill: '#ca8a04', stroke: '#a16207' },
  river: { fill: '#0284c7', stroke: '#0369a1' },
  city: { fill: '#64748b', stroke: '#475569' },
  mine: { fill: '#ea580c', stroke: '#c2410c' },
  sect: { fill: '#7c3aed', stroke: '#6d28d9' },
  building: { fill: '#b45309', stroke: '#92400e' },
  country: { fill: '#0f766e', stroke: '#115e59' },
  continent: { fill: '#1d4ed8', stroke: '#1e40af' },
  other: { fill: '#64748b', stroke: '#475569' }
}

const DEFAULT_TONES = ['#64748b', '#0f766e', '#b45309', '#7c3aed', '#be123c', '#0369a1', '#4d7c0f', '#9a3412']

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function regionColors(region: MapRegionLayout, index: number): { fill: string; stroke: string } {
  if (region.tone) {
    return { fill: region.tone, stroke: '#1e293b' }
  }
  const kind = region.kind ?? 'other'
  return KIND_TONES[kind] ?? { fill: DEFAULT_TONES[index % DEFAULT_TONES.length]!, stroke: '#1e293b' }
}

/** Deterministic pseudo-random from string seed */
function hashSeed(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function organicLandPath(region: MapRegionLayout): string {
  const cx = region.x + region.width / 2
  const cy = region.y + region.height / 2
  const rx = region.width / 2
  const ry = region.height / 2
  const seed = hashSeed(region.id)
  const points = 10
  const coords: Array<{ x: number; y: number }> = []

  for (let i = 0; i < points; i += 1) {
    const angle = (Math.PI * 2 * i) / points
    const wobble = 0.72 + (((seed + i * 17) % 100) / 100) * 0.45
    coords.push({
      x: cx + Math.cos(angle) * rx * wobble,
      y: cy + Math.sin(angle) * ry * wobble
    })
  }

  const [first, ...rest] = coords
  if (!first) return ''
  const line = rest.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  return `M ${first.x.toFixed(1)} ${first.y.toFixed(1)} ${line} Z`
}

function renderDefs(layout: MapLayout, stylePreset?: string | null): string {
  const isInk = stylePreset?.includes('水墨')
  const sky = isInk ? '#e8eef5' : '#dbeafe'
  const ground = isInk ? '#d4e4d2' : '#ecfccb'

  const gradients = layout.regions
    .map((region, index) => {
      const { fill, stroke } = regionColors(region, index)
      const id = `grad-${index}`
      return `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${fill}" stop-opacity="0.95"/>
        <stop offset="55%" stop-color="${fill}" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="${stroke}" stop-opacity="0.9"/>
      </linearGradient>`
    })
    .join('\n')

  return `<defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${sky}"/>
      <stop offset="45%" stop-color="${ground}"/>
      <stop offset="100%" stop-color="#d6d3c4"/>
    </linearGradient>
    <filter id="region-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="highlight-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    ${gradients}
  </defs>`
}

function renderBackground(): string {
  return `<rect x="0" y="0" width="1000" height="700" fill="url(#bg-gradient)"/>
  <path d="M0,520 C180,480 260,560 420,500 C580,440 700,520 1000,470 L1000,700 L0,700 Z" fill="#94a3b8" fill-opacity="0.18"/>
  <path d="M0,580 C220,540 340,600 520,560 C700,520 820,590 1000,550 L1000,700 L0,700 Z" fill="#78716c" fill-opacity="0.12"/>`
}

function renderRegion(region: MapRegionLayout, index: number): string {
  const { stroke } = regionColors(region, index)
  const gradId = `grad-${index}`
  const labelX = region.x + region.width / 2
  const labelY = region.y + region.height / 2
  const groupId = escapeXml(region.id)

  let land = ''
  if (region.kind === 'river') {
    const y = region.y + region.height / 2
    land = `<path class="region-shape" d="M ${region.x} ${y} Q ${region.x + region.width * 0.35} ${y - 28} ${region.x + region.width * 0.5} ${y} T ${region.x + region.width} ${y + 12}" fill="none" stroke="url(#${gradId})" stroke-width="${Math.max(14, region.height * 0.6)}" stroke-linecap="round" opacity="0.88"/>`
  } else {
    land = `<path class="region-shape" d="${organicLandPath(region)}" fill="url(#${gradId})" stroke="${stroke}" stroke-width="2.5" stroke-linejoin="round"/>`
  }

  return `<g data-place-id="${groupId}" class="map-region region" role="button" tabindex="0">
  ${land}
  <text class="region-label" x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="700" font-family="'Microsoft YaHei', sans-serif" fill="#0f172a" stroke="#f8fafc" stroke-width="3" paint-order="stroke">${escapeXml(region.name)}</text>
</g>`
}

function renderPaths(layout: MapLayout): string {
  if (!layout.paths?.length) return ''
  const regionById = new Map(layout.regions.map((region) => [region.id, region]))
  return layout.paths
    .map((path) => {
      const from = regionById.get(path.from)
      const to = regionById.get(path.to)
      if (!from || !to) return ''
      const x1 = from.x + from.width / 2
      const y1 = from.y + from.height / 2
      const x2 = to.x + to.width / 2
      const y2 = to.y + to.height / 2
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2 - 30
      return `<path d="M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="10 6" stroke-linecap="round" opacity="0.75"/>`
    })
    .filter(Boolean)
    .join('\n')
}

export function renderMapLayout(layout: MapLayout, stylePreset?: string | null): string {
  const regions = layout.regions.map((region, index) => renderRegion(region, index)).join('\n')
  const paths = renderPaths(layout)
  const defs = renderDefs(layout, stylePreset)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; overflow: hidden; background: #cbd5e1; }
    svg { width: 100%; height: 100vh; display: block; }
    .map-region { cursor: pointer; transition: transform 0.2s ease, opacity 0.2s ease; transform-box: fill-box; transform-origin: center; }
    .map-region:hover .region-shape { filter: url(#region-glow); }
    .map-region:hover { transform: scale(1.03); }
    .map-region.dimmed { opacity: 0.38; }
    .map-region.map-highlight { transform: scale(1.08); opacity: 1 !important; }
    .map-region.map-highlight .region-shape { stroke: #f59e0b !important; stroke-width: 5 !important; filter: url(#highlight-glow); }
    .map-region.map-highlight .region-label { fill: #7c2d12; stroke: #fff7ed; stroke-width: 4; }
  </style>
</head>
<body>
<svg viewBox="${escapeXml(layout.viewBox)}" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  ${renderBackground()}
  ${paths}
  ${regions}
</svg>
</body>
</html>`
}
