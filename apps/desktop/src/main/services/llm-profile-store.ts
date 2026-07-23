import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { safeStorage } from 'electron'
import type { LlmProfile, LlmProfilesState, LlmProviderId, SaveLlmProfileInput } from '@novel-assistant/core'
import type { StoredLlmProfile, StoredLlmProfilesFile } from './llm-profile-types'

export class LlmProfileStore {
  constructor(private readonly getStorageDirectory: () => string) {}

  getProfiles(): LlmProfilesState {
    const file = this.normalizeActiveProfile(this.readFile())
    return {
      profiles: file.profiles.map((profile) => this.toPublicProfile(profile)),
      activeProfileId: file.activeProfileId
    }
  }

  saveProfile(input: SaveLlmProfileInput): LlmProfile {
    const file = this.readFile()
    const existing = input.id ? file.profiles.find((profile) => profile.id === input.id) : undefined
    const id = existing?.id ?? randomUUID()

    const nextProfile: StoredLlmProfile = {
      id,
      name: input.name,
      provider: input.provider ?? existing?.provider,
      baseUrl: input.baseUrl,
      model: input.model,
      temperature: input.temperature,
      apiKeyEncrypted: existing?.apiKeyEncrypted
    }

    if (existing) {
      file.profiles = file.profiles.map((profile) => (profile.id === id ? nextProfile : profile))
    } else {
      file.profiles.push(nextProfile)
      if (!file.activeProfileId) {
        file.activeProfileId = id
      }
    }

    this.writeFile(file)
    return this.toPublicProfile(nextProfile)
  }

  saveApiKey(profileId: string, apiKey: string): boolean {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('当前系统不支持安全存储 API Key，请检查密钥链/凭据服务')
    }

    const file = this.readFile()
    const target = file.profiles.find((profile) => profile.id === profileId)
    if (!target) {
      throw new Error('未找到对应的 LLM Profile')
    }

    target.apiKeyEncrypted = safeStorage.encryptString(apiKey).toString('base64')
    file.activeProfileId = profileId
    this.writeFile(file)
    return true
  }

  getDecryptedApiKey(profileId: string): string | null {
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }

    const file = this.readFile()
    const target = file.profiles.find((profile) => profile.id === profileId)
    if (!target?.apiKeyEncrypted) {
      return null
    }

    return safeStorage.decryptString(Buffer.from(target.apiKeyEncrypted, 'base64'))
  }

  deleteProfile(profileId: string): LlmProfilesState {
    const file = this.readFile()
    if (file.profiles.length <= 1) {
      throw new Error('至少保留一个 LLM Profile')
    }
    file.profiles = file.profiles.filter((profile) => profile.id !== profileId)
    if (file.activeProfileId === profileId) {
      file.activeProfileId = file.profiles[0]?.id ?? null
    }
    this.writeFile(file)
    return this.getProfiles()
  }

  setActiveProfile(profileId: string): LlmProfilesState {
    const file = this.readFile()
    if (!file.profiles.some((profile) => profile.id === profileId)) {
      throw new Error('未找到对应的 LLM Profile')
    }
    file.activeProfileId = profileId
    this.writeFile(file)
    return this.getProfiles()
  }

  private normalizeActiveProfile(file: StoredLlmProfilesFile): StoredLlmProfilesFile {
    if (file.profiles.length === 0) {
      return { profiles: [], activeProfileId: null }
    }

    const activeExists = file.activeProfileId
      ? file.profiles.some((profile) => profile.id === file.activeProfileId)
      : false

    if (activeExists) {
      return file
    }

    const preferred =
      file.profiles.find((profile) => profile.apiKeyEncrypted)?.id ?? file.profiles[0]?.id ?? null

    return {
      ...file,
      activeProfileId: preferred
    }
  }

  private readFile(): StoredLlmProfilesFile {
    const filePath = this.getFilePath()
    if (!existsSync(filePath)) {
      return { profiles: [], activeProfileId: null }
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as StoredLlmProfilesFile
      return {
        profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
        activeProfileId: parsed.activeProfileId ?? null
      }
    } catch {
      return { profiles: [], activeProfileId: null }
    }
  }

  private writeFile(file: StoredLlmProfilesFile): void {
    writeFileSync(this.getFilePath(), JSON.stringify(file, null, 2), 'utf-8')
  }

  private getFilePath(): string {
    return join(this.getStorageDirectory(), 'llm-profiles.json')
  }

  private toPublicProfile(profile: StoredLlmProfile): LlmProfile {
    return {
      id: profile.id,
      name: profile.name,
      provider: profile.provider,
      baseUrl: profile.baseUrl,
      model: profile.model,
      temperature: profile.temperature,
      hasApiKey: Boolean(profile.apiKeyEncrypted)
    }
  }
}
