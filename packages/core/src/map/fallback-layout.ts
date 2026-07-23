import type { MapNode, MapWorld } from '../models/map'
import type { MapLayout, MapRegionLayout } from './layout-schema'
import { renderMapLayout } from './render-layout'

const NODE_TYPE_TO_KIND: Record<MapNode['type'], MapRegionLayout['kind']> = {
  continent: 'continent',
  country: 'country',
  city: 'city',
  sect: 'sect',
  wilderness: 'wilderness',
  building: 'building',
  other: 'other'
}

function inferKindFromName(name: string): MapRegionLayout['kind'] {
  if (/山|岭|峰/.test(name)) return 'mountain'
  if (/河|江|水/.test(name)) return 'river'
  if (/矿|洞|晶/.test(name)) return 'mine'
  if (/城|都|镇/.test(name)) return 'city'
  if (/荒|原|野/.test(name)) return 'wilderness'
  return 'other'
}
function gridPosition(index: number, total: number): { x: number; y: number; width: number; height: number } {
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(total))))
  const col = index % columns
  const row = Math.floor(index / columns)
  const width = 180
  const height = 110
  const gapX = 60
  const gapY = 50
  const offsetX = Math.max(80, (1000 - columns * (width + gapX) + gapX) / 2)
  const rows = Math.ceil(total / columns)
  const offsetY = Math.max(60, (700 - rows * (height + gapY) + gapY) / 2)
  return {
    x: offsetX + col * (width + gapX),
    y: offsetY + row * (height + gapY),
    width,
    height
  }
}

export function buildFallbackMapLayout(input: {
  world: MapWorld
  nodes: MapNode[]
}): MapLayout {
  if (input.nodes.length > 0) {
    return {
      viewBox: '0 0 1000 700',
      regions: input.nodes.map((node, index) => {
        const position = gridPosition(index, input.nodes.length)
        return {
          id: node.id,
          name: node.name,
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
          shape: 'rect' as const,
          kind: NODE_TYPE_TO_KIND[node.type] ?? inferKindFromName(node.name)
        }
      })
    }
  }

  const descriptionLength = input.world.description?.trim().length ?? 0
  const regionCount = descriptionLength > 200 ? 6 : descriptionLength > 80 ? 5 : 4
  return {
    viewBox: '0 0 1000 700',
    regions: Array.from({ length: regionCount }, (_, index) => {
      const position = gridPosition(index, regionCount)
      return {
        id: `region-${index + 1}`,
        name: `区域${index + 1}`,
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        shape: 'rect' as const
      }
    })
  }
}

export function buildFallbackMapHtml(input: {
  world: MapWorld
  nodes: MapNode[]
}): string {
  const layout = buildFallbackMapLayout(input)
  return renderMapLayout(layout, input.world.stylePreset)
}
