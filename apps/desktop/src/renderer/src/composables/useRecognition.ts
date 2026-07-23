import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import {
  buildPreviewFromStep1,
  canRunStep2,
  collectGraphCommitData,
  isAmbiguityResolved,
  isPendingCharacterKey,
  isStep1Blocked,
  previewRoleTierToCharacterRole,
  remapGraphCommitData,
  removeUnresolvedMention,
  resolveAmbiguity,
  validateCommitInput
} from '@novel-assistant/core'
import { useChapterStore } from '@/stores/chapter'
import { useCharacterStore } from '@/stores/character'
import { useGraphStore } from '@/stores/graph'
import { usePreviewStore } from '@/stores/preview'
import { useProjectStore } from '@/stores/project'
import { useRecognitionDebugStore } from '@/stores/recognitionDebug'
import { hasActiveApiKey } from '@/services/llm'
import { runStep1, toCharacterRegistry } from '@/services/recognition/runStep1'
import { runStep2 } from '@/services/recognition/runStep2'
import { cloneForIpc } from '@/utils/ipc'

function remapAcceptedRows(
  acceptedByCharacter: Record<string, import('@novel-assistant/core').PreviewRow[]>,
  idMap: Map<string, string>
): Record<string, import('@novel-assistant/core').PreviewRow[]> {
  const remapped: Record<string, import('@novel-assistant/core').PreviewRow[]> = {}
  for (const [key, rows] of Object.entries(acceptedByCharacter)) {
    const realId = idMap.get(key) ?? key
    remapped[realId] = [...(remapped[realId] ?? []), ...rows]
  }
  return remapped
}

