import { describe, expect, it } from 'vitest'
import type { Character } from '../src/models/character'
import {
  AGGREGATE_NODE_ID,
  filterCharactersForDisplay,
  toVisNetwork
} from '../src/graph/toVisNetwork'

function createCharacter(overrides: Partial<Character> = {}): Character {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'char-1',
    projectId: 'proj-1',
    name: '张三',
    aliases: [],
    disambiguation: '青云宗',
    role: 'major',
    identity: { current: '外门弟子', history: [] },
    realm: { current: '筑基', history: [] },
    location: { current: '青云宗', history: [] },
    faction: { current: '青云宗', history: [] },
    summary: '',
    notes: '',
    status: '正常',
    panel: { entries: [] },
    relations: [],
    mentionCount: 5,
    appearances: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('filterCharactersForDisplay', () => {
  it('shows all characters when count <= 80', () => {
    const characters = Array.from({ length: 80 }, (_, index) =>
      createCharacter({ id: `c-${index}`, name: `角色${index}`, role: 'mentioned' })
    )
    const result = filterCharactersForDisplay(characters, false)
    expect(result.visible).toHaveLength(80)
    expect(result.requiresShowAll).toBe(false)
  })

  it('filters to major+ when 81-200 without showAll', () => {
    const characters = [
      ...Array.from({ length: 79 }, (_, index) =>
        createCharacter({ id: `minor-${index}`, role: 'minor' })
      ),
      createCharacter({ id: 'major-1', role: 'major' }),
      createCharacter({ id: 'major-2', role: 'major' })
    ]
    const result = filterCharactersForDisplay(characters, false)
    expect(result.visible).toHaveLength(2)
    expect(result.requiresShowAll).toBe(true)
    expect(result.aggregatedCount).toBe(79)
  })
})

describe('toVisNetwork', () => {
  it('places protagonist at center in single mode', () => {
    const protagonist = createCharacter({
      id: 'hero',
      name: '主角',
      role: 'protagonist'
    })
    const ally = createCharacter({
      id: 'ally',
      name: '盟友',
      protagonistRelation: { type: '同门', proximity: 5 }
    })
    const graph = toVisNetwork({
      characters: [protagonist, ally],
      protagonistId: 'hero',
      networkMode: 'single'
    })

    const heroNode = graph.nodes.find((node) => node.id === 'hero')
    const allyNode = graph.nodes.find((node) => node.id === 'ally')
    expect(heroNode?.x).toBe(0)
    expect(heroNode?.y).toBe(0)
    expect(allyNode?.x).not.toBe(0)
  })

  it('uses proximity to set radius', () => {
    const protagonist = createCharacter({ id: 'hero', role: 'protagonist' })
    const near = createCharacter({
      id: 'near',
      protagonistRelation: { type: '师徒', proximity: 5 }
    })
    const far = createCharacter({
      id: 'far',
      protagonistRelation: { type: '路人', proximity: 1 }
    })
    const graph = toVisNetwork({
      characters: [protagonist, near, far],
      protagonistId: 'hero',
      networkMode: 'single'
    })
    const nearNode = graph.nodes.find((node) => node.id === 'near')!
    const farNode = graph.nodes.find((node) => node.id === 'far')!
    const nearDistance = Math.hypot(nearNode.x ?? 0, nearNode.y ?? 0)
    const farDistance = Math.hypot(farNode.x ?? 0, farNode.y ?? 0)
    expect(nearDistance).toBeLessThan(farDistance)
  })

  it('creates dashed edges between centers in ensemble mode', () => {
    const centerA = createCharacter({
      id: 'a',
      name: '中心A',
      role: 'protagonist',
      isNetworkCenter: true
    })
    const centerB = createCharacter({
      id: 'b',
      name: '中心B',
      role: 'major',
      isNetworkCenter: true
    })
    const graph = toVisNetwork({
      characters: [centerA, centerB],
      networkMode: 'ensemble'
    })
    expect(graph.edges.some((edge) => Array.isArray(edge.dashes) || edge.dashes === true)).toBe(true)
    expect(graph.nodes.filter((node) => node.id !== AGGREGATE_NODE_ID)).toHaveLength(2)
  })

  it('adds aggregate node when more than 200 characters', () => {
    const characters = [
      createCharacter({ id: 'hero', role: 'protagonist' }),
      ...Array.from({ length: 200 }, (_, index) =>
        createCharacter({ id: `minor-${index}`, role: 'minor' })
      )
    ]
    const graph = toVisNetwork({
      characters,
      protagonistId: 'hero',
      networkMode: 'single'
    })
    expect(graph.nodes.some((node) => node.id === AGGREGATE_NODE_ID)).toBe(true)
    expect(graph.meta.aggregatedCount).toBeGreaterThan(0)
  })

  it('maps relation edges with labels', () => {
    const left = createCharacter({ id: 'left', name: '甲' })
    const right = createCharacter({
      id: 'right',
      name: '乙',
      relations: [{ targetCharacterId: 'left', type: '同门', strength: 4 }]
    })
    const graph = toVisNetwork({
      characters: [left, right],
      networkMode: 'single'
    })
    expect(graph.edges.some((edge) => edge.label === '同门' && (edge.width ?? 0) >= 1)).toBe(true)
  })

  it('highlights protagonist edges and adds synthetic edge for legacy data', () => {
    const protagonist = createCharacter({ id: 'hero', name: '主角', role: 'protagonist' })
    const ally = createCharacter({
      id: 'ally',
      name: '盟友',
      protagonistRelation: { type: '师徒', proximity: 5 }
    })
    const linked = createCharacter({
      id: 'linked',
      name: '旧友',
      relations: [{ targetCharacterId: 'hero', type: '同门', strength: 4 }]
    })
    const graph = toVisNetwork({
      characters: [protagonist, ally, linked],
      protagonistId: 'hero',
      networkMode: 'single'
    })

    const protagonistEdge = graph.edges.find((edge) => edge.from === 'linked' && edge.to === 'hero')
    expect(protagonistEdge?.color?.color).toBe('#f97316')

    const syntheticEdge = graph.edges.find((edge) => edge.id.includes('synthetic'))
    expect(syntheticEdge?.dashes).toEqual([8, 6])
    expect(syntheticEdge?.label).toBe('师徒')
  })

  it('fixes protagonist node position', () => {
    const protagonist = createCharacter({ id: 'hero', role: 'protagonist' })
    const graph = toVisNetwork({
      characters: [protagonist],
      protagonistId: 'hero',
      networkMode: 'single'
    })
    const heroNode = graph.nodes.find((node) => node.id === 'hero')
    expect(heroNode?.fixed).toEqual({ x: true, y: true })
  })

  it('renders full name inside node and keeps tooltip name-only', () => {
    const protagonist = createCharacter({ id: 'hero', name: '赵侯', role: 'protagonist' })
    const ally = createCharacter({
      id: 'ally',
      name: '牛管事',
      disambiguation: '火晶岩矿',
      identity: { current: '管事', history: [] },
      realm: { current: '筑基', history: [] }
    })
    const graph = toVisNetwork({
      characters: [protagonist, ally],
      protagonistId: 'hero',
      networkMode: 'single'
    })

    const allyNode = graph.nodes.find((node) => node.id === 'ally')
    expect(allyNode?.label).toBe('牛管事')
    expect(allyNode?.shape).toBe('circle')
    expect(allyNode?.font?.align).toBe('center')
    expect(allyNode?.title).toBe('牛管事')
    expect(allyNode?.title).not.toContain('筑基')
  })
})
