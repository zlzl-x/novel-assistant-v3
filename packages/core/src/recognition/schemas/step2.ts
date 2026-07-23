import { z } from 'zod'
import { normalizeStep2LlmPayload } from '../normalize/step2Response'
import { extractedFieldSchema } from './step1'

export const relationExtractionSchema = z.object({
  targetName: z.string().min(1),
  type: z.string().min(1),
  excerpt: z.string().min(1)
})

export const protagonistRelationSchema = z.object({
  type: z.string().min(1),
  proximity: z.number().int().min(1).max(5),
  excerpt: z.string().min(1)
})

export const panelEntryExtractionSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  excerpt: z.string().min(1)
})

const characterExtractionLlmObjectSchema = z.object({
  mentionCount: z.number().int().positive().optional(),
  proposedNewAliases: z.array(z.string().min(1)).optional(),
  fields: z.record(extractedFieldSchema).default({}),
  relations: z.array(relationExtractionSchema).optional(),
  protagonistRelation: protagonistRelationSchema.optional(),
  panelEntries: z.array(panelEntryExtractionSchema).optional()
})

export const characterExtractionLlmSchema = z.preprocess(
  normalizeStep2LlmPayload,
  characterExtractionLlmObjectSchema
)

export const step2ResultSchema = z.object({
  chapterId: z.string().min(1),
  characters: z.array(
    characterExtractionLlmObjectSchema.extend({
      characterId: z.string().min(1)
    })
  )
})

export type CharacterExtractionLlmResponse = z.infer<typeof characterExtractionLlmSchema>
