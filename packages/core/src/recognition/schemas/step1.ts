import { z } from 'zod'
import { RECOGNITION_FIELD_KEYS } from '../../constants'
import { normalizeStep1LlmPayload } from '../normalize/step1Response'

const confidenceSchema = z.enum(['high', 'medium', 'low'])

export const extractedFieldSchema = z.object({
  value: z.string().min(1),
  excerpt: z.string().min(1),
  confidence: confidenceSchema
})

export const characterMentionSchema = z.object({
  surfaceForm: z.string().min(1),
  inferredName: z.string().min(1).optional(),
  mentionCount: z.number().int().positive(),
  excerpts: z.array(z.string().min(1)).min(1),
  isNickname: z.boolean()
})

export const chapterExtractionSchema = z.object({
  inferredName: z.string().min(1),
  mentionCount: z.number().int().positive(),
  fields: z.record(extractedFieldSchema),
  relations: z
    .array(
      z.object({
        targetName: z.string().min(1),
        type: z.string().min(1),
        excerpt: z.string().min(1)
      })
    )
    .optional(),
  protagonistRelation: z
    .object({
      type: z.string().min(1),
      proximity: z.number().int().min(1).max(5),
      excerpt: z.string().min(1)
    })
    .optional(),
  panelEntries: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string().min(1),
        excerpt: z.string().min(1)
      })
    )
    .optional()
})

const step1LlmResponseObjectSchema = z.object({
  mentions: z.array(characterMentionSchema),
  chapterExtractions: z.array(chapterExtractionSchema)
})

export const step1LlmResponseSchema = z.preprocess(
  normalizeStep1LlmPayload,
  step1LlmResponseObjectSchema
)

export const ambiguousNameSchema = z.object({
  surfaceForm: z.string().min(1),
  candidateCharacterIds: z.array(z.string().min(1)).min(2),
  excerpt: z.string().min(1)
})

export const step1ResultSchema = step1LlmResponseObjectSchema.extend({
  chapterId: z.string().min(1),
  unresolvedMentions: z.array(z.string().min(1)),
  ambiguousNames: z.array(ambiguousNameSchema)
})

export type Step1LlmResponse = z.infer<typeof step1LlmResponseSchema>
export type Step1ResultValidated = z.infer<typeof step1ResultSchema>

export const RECOGNITION_FIELD_KEY_SET = new Set<string>(RECOGNITION_FIELD_KEYS)
