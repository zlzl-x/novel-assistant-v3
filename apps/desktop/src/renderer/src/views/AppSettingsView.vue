<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTag,
  NText,
  useMessage
} from 'naive-ui'
import type { LlmProfile } from '@novel-assistant/core'
import {
  API_PRESET_GROUPS,
  API_PRESETS,
  findPreset,
  hintForProfile,
  deepSeekMigrationHint,
  PROVIDER_LABELS,
  suggestedModelsForProfile
} from '@/services/llm/api-presets'
import { testConnection } from '@/services/llm'

const router = useRouter()
const message = useMessage()

const profiles = ref<LlmProfile[]>([])
const activeProfileId = ref<string | null>(null)
const loading = ref(false)
const testing = ref(false)

const form = ref({
  name: '默认',
  provider: 'deepseek' as LlmProfile['provider'],
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-v4-flash',
  temperature: 0.2,
  apiKey: ''
})

const activeProfile = computed(
  () => profiles.value.find((profile) => profile.id === activeProfileId.value) ?? null
)

const profileOptions = computed(() =>
  profiles.value.map((profile) => ({
    label: `${profile.name}（${PROVIDER_LABELS[profile.provider ?? 'custom']}）`,
    value: profile.id
  }))
)

const presetOptions = computed(() =>
  API_PRESET_GROUPS.flatMap((group) =>
    group.presets.map((preset) => ({
      label: `${group.label} · ${preset.name}`,
      value: preset.id
    }))
  )
)

const modelOptions = computed(() =>
  activeProfile.value
    ? suggestedModelsForProfile(activeProfile.value).map((model) => ({ label: model, value: model }))
    : []
)

const activeHint = computed(() =>
  activeProfile.value ? hintForProfile(activeProfile.value) : undefined
)

const deepSeekMigrationWarning = computed(() => {
  if (!activeProfile.value || activeProfile.value.provider !== 'deepseek') return undefined
  return deepSeekMigrationHint(activeProfile.value.model)
})

function applyProfileToForm(profile: LlmProfile): void {
  form.value = {
    name: profile.name,
    provider: profile.provider ?? 'custom',
    baseUrl: profile.baseUrl,
    model: profile.model,
    temperature: profile.temperature,
    apiKey: ''
  }
}

async function loadProfiles(): Promise<void> {
  loading.value = true
  try {
    const result = await window.novelApi.settings.getLlmProfiles()
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '加载配置失败')
    }
    profiles.value = result.data.profiles
    activeProfileId.value = result.data.activeProfileId

    if (profiles.value.length === 0) {
      await createFromPreset(API_PRESETS[0]!.id)
      return
    }

    const active = profiles.value.find((profile) => profile.id === activeProfileId.value)
    if (active) applyProfileToForm(active)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function switchProfile(profileId: string): Promise<void> {
  const result = await window.novelApi.settings.setActiveLlmProfile(profileId)
  if (!result.success || !result.data) {
    message.error(result.error ?? '切换失败')
    return
  }
  profiles.value = result.data.profiles
  activeProfileId.value = result.data.activeProfileId
  const active = profiles.value.find((profile) => profile.id === activeProfileId.value)
  if (active) applyProfileToForm(active)
}

async function saveProfile(): Promise<string | null> {
  const result = await window.novelApi.settings.saveLlmProfile({
    id: activeProfileId.value ?? undefined,
    name: form.value.name.trim() || '默认',
    provider: form.value.provider,
    baseUrl: form.value.baseUrl.trim(),
    model: form.value.model.trim(),
    temperature: form.value.temperature
  })
  if (!result.success || !result.data) {
    throw new Error(result.error ?? '保存失败')
  }
  activeProfileId.value = result.data.id
  await loadProfiles()
  return result.data.id
}

