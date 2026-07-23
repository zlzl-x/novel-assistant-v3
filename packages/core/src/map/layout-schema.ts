import { z } from 'zod'

export const mapRegionShapeSchema = z.enum(['rect', 'circle', 'polygon'])

export const mapRegionKindSchema = z.enum([
  'mountain',
  'wilderness',
  'river',
  'city',
  'mine',
  'sect',
  'building',
  'country',
  'continent',
  'other'
])

export const mapRegionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().default(140),
  height: z.number().positive().default(100),
  shape: mapRegionShapeSchema.default('rect'),
  kind: mapRegionKindSchema.optional(),
  tone: z.string().optional()
})

export const mapPathSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1)
})

export const mapLayoutSchema = z.object({
  viewBox: z.string().default('0 0 1000 700'),
  regions: z.array(mapRegionSchema).min(1),
  paths: z.array(mapPathSchema).optional()
})

export type MapRegionShape = z.infer<typeof mapRegionShapeSchema>
export type MapRegionLayout = z.infer<typeof mapRegionSchema>
export type MapPathLayout = z.infer<typeof mapPathSchema>
export type MapLayout = z.infer<typeof mapLayoutSchema>

export function normalizeMapLayout(raw: unknown): MapLayout {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const regions = Array.isArray(record.regions) ? record.regions : []
  const normalizedRegions = regions.map((region, index) => {
    const item = region && typeof region === 'object' ? (region as Record<string, unknown>) : {}
    return {
      id: String(item.id ?? `region-${index + 1}`),
      name: String(item.name ?? `区域${index + 1}`),
      x: Number(item.x ?? 100 + (index % 3) * 220),
      y: Number(item.y ?? 120 + Math.floor(index / 3) * 160),
      width: Number(item.width ?? 140),
      height: Number(item.height ?? 100),
      shape: (item.shape as MapRegionShape) ?? 'rect',
      kind: item.kind ? String(item.kind) : undefined,
      tone: item.tone ? String(item.tone) : undefined
    }
  })

  return mapLayoutSchema.parse({
    viewBox: record.viewBox ?? '0 0 1000 700',
    regions: normalizedRegions.length > 0 ? normalizedRegions : [{ id: 'region-1', name: '区域1', x: 400, y: 280, width: 180, height: 120 }],
    paths: Array.isArray(record.paths) ? record.paths : undefined
  })
}
