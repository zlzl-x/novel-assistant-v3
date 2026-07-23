import type { MapNode, MapWorld } from '../models/map'

const VIEW_WIDTH = 1000
const VIEW_HEIGHT = 700

const PLATE_FILLS = [
  '#4ade80',
  '#60a5fa',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
  '#2dd4bf',
  '#fb923c',
  '#94a3b8',
  '#86efac',
  '#38bdf8',
  '#fcd34d',
  '#fca5a5'
]

export interface TessellatedPlate {
  id: string
  name: string
  points: string
  cx: number
  cy: number
  cellWidth: number
  cellHeight: number
}

export function isMapPlateNode(node: MapNode): boolean {
  return node.type !== 'building'
}

export function selectMapPlateNodes(nodes: MapNode[]): MapNode[] {
  return nodes.filter(isMapPlateNode)
}

export function buildTessellationPlates(
  items: Array<{ id: string; name: string }>,
  viewWidth = VIEW_WIDTH,
  viewHeight = VIEW_HEIGHT
): TessellatedPlate[] {
  const count = items.length
  if (count === 0) return []

  const columns = Math.max(1, Math.ceil(Math.sqrt((count * viewWidth) / viewHeight)))
  const rows = Math.ceil(count / columns)
  const cellWidth = viewWidth / columns
  const cellHeight = viewHeight / rows

  return items.map((item, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = column * cellWidth
    const y = row * cellHeight
    const x2 = x + cellWidth
    const y2 = y + cellHeight
    return {
      id: item.id,
      name: item.name,
      points: `${x},${y} ${x2},${y} ${x2},${y2} ${x},${y2}`,
      cx: x + cellWidth / 2,
      cy: y + cellHeight / 2,
      cellWidth,
      cellHeight
    }
  })
}

export function computePlateLabelFontSize(name: string, cellWidth: number, cellHeight: number): number {
  const lines = splitPlateLabel(name)
  const longestLine = Math.max(...lines.map((line) => line.length), 1)
  const lineCount = lines.length
  const byWidth = (cellWidth * 0.82) / longestLine
  const byHeight = (cellHeight * 0.78) / (lineCount * 1.35)
  return Math.max(12, Math.min(22, Math.min(byWidth * 1.15, byHeight)))
}

export function splitPlateLabel(name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return ['']
  if (trimmed.length <= 6) return [trimmed]

  const parts = trimmed.split(/[·・]/).map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 2 && parts.every((part) => part.length <= 8)) {
    return parts
  }

  const mid = Math.ceil(trimmed.length / 2)
  return [trimmed.slice(0, mid), trimmed.slice(mid)]
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderPlateLabel(plate: TessellatedPlate): string {
  const lines = splitPlateLabel(plate.name)
  const fontSize = computePlateLabelFontSize(plate.name, plate.cellWidth, plate.cellHeight)
  const lineHeight = fontSize * 1.25
  const startY = plate.cy - ((lines.length - 1) * lineHeight) / 2

  if (lines.length === 1) {
    return `<text x="${plate.cx}" y="${plate.cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-family="'Microsoft YaHei','PingFang SC',sans-serif" fill="#1e293b">${escapeXml(lines[0]!)}</text>`
  }

  const tspans = lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : lineHeight
      return `<tspan x="${plate.cx}" dy="${index === 0 ? 0 : dy}">${escapeXml(line)}</tspan>`
    })
    .join('')

  return `<text x="${plate.cx}" y="${startY}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-family="'Microsoft YaHei','PingFang SC',sans-serif" fill="#1e293b">${tspans}</text>`
}

function renderPlate(plate: TessellatedPlate, index: number): string {
  const fill = PLATE_FILLS[index % PLATE_FILLS.length]!
  return `<g data-place-id="${escapeXml(plate.id)}">
  <polygon points="${plate.points}" fill="${fill}" stroke="#334155" stroke-width="1"/>
  ${renderPlateLabel(plate)}
</g>`
}

export function buildPlateItems(
  world: MapWorld,
  nodes: MapNode[],
  extractedRegions?: Array<{ id: string; name: string }>
): Array<{ id: string; name: string }> {
  const plateNodes = selectMapPlateNodes(nodes)
  if (plateNodes.length > 0) {
    return plateNodes.map((node) => ({ id: node.id, name: node.name }))
  }

  if (extractedRegions && extractedRegions.length > 0) {
    return extractedRegions
  }

  const descriptionLength = world.description?.trim().length ?? 0
  const regionCount = descriptionLength > 200 ? 6 : descriptionLength > 80 ? 5 : 4
  return Array.from({ length: regionCount }, (_, index) => ({
    id: `region-${index + 1}`,
    name: `区域${index + 1}`
  }))
}

export function buildTessellatedMapHtml(input: {
  world: MapWorld
  nodes: MapNode[]
  regions?: Array<{ id: string; name: string }>
}): string {
  const plates = buildTessellationPlates(buildPlateItems(input.world, input.nodes, input.regions))
  const regions = plates.map((plate, index) => renderPlate(plate, index)).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #e8eef5; }
    svg { display: block; width: 100%; height: 100vh; }
    text { pointer-events: none; user-select: none; }
  </style>
</head>
<body>
<svg viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
${regions}
</svg>
</body>
</html>`
}