export function useRecognition() {
  const message = useMessage()
  const chapterStore = useChapterStore()
  const characterStore = useCharacterStore()
  const graphStore = useGraphStore()
  const previewStore = usePreviewStore()
  const projectStore = useProjectStore()
  const recognitionDebugStore = useRecognitionDebugStore()
  const llmReady = ref(false)

  function createDebugSink(chapterId: string) {
    return (entry: Parameters<typeof recognitionDebugStore.append>[1]) => {
      recognitionDebugStore.append(chapterId, entry)
    }
  }

  async function refreshLlmStatus(): Promise<void> {
    llmReady.value = await hasActiveApiKey()
  }

  function rebuildStep1Preview(chapterId: string): void {
    const preview = previewStore.getPreview(chapterId)
    if (!preview) return

    const step1Preview = buildPreviewFromStep1(
      preview.step1,
      toCharacterRegistry(characterStore.characters),
      characterStore.characters
    )

    previewStore.updatePreview(chapterId, (current) => {
      const protagonistKey = current.protagonistPreviewKey ?? step1Preview.protagonistPreviewKey
      const nextMeta = { ...step1Preview.characterPreviewMeta }
      if (protagonistKey && nextMeta[protagonistKey]) {
        nextMeta[protagonistKey] = { ...nextMeta[protagonistKey]!, roleTier: 'protagonist' }
      }
      return {
        ...current,
        previewRowsByCharacter: step1Preview.previewRowsByCharacter,
        characterPreviewMeta: nextMeta,
        protagonistPreviewKey: protagonistKey
      }
    })

    const updated = previewStore.getPreview(chapterId)
    if (updated?.previewRowsByCharacter) {
      previewStore.initEditableRows(chapterId, updated)
    }
  }

  async function runStep2ForPreview(chapterId: string): Promise<void> {
    const preview = previewStore.getPreview(chapterId)
    if (!preview) return

    const registry = toCharacterRegistry(characterStore.characters)
    if (!canRunStep2(preview, registry)) {
      message.info('当前无已入库的匹配角色，可直接确认 Step 1 识别结果')
      return
    }

    const protagonistKey = preview.protagonistPreviewKey
    const protagonistName = protagonistKey
      ? preview.characterPreviewMeta?.[protagonistKey]?.name ??
        characterStore.characters.find((character) => character.id === protagonistKey)?.name ??
        null
      : projectStore.currentProject?.protagonistId
        ? characterStore.characters.find(
            (character) => character.id === projectStore.currentProject?.protagonistId
          )?.name ?? null
        : null

    previewStore.setRecognizing(chapterId, 'Step 2/2 合并角色资料…')
    try {
      const updated = await runStep2({
        preview,
        characters: characterStore.characters,
        protagonistName,
        debug: createDebugSink(chapterId),
        onProgress: (current, total, characterName) => {
          previewStore.setRecognizing(
            chapterId,
            `Step 2/2 合并角色资料 (${current}/${total})：${characterName}…`
          )
        }
      })
      previewStore.setPreview(chapterId, updated.preview)

      const failures = updated.failures ?? []
      if (failures.length > 0) {
        const names = failures.map((item) => item.characterName).join('、')
        const sampleError = failures[0]?.error ?? '未知错误'
        message.warning(
          `Step 2 部分完成：${failures.length} 个角色合并失败（${names}）。` +
            `常见原因：${sampleError}。可点「识别日志」查看 step2-error 条目，或先确认 Step 1 结果。`,
          { duration: 8000 }
        )
        return
      }

      message.success('Step 2 完成，已与角色库资料合并')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Step 2 失败')
    } finally {
      previewStore.setRecognizing(null)
    }
  }

  async function recognizeChapter(input: {
    chapterId: string
    projectId: string
    rawText: string
    onNeedSettings?: () => void
  }): Promise<void> {
    await refreshLlmStatus()
    if (!llmReady.value) {
      message.warning('请先在应用设置中配置 LLM API Key', { duration: 4000 })
      input.onNeedSettings?.()
      return
    }

    if (!input.rawText.trim()) {
      message.warning('请先粘贴章节正文')
      return
    }

    previewStore.setRecognizing(input.chapterId, 'Step 1/2 正在分析正文…')
    try {
      await characterStore.loadCharacters(input.projectId)
      recognitionDebugStore.createSession(input.chapterId)
      const debug = createDebugSink(input.chapterId)
      const preview = await runStep1({
        chapterId: input.chapterId,
        projectId: input.projectId,
        rawText: input.rawText,
        isLatestChapter: chapterStore.isLatestChapter(input.chapterId),
        characters: toCharacterRegistry(characterStore.characters),
        fullCharacters: characterStore.characters,
        debug
      })
      previewStore.setPreview(input.chapterId, preview)

      if (preview.blocked) {
        message.warning('存在同名歧义，请先裁决后再继续')
        return
      }

      const metaCount = Object.keys(preview.characterPreviewMeta ?? {}).length
      if (canRunStep2(preview, toCharacterRegistry(characterStore.characters))) {
        await runStep2ForPreview(input.chapterId)
      } else if (metaCount > 0) {
        message.success(`识别完成，共 ${metaCount} 个角色，请确认主角与字段后入库`)
      } else {
        message.success('Step 1 完成，未提取到角色字段')
      }
    } catch (error) {
      createDebugSink(input.chapterId)({
        stage: 'step1-error',
        label: 'Step1 识别失败',
        payload: error instanceof Error ? error.message : String(error)
      })
      message.error(error instanceof Error ? error.message : '识别失败')
    } finally {
      previewStore.setRecognizing(null)
    }
  }

  async function resolveAmbiguityForPreview(input: {
    chapterId: string
    surfaceForm: string
    resolution:
      | { type: 'existing'; characterId: string; characterName: string }
      | { type: 'skip' }
  }): Promise<void> {
    const preview = previewStore.getPreview(input.chapterId)
    if (!preview) return

    const nextStep1 = resolveAmbiguity(
      {
        step1: preview.step1,
        surfaceForm: input.surfaceForm,
        resolution: input.resolution
      },
      toCharacterRegistry(characterStore.characters)
    )

    previewStore.updatePreview(input.chapterId, (current) => ({
      ...current,
      step1: nextStep1,
      step2: undefined,
      previewRowsByCharacter: undefined,
      characterPreviewMeta: undefined,
      blocked: isStep1Blocked(nextStep1)
    }))
    previewStore.clearEditableRows(input.chapterId)
    rebuildStep1Preview(input.chapterId)

    if (isAmbiguityResolved(nextStep1) && canRunStep2(
      { step1: nextStep1, blocked: isStep1Blocked(nextStep1) },
      toCharacterRegistry(characterStore.characters)
    )) {
      await runStep2ForPreview(input.chapterId)
    }
  }

  async function quickCreateCharacter(input: {
    projectId: string
    chapterId: string
    name: string
    disambiguation?: string
  }): Promise<void> {
    const created = await characterStore.createCharacter({
      projectId: input.projectId,
      name: input.name,
      disambiguation: input.disambiguation
    })

    previewStore.updatePreview(input.chapterId, (current) => ({
      ...current,
      step1: removeUnresolvedMention(current.step1, input.name)
    }))
    rebuildStep1Preview(input.chapterId)

    message.success(`已创建角色「${created.name}」`)
  }

  async function commitPreview(input: { chapterId: string; projectId: string }): Promise<void> {
    const preview = previewStore.getPreview(input.chapterId)
    if (!preview) {
      message.warning('请先完成识别')
      return
    }

    const meta = preview.characterPreviewMeta ?? {}
    const metaCount = Object.keys(meta).length
    const acceptedByCharacter = previewStore.getEditableRows(input.chapterId)
    const validationError = validateCommitInput({
      isLatestChapter: chapterStore.isLatestChapter(input.chapterId),
      ambiguousCount: preview.step1.ambiguousNames.length,
      acceptedByCharacter,
      previewCharacterCount: metaCount,
      appearanceCount: Object.keys(meta).length
    })
    if (validationError) {
      message.warning(validationError)
      return
    }

    const idMap = new Map<string, string>()
    const protagonistKey = preview.protagonistPreviewKey

    for (const [key, characterMeta] of Object.entries(meta)) {
      if (!characterMeta.isPending || !isPendingCharacterKey(key)) continue

      const isProtagonist = key === protagonistKey || characterMeta.roleTier === 'protagonist'
      const role = previewRoleTierToCharacterRole(characterMeta.roleTier, isProtagonist)
      const created = await characterStore.createCharacter({
        projectId: input.projectId,
        name: characterMeta.name,
        role
      })
      idMap.set(key, created.id)
    }

    const remappedAccepted = remapAcceptedRows(acceptedByCharacter, idMap)

    const protagonistName = protagonistKey
      ? meta[protagonistKey]?.name ??
        characterStore.characters.find((character) => character.id === (idMap.get(protagonistKey) ?? protagonistKey))?.name ??
        null
      : projectStore.currentProject?.protagonistId
        ? characterStore.characters.find(
            (character) => character.id === projectStore.currentProject?.protagonistId
          )?.name ?? null
        : null

    const graphData = remapGraphCommitData(
      collectGraphCommitData(
        preview.step1,
        toCharacterRegistry(characterStore.characters),
        idMap,
        preview.step2,
        protagonistName
      ),
      idMap
    )

    const appearances = Object.entries(meta).map(([key, characterMeta]) => ({
      characterId: idMap.get(key) ?? key,
      mentionCount: characterMeta.mentionCount
    }))

    for (const [key, characterMeta] of Object.entries(meta)) {
      if (characterMeta.isPending) continue
      const realId = key
      const isProtagonist = key === protagonistKey || characterMeta.roleTier === 'protagonist'
      const role = previewRoleTierToCharacterRole(characterMeta.roleTier, isProtagonist)
      const existing = characterStore.characters.find((character) => character.id === realId)
      if (existing && existing.role !== role) {
        await characterStore.updateCharacter({ id: realId, role })
      }
    }

    const result = await window.novelApi.recognition.commit(
      cloneForIpc({
        chapterId: input.chapterId,
        ambiguousCount: preview.step1.ambiguousNames.length,
        acceptedByCharacter: remappedAccepted,
        appearances,
        relationsByCharacter: graphData.relationsByCharacter,
        protagonistRelationsByCharacter: graphData.protagonistRelationsByCharacter
      })
    )

    if (!result.success || !result.data) {
      throw new Error(result.error ?? '提交失败')
    }

    characterStore.upsertCharacters(result.data.characters)

    if (protagonistKey) {
      const protagonistId = idMap.get(protagonistKey) ?? protagonistKey
      if (projectStore.currentProject?.id === input.projectId) {
        await projectStore.updateProject({
          id: input.projectId,
          protagonistId
        })
      }
    }

    graphStore.refresh()
    previewStore.clearPreview(input.chapterId)
    await chapterStore.loadChapters(input.projectId)
    message.success('已更新角色库')
  }

  function dismissPreview(chapterId: string): void {
    previewStore.clearPreview(chapterId)
    message.info('已忽略本章预览')
  }

  return {
    llmReady,
    refreshLlmStatus,
    recognizeChapter,
    runStep2ForPreview,
    resolveAmbiguityForPreview,
    quickCreateCharacter,
    commitPreview,
    dismissPreview
  }
}