async function handleSaveProfile(): Promise<void> {
  try {
    await saveProfile()
    message.success('Profile 已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

async function handleSaveApiKey(): Promise<void> {
  try {
    let profileId = activeProfileId.value
    if (!profileId) {
      profileId = await saveProfile()
    }
    if (!profileId) return

    if (!form.value.apiKey.trim()) {
      message.warning('请输入 API Key')
      return
    }

    const result = await window.novelApi.settings.saveApiKey({
      profileId,
      apiKey: form.value.apiKey.trim()
    })
    if (!result.success) {
      throw new Error(result.error ?? '保存 Key 失败')
    }
    await window.novelApi.settings.setActiveLlmProfile(profileId)
    form.value.apiKey = ''
    message.success('API Key 已安全保存')
    await loadProfiles()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存 Key 失败')
  }
}

async function createFromPreset(presetId: string): Promise<void> {
  const preset = findPreset(presetId) ?? API_PRESETS[0]!
  const result = await window.novelApi.settings.saveLlmProfile({
    name: preset.name,
    provider: preset.provider,
    baseUrl: preset.baseUrl,
    model: preset.model,
    temperature: 0.2
  })
  if (!result.success || !result.data) {
    throw new Error(result.error ?? '创建 Profile 失败')
  }
  await window.novelApi.settings.setActiveLlmProfile(result.data.id)
  await loadProfiles()
  message.success(`已添加：${preset.name}`)
}

async function applyPresetToActive(presetId: string): Promise<void> {
  const preset = findPreset(presetId)
  if (!preset) return
  form.value = {
    ...form.value,
    name: preset.name,
    provider: preset.provider,
    baseUrl: preset.baseUrl,
    model: preset.model
  }
  try {
    await saveProfile()
    message.success(`已应用预设：${preset.name}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '应用预设失败')
  }
}

async function removeCurrentProfile(): Promise<void> {
  if (!activeProfileId.value || profiles.value.length <= 1) return
  const result = await window.novelApi.settings.deleteLlmProfile(activeProfileId.value)
  if (!result.success || !result.data) {
    message.error(result.error ?? '删除失败')
    return
  }
  profiles.value = result.data.profiles
  activeProfileId.value = result.data.activeProfileId
  const active = profiles.value.find((profile) => profile.id === activeProfileId.value)
  if (active) applyProfileToForm(active)
  message.success('已删除 Profile')
}

async function handleTestConnection(): Promise<void> {
  testing.value = true
  try {
    if (!activeProfileId.value) {
      await saveProfile()
    }
    const resultMessage = await testConnection(activeProfileId.value ?? undefined)
    message.success(resultMessage)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '连接测试失败')
  } finally {
    testing.value = false
  }
}

onMounted(loadProfiles)
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <div class="mx-auto max-w-3xl space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold">应用设置</h1>
          <n-text depth="3">正文识别与地图生成共用文本 LLM 配置</n-text>
        </div>
        <n-button @click="router.push('/')">返回作品列表</n-button>
      </div>

      <n-card title="LLM Profile" :loading="loading">
        <n-text
          v-if="deepSeekMigrationWarning"
          type="warning"
          class="mb-4 block rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm"
        >
          {{ deepSeekMigrationWarning }}
        </n-text>
        <n-form label-placement="top">
          <n-form-item label="当前配置">
            <div class="flex w-full gap-2">
              <n-select
                class="flex-1"
                :value="activeProfileId"
                :options="profileOptions"
                placeholder="选择 Profile"
                @update:value="switchProfile"
              />
              <n-button :disabled="profiles.length <= 1" @click="removeCurrentProfile">删除</n-button>
            </div>
          </n-form-item>

          <n-form-item label="快速选择大模型（应用到当前配置）">
            <n-select
              placeholder="选择 DeepSeek / Kimi / 通义千问 等"
              :options="presetOptions"
              @update:value="applyPresetToActive"
            />
          </n-form-item>

          <div class="space-y-3">
            <n-text depth="3" class="text-xs">或添加为独立配置</n-text>
            <div v-for="group in API_PRESET_GROUPS" :key="group.label">
              <n-text depth="3" class="mb-2 block text-xs font-medium">{{ group.label }}</n-text>
              <n-space>
                <n-button
                  v-for="preset in group.presets"
                  :key="preset.id"
                  size="small"
                  secondary
                  :title="preset.hint"
                  @click="createFromPreset(preset.id)"
                >
                  {{ preset.name }}
                </n-button>
              </n-space>
            </div>
          </div>

          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <n-form-item label="配置名称">
              <n-input v-model:value="form.name" />
            </n-form-item>
            <n-form-item label="服务商">
              <n-input :value="PROVIDER_LABELS[form.provider ?? 'custom']" disabled />
            </n-form-item>
          </div>

          <n-form-item label="API Base URL">
            <n-input v-model:value="form.baseUrl" placeholder="https://api.deepseek.com/v1" />
          </n-form-item>

          <div class="grid gap-4 md:grid-cols-2">
            <n-form-item label="模型">
              <n-select
                v-model:value="form.model"
                filterable
                tag
                :options="modelOptions"
                placeholder="模型名称"
              />
            </n-form-item>
            <n-form-item label="温度">
              <n-input-number
                v-model:value="form.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                class="w-full"
              />
            </n-form-item>
          </div>

          <n-form-item label="API Key">
            <n-input
              v-model:value="form.apiKey"
              type="password"
              show-password-on="click"
              placeholder="sk-...（仅保存在本机加密存储，渲染进程无法读取明文）"
            />
          </n-form-item>

          <n-text v-if="activeHint" depth="3" class="block text-sm">{{ activeHint }}</n-text>
          <n-tag v-if="activeProfile?.hasApiKey" type="success" size="small" class="mt-2">
            当前 Profile 已配置加密 API Key
          </n-tag>
          <n-tag v-else-if="activeProfile?.provider === 'ollama'" type="info" size="small" class="mt-2">
            Ollama 本地可留空 API Key
          </n-tag>
        </n-form>

        <n-space class="mt-4">
          <n-button type="primary" @click="handleSaveProfile">保存 Profile</n-button>
          <n-button @click="handleSaveApiKey">保存 API Key</n-button>
          <n-button :loading="testing" @click="handleTestConnection">测试连接</n-button>
        </n-space>
      </n-card>
    </div>
  </div>
</template>
