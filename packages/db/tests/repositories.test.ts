import { afterEach, describe, expect, it } from 'vitest'
import { createTempDatabaseFile, createTestDatabase } from './helpers'

describe('DatabaseService', () => {
  it('applies initial migration', () => {
    const db = createTestDatabase()
    expect(db.getSchemaVersion()).toBe(1)
    db.close()
  })
})

describe('repository integration', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  it('creates project → chapter → character → appearance → commit with field history', () => {
    const { service, cleanup: dispose } = createTempDatabaseFile()
    cleanup = dispose

    const project = service.projects.create({ title: '测试作品' })
    const chapter = service.chapters.create({
      projectId: project.id,
      number: 1,
      title: '第一章',
      rawText: '张三踏入青云宗。'
    })
    const character = service.characters.create({
      projectId: project.id,
      name: '张三',
      disambiguation: '青云宗·张三',
      role: 'protagonist',
      aliases: ['三哥']
    })

    service.characters.update(character.id, {
      realm: '炼气期',
      appendFieldHistory: [
        {
          fieldKey: 'realm',
          value: '炼气期',
          chapterId: chapter.id,
          chapterNumber: 1,
          source: 'recognition',
          excerpt: '他已是炼气期修士'
        }
      ]
    })

    const appearance = service.appearances.append({
      characterId: character.id,
      chapterId: chapter.id,
      chapterNumber: 1,
      mentionCount: 3,
      excerpt: '张三'
    })

    const commit = service.commits.create({
      chapterId: chapter.id,
      chapterNumber: 1,
      modelProfile: 'test-profile',
      acceptedFields: [
        {
          characterId: character.id,
          fieldKey: '境界',
          oldValue: '',
          newValue: '炼气期'
        }
      ],
      appearances: [{ characterId: character.id, mentionCount: 3 }]
    })

    const loaded = service.characters.findById(character.id)
    expect(loaded?.realm.current).toBe('炼气期')
    expect(loaded?.realm.history).toHaveLength(1)
    expect(loaded?.aliases).toContain('三哥')
    expect(appearance.mentionCount).toBe(3)
    expect(commit.acceptedFields[0]?.newValue).toBe('炼气期')
    expect(commit.appearances[0]?.mentionCount).toBe(3)
  })

  it('persists empty standard fields when explicitly cleared', () => {
    const { service, cleanup: dispose } = createTempDatabaseFile()
    cleanup = dispose

    const project = service.projects.create({ title: '清空字段测试' })
    const character = service.characters.create({
      projectId: project.id,
      name: '李四',
      role: 'major'
    })

    service.characters.update(character.id, {
      identity: '外门弟子',
      realm: '筑基',
      location: '青云宗',
      faction: '青云宗',
      panel: {
        entries: [{ key: '职业', value: '矿工', history: [] }]
      }
    })

    const cleared = service.characters.update(character.id, {
      identity: '',
      realm: '',
      location: '',
      faction: null,
      panel: { entries: [] }
    })

    expect(cleared?.identity.current).toBe('')
    expect(cleared?.realm.current).toBe('')
    expect(cleared?.location.current).toBe('')
    expect(cleared?.faction).toBeUndefined()
    expect(cleared?.panel.entries).toEqual([])
  })

  it('deletes character and cascades related records', () => {
    const { service, cleanup: dispose } = createTempDatabaseFile()
    cleanup = dispose

    const project = service.projects.create({ title: '删除角色测试' })
    const chapter = service.chapters.create({
      projectId: project.id,
      number: 1,
      title: '第一章',
      rawText: '张三出场。'
    })
    const character = service.characters.create({
      projectId: project.id,
      name: '张三',
      role: 'major'
    })

    service.appearances.append({
      characterId: character.id,
      chapterId: chapter.id,
      chapterNumber: 1,
      mentionCount: 2
    })

    const deleted = service.characters.delete(character.id)

    expect(deleted).toBe(true)
    expect(service.characters.findById(character.id)).toBeNull()
  })

  it('deleteAfter removes later chapters only', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '删章测试' })
    db.chapters.create({ projectId: project.id, number: 1, title: '第一章' })
    db.chapters.create({ projectId: project.id, number: 2, title: '第二章' })
    db.chapters.create({ projectId: project.id, number: 3, title: '第三章' })

    const deleted = db.chapters.deleteAfter(project.id, 1)
    const remaining = db.chapters.findByProject(project.id)

    expect(deleted).toBe(2)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.number).toBe(1)
    db.close()
  })

  it('reorder updates chapter numbers', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '排序测试' })
    const ch1 = db.chapters.create({ projectId: project.id, number: 1, title: '第一章' })
    const ch2 = db.chapters.create({ projectId: project.id, number: 2, title: '第二章' })
    const ch3 = db.chapters.create({ projectId: project.id, number: 3, title: '第三章' })

    const reordered = db.chapters.reorder(project.id, [ch2.id, ch1.id, ch3.id])
    expect(reordered.map((chapter) => ({ title: chapter.title, number: chapter.number }))).toEqual([
      { title: '第二章', number: 1 },
      { title: '第一章', number: 2 },
      { title: '第三章', number: 3 }
    ])
    db.close()
  })

  it('insertAfter creates chapter with shifted numbers', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '后插测试' })
    const ch1 = db.chapters.create({ projectId: project.id, number: 1, title: '第一章' })
    const ch2 = db.chapters.create({ projectId: project.id, number: 2, title: '第二章' })

    const inserted = db.chapters.insertAfter(project.id, ch1.id, '新章')
    const chapters = db.chapters.findByProject(project.id)

    expect(inserted.number).toBe(2)
    expect(chapters.map((chapter) => chapter.title)).toEqual(['第一章', '新章', '第二章'])
    expect(chapters.find((chapter) => chapter.id === ch2.id)?.number).toBe(3)
    db.close()
  })

  it('getMaxNumber returns highest chapter number', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '章节号测试' })
    db.chapters.create({ projectId: project.id, number: 1, title: '第一章' })
    db.chapters.create({ projectId: project.id, number: 5, title: '第五章' })

    expect(db.chapters.getMaxNumber(project.id)).toBe(5)
    db.close()
  })

  it('lists chapter metadata without loading raw text', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '章节元数据' })
    db.chapters.create({
      projectId: project.id,
      number: 1,
      title: '第一章',
      rawText: '很长的正文'
    })

    const metadata = db.chapters.findMetadataByProject(project.id)
    const first = metadata[0]

    expect(metadata).toHaveLength(1)
    expect(first).toMatchObject({
      projectId: project.id,
      number: 1,
      title: '第一章',
      wordCount: 5
    })
    expect(first ? 'rawText' in first : true).toBe(false)
    db.close()
  })

  it('findByName returns multiple same-name characters', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '同名测试' })

    db.characters.create({
      projectId: project.id,
      name: '张三',
      disambiguation: '青云宗·张三'
    })
    db.characters.create({
      projectId: project.id,
      name: '张三',
      disambiguation: '天元城·张三'
    })

    const matches = db.characters.findByName(project.id, '张三')
    expect(matches).toHaveLength(2)
    expect(matches.map((item) => item.disambiguation).sort()).toEqual([
      '天元城·张三',
      '青云宗·张三'
    ])
    db.close()
  })

  it('search matches name and aliases', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '搜索测试' })
    db.characters.create({
      projectId: project.id,
      name: '李四',
      aliases: ['四哥'],
      disambiguation: '外门·李四'
    })

    expect(db.characters.search(project.id, '四哥')).toHaveLength(1)
    expect(db.characters.search(project.id, '外门')).toHaveLength(1)
    db.close()
  })

  it('searches 500 stub characters in under 200ms', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '搜索性能' })

    for (let index = 0; index < 500; index += 1) {
      db.characters.create({
        projectId: project.id,
        name: `角色${index}`,
        disambiguation: `标识${index}`
      })
    }

    const start = performance.now()
    const results = db.characters.search(project.id, '角色1', 50)
    const elapsed = performance.now() - start

    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(50)
    expect(elapsed).toBeLessThan(200)
    db.close()
  })

  it('character appearances are ordered by chapter_number', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '出场排序' })
    const character = db.characters.create({ projectId: project.id, name: '王五' })
    const chapter3 = db.chapters.create({ projectId: project.id, number: 3, title: '第三章' })
    const chapter1 = db.chapters.create({ projectId: project.id, number: 1, title: '第一章' })
    const chapter2 = db.chapters.create({ projectId: project.id, number: 2, title: '第二章' })

    db.appearances.append({ characterId: character.id, chapterId: chapter3.id, chapterNumber: 3, mentionCount: 1 })
    db.appearances.append({ characterId: character.id, chapterId: chapter1.id, chapterNumber: 1, mentionCount: 2 })
    db.appearances.append({ characterId: character.id, chapterId: chapter2.id, chapterNumber: 2, mentionCount: 4 })

    const appearances = db.appearances.findByCharacter(character.id)
    expect(appearances.map((item) => item.chapterNumber)).toEqual([1, 2, 3])
    db.close()
  })

  it('loads project characters with batched child hydration', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '批量加载测试' })
    const chapter = db.chapters.create({
      projectId: project.id,
      number: 1,
      title: '第一章',
      rawText: '甲乙丙同行。'
    })

    const first = db.characters.create({
      projectId: project.id,
      name: '甲',
      aliases: ['阿甲']
    })
    const second = db.characters.create({
      projectId: project.id,
      name: '乙',
      aliases: ['阿乙']
    })
    const third = db.characters.create({
      projectId: project.id,
      name: '丙',
      aliases: ['阿丙']
    })

    db.characters.update(first.id, {
      realm: '炼气一层',
      appendFieldHistory: [
        {
          fieldKey: 'realm',
          value: '炼气一层',
          chapterId: chapter.id,
          chapterNumber: 1,
          source: 'recognition'
        }
      ]
    })
    db.characters.upsertRelations(first.id, [
      { targetCharacterId: second.id, type: 'ally', label: '同伴', sinceChapter: 1 }
    ])
    db.appearances.append({
      characterId: third.id,
      chapterId: chapter.id,
      chapterNumber: 1,
      mentionCount: 2,
      excerpt: '丙'
    })

    const database = db.getDatabase()
    const originalPrepare = database.prepare.bind(database)
    const preparedSql: string[] = []
    database.prepare = ((source: string) => {
      preparedSql.push(source)
      return originalPrepare(source)
    }) as typeof database.prepare

    try {
      const loaded = db.characters.findByProject(project.id)
      const loadedFirst = loaded.find((character) => character.id === first.id)
      const loadedSecond = loaded.find((character) => character.id === second.id)
      const loadedThird = loaded.find((character) => character.id === third.id)

      expect(loaded).toHaveLength(3)
      expect(loadedFirst?.aliases).toEqual(['阿甲'])
      expect(loadedFirst?.realm.history).toHaveLength(1)
      expect(loadedFirst?.relations[0]?.targetCharacterId).toBe(second.id)
      expect(loadedSecond?.aliases).toEqual(['阿乙'])
      expect(loadedThird?.appearances[0]?.mentionCount).toBe(2)
      expect(preparedSql).toHaveLength(5)
    } finally {
      database.prepare = originalPrepare as typeof database.prepare
      db.close()
    }
  })

  it('persists data across reconnect', () => {
    const { service, filePath, cleanup: dispose } = createTempDatabaseFile()
    const project = service.projects.create({ title: '持久化测试' })
    service.close()

    const reopened = createTestDatabase(filePath)
    cleanup = () => {
      reopened.close()
      dispose()
    }

    const loaded = reopened.projects.findById(project.id)
    expect(loaded?.title).toBe('持久化测试')
    expect(reopened.getSchemaVersion()).toBe(1)
  })
})

describe('map and setting repositories', () => {
  it('supports map world/node and setting module CRUD', () => {
    const db = createTestDatabase()
    const project = db.projects.create({ title: '地图设定' })

    const world = db.maps.createWorld({ projectId: project.id, name: '九州大陆' })
    const node = db.maps.createNode({ worldId: world.id, name: '青云宗', type: 'sect' })
    const moduleA = db.settings.create({
      projectId: project.id,
      type: 'richtext',
      title: '大纲'
    })
    const moduleB = db.settings.create({
      projectId: project.id,
      type: 'checklist',
      title: '伏笔'
    })

    const reordered = db.settings.reorder(project.id, [moduleB.id, moduleA.id])

    expect(db.maps.findNodesByWorld(world.id)[0]?.id).toBe(node.id)
    expect(reordered.map((item) => item.title)).toEqual(['伏笔', '大纲'])
    db.close()
  })
})
