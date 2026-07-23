import type { LlmProviderId } from '@novel-assistant/core'

interface StoredLlmProfile {
  id: string
  name: string
  provider?: LlmProviderId
  baseUrl: string
  model: string
  temperature: number
  apiKeyEncrypted?: string
}

interface StoredLlmProfilesFile {
  profiles: StoredLlmProfile[]
  activeProfileId: string | null
}

export type { StoredLlmProfile, StoredLlmProfilesFile }
