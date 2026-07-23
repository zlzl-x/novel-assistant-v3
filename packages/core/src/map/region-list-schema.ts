import { z } from 'zod'

export const mapRegionListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1)
})

export const mapRegionListSchema = z.object({
  regions: z.array(mapRegionListItemSchema).min(1).max(12)
})

export type MapRegionListItem = z.infer<typeof mapRegionListItemSchema>
export type MapRegionList = z.infer<typeof mapRegionListSchema>

const BUILDING_KEYWORDS = /矿道|棚区|监工|工棚|矿洞入口|建筑|楼阁|殿宇|哨所|营地/

export function isMacroRegionName(name: string): boolean {
  const trimmed = name.trim()
  if (trimmed.length < 2) return false
  return !BUILDING_KEYWORDS.test(trimmed)
}

export function normalizeRegionList(raw: unknown): MapRegionListItem[] {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const regions = Array.isArray(record.regions) ? record.regions : Array.isArray(raw) ? raw : []

  const normalized = regions
    .map((region, index) => {
      const item = region && typeof region === 'object' ? (region as Record<string, unknown>) : {}
      const name = String(item.name ?? '').trim()
      if (!name || !isMacroRegionName(name)) return null
      return {
        id: String(item.id ?? `region-${index + 1}`),
        name
      }
    })
    .filter((item): item is MapRegionListItem => item !== null)

  const unique: MapRegionListItem[] = []
  const seen = new Set<string>()
  for (const item of normalized) {
    if (seen.has(item.name)) continue
    seen.add(item.name)
    unique.push({
      id: `region-${unique.length + 1}`,
      name: item.name
    })
  }

  return unique
}

export function extractRegionsFromDescriptionHeuristic(description: string): MapRegionListItem[] {
  const names: string[] = []
  const seen = new Set<string>()

  const addName = (value: string): void => {
    const name = value.trim().replace(/\*+/g, '').replace(/[：:].*$/, '').trim()
    if (name.length < 2 || name.length > 12) return
    if (!isMacroRegionName(name)) return
    if (seen.has(name)) return
    seen.add(name)
    names.push(name)
  }

  for (const match of description.matchAll(/\*\*([^*]{2,12})\*\*/g)) {
    addName(match[1] ?? '')
  }

  for (const match of description.matchAll(/[「【『]([^」】』]{2,12})[」】』]/g)) {
    addName(match[1] ?? '')
  }

  for (const match of description.matchAll(/(?:^|\n)\s*(?:\d+[.、)]|[-*])\s*([^\n：:]{2,12})/g)) {
    addName(match[1] ?? '')
  }

  for (const match of description.matchAll(
    /([\u4e00-\u9fff]{2,10}(?:妖山|荒山|青山|荒原|矿区|矿场|城池|城|宗|关|河|岭|峰|谷|泽|境|界|原|脉))/g
  )) {
    addName(match[1] ?? '')
  }

  return names.slice(0, 10).map((name, index) => ({
    id: `region-${index + 1}`,
    name
  }))
}
