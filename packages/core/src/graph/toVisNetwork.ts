import type { Character } from '../models/character'
import { PROXIMITY_MAX, PROXIMITY_MIN } from '../constants'
import {
  getLayoutProximityForProtagonist,
  migrateProtagonistRelationToEdges
} from './migrateProtagonistRelationToEdges'

export const AGGREGATE_NODE_ID = '__aggregate__'
export const BASE_RADIUS = 72

export interface VisNetworkNode {
  id: string
  label: string
  displayName?: string
  size: number
  color: {
    background: string
    border: string
    highlight?: { background: string; border: string }
  }
  x?: number
  y?: number
  fixed?: boolean | { x: boolean; y: boolean }
  title?: string
  shape?: string
  shadow?: boolean | { enabled: boolean; color?: string; size?: number; x?: number; y?: number }
  font?: {
    color?: string
    size?: number
    face?: string
    vadjust?: number
    align?: string
    multi?: boolean
    strokeWidth?: number
    strokeColor?: string
  }
  borderWidth?: number
  margin?: number | { top?: number; right?: number; bottom?: number; left?: number }
}

export interface VisNetworkEdge {
  id: string
  from: string
  to: string
  label?: string
  width?: number
  title?: string
  dashes?: boolean | number[]
  color?: {
    color: string
    opacity?: number
    highlight?: string
    inherit?: boolean
  }
  arrows?: string | { to?: { enabled?: boolean; scaleFactor?: number } }
  font?: { color?: string; size?: number; background?: string; strokeWidth?: number }
  smooth?: boolean | { enabled?: boolean; type?: string; roundness?: number }
}

export interface ToVisNetworkInput {
  characters: Character[]
  protagonistId?: string | null
  networkMode: 'single' | 'ensemble'
  showAll?: boolean
}

export interface VisNetworkGraph {
  nodes: VisNetworkNode[]
  edges: VisNetworkEdge[]
  meta: {
    totalCount: number
    displayedCount: number
    aggregatedCount: number
    requiresShowAll: boolean
  }
}

const ROLE_SIZE: Record<Character['role'], number> = {
  protagonist: 32,
  major: 24,
  minor: 18,
  mentioned: 14
}

const ROLE_COLOR: Record<
  Character['role'],
  { background: string; border: string; font: string; glow: string }
> = {
  protagonist: {
    background: '#ea580c',
    border: '#fdba74',
    font: '#fff7ed',
    glow: 'rgba(251, 146, 60, 0.55)'
  },
  major: {
    background: '#3b82f6',
    border: '#93c5fd',
    font: '#eff6ff',
    glow: 'rgba(59, 130, 246, 0.35)'
  },
  minor: {
    background: '#475569',
    border: '#94a3b8',
    font: '#f8fafc',
    glow: 'rgba(100, 116, 139, 0.3)'
  },
  mentioned: {
    background: '#334155',
    border: '#64748b',
    font: '#e2e8f0',
    glow: 'rgba(51, 65, 85, 0.25)'
  }
}

function clampProximity(value?: number): number {
  if (value === undefined || Number.isNaN(value)) return 3
  return Math.min(PROXIMITY_MAX, Math.max(PROXIMITY_MIN, Math.round(value)))
}

function polarToXY(angle: number, radius: number): { x: number; y: number } {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  }
}

function findProtagonist(
  characters: Character[],
  protagonistId?: string | null
): Character | undefined {
  if (protagonistId) {
    return characters.find((character) => character.id === protagonistId)
  }
  return characters.find((character) => character.role === 'protagonist')
}

function findCenters(characters: Character[], protagonistId?: string | null): Character[] {
  const centers = characters.filter(
    (character) =>
      character.isNetworkCenter || character.role === 'protagonist' || character.id === protagonistId
  )
  if (centers.length > 0) return centers
  const protagonist = findProtagonist(characters, protagonistId)
  return protagonist ? [protagonist] : []
}

export function filterCharactersForDisplay(
  characters: Character[],
  showAll: boolean
): {
  visible: Character[]
  aggregatedCount: number
  requiresShowAll: boolean
} {
  const total = characters.length
  if (total <= 80) {
    return { visible: characters, aggregatedCount: 0, requiresShowAll: false }
  }

  if (total <= 200) {
    if (showAll) {
      return { visible: characters, aggregatedCount: 0, requiresShowAll: true }
    }
    const visible = characters.filter(
      (character) => character.role === 'protagonist' || character.role === 'major'
    )
    return {
      visible,
      aggregatedCount: total - visible.length,
      requiresShowAll: true
    }
  }

  const visible = characters.filter(
    (character) => character.role === 'protagonist' || character.role === 'major'
  )
  return {
    visible,
    aggregatedCount: total - visible.length,
    requiresShowAll: false
  }
}

function computeNodeSize(character: Character, protagonistId?: string | null): number {
  const base = ROLE_SIZE[character.role]
  const proximity = getLayoutProximityForProtagonist(character, protagonistId)
  const proximityBoost = proximity * 2.2
  const mentionBoost = Math.min(10, Math.log2(character.mentionCount + 1) * 2.5)
  const heroBoost =
    character.id === protagonistId || character.role === 'protagonist' ? 6 : 0
  return Math.round(base + proximityBoost + mentionBoost + heroBoost)
}

export function formatNodeLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  if (trimmed.length <= 4) return trimmed
  const splitAt = Math.ceil(trimmed.length / 2)
  const firstLine = trimmed.slice(0, splitAt)
  const secondLine = trimmed.slice(splitAt)
  return secondLine ? `${firstLine}\n${secondLine}` : firstLine
}

function computeNodeMargin(radius: number): number {
  return Math.max(8, Math.round(radius * 0.42))
}

function buildNode(
  character: Character,
  position: { x: number; y: number },
  protagonistId?: string | null
): VisNetworkNode {
  const colors = ROLE_COLOR[character.role]
  const size = computeNodeSize(character, protagonistId)
  const isHero = character.id === protagonistId || character.role === 'protagonist'
  const label = formatNodeLabel(character.name)
  const fontSize = Math.max(11, Math.min(15, size * 0.38))
  const margin = computeNodeMargin(size)

  return {
    id: character.id,
    label,
    displayName: label,
    size,
    margin,
    color: {
      background: colors.background,
      border: colors.border,
      highlight: {
        background: isHero ? '#fb923c' : '#60a5fa',
        border: isHero ? '#fff7ed' : '#dbeafe'
      }
    },
    x: position.x,
    y: position.y,
    fixed: isHero ? { x: true, y: true } : false,
    title: character.name,
    shape: 'circle',
    shadow: {
      enabled: true,
      color: colors.glow,
      size: isHero ? 18 : 12,
      x: 0,
      y: 0
    },
    font: {
      color: colors.font,
      size: fontSize,
      face: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      align: 'center',
      multi: true,
      vadjust: 0,
      strokeWidth: 1,
      strokeColor: 'rgba(15, 23, 42, 0.28)'
    },
    borderWidth: isHero ? 3 : 2
  }
}

function layoutSingleMode(
  characters: Character[],
  protagonistId: string | null | undefined,
  nodes: VisNetworkNode[]
): void {
  const protagonist = findProtagonist(characters, protagonistId)
  const nonProtagonist = characters.filter((character) => character.id !== protagonist?.id)

  if (protagonist) {
    nodes.push(buildNode(protagonist, { x: 0, y: 0 }, protagonistId))
  }

  const withProximity = nonProtagonist.map((character) => ({
    character,
    proximity: getLayoutProximityForProtagonist(character, protagonistId)
  }))
  withProximity.sort((left, right) => right.proximity - left.proximity)

  withProximity.forEach((item, index) => {
    const radius = BASE_RADIUS * (6 - item.proximity) * 0.85
    const angle = (index / Math.max(withProximity.length, 1)) * Math.PI * 2
    nodes.push(buildNode(item.character, polarToXY(angle, radius), protagonistId))
  })
}

function layoutEnsembleMode(
  characters: Character[],
  protagonistId: string | null | undefined,
  nodes: VisNetworkNode[]
): VisNetworkEdge[] {
  const centerEdges: VisNetworkEdge[] = []
  const centers = findCenters(characters, protagonistId)
  const centerIds = new Set(centers.map((center) => center.id))
  const centerPositions = new Map<string, { x: number; y: number }>()

  const centerRadius = 130
  centers.forEach((center, index) => {
    const angle = (index / centers.length) * Math.PI * 2 - Math.PI / 2
    const position = polarToXY(angle, centers.length === 1 ? 0 : centerRadius)
    centerPositions.set(center.id, position)
    nodes.push(buildNode(center, position, protagonistId))
  })

  for (let left = 0; left < centers.length; left += 1) {
    for (let right = left + 1; right < centers.length; right += 1) {
      const from = centers[left]!
      const to = centers[right]!
      centerEdges.push({
        id: `center-${from.id}-${to.id}`,
        from: from.id,
        to: to.id,
        label: '并列',
        dashes: [6, 4],
        width: 1.2,
        smooth: { enabled: true, type: 'curvedCW', roundness: 0.15 },
        arrows: { to: { enabled: true, scaleFactor: 0.45 } },
        font: { color: '#cbd5e1', size: 10, background: 'rgba(30,41,59,0.9)', strokeWidth: 0 },
        color: { color: '#475569', opacity: 0.65 }
      })
    }
  }

  const buckets = new Map<string, Character[]>(centers.map((center) => [center.id, []]))
  const nonCenters = characters.filter((character) => !centerIds.has(character.id))

  for (const character of nonCenters) {
    let assignedCenterId = centers[0]?.id
    const relationToCenter = character.relations.find((relation) =>
      centerIds.has(relation.targetCharacterId)
    )
    if (relationToCenter) {
      assignedCenterId = relationToCenter.targetCharacterId
    } else if (protagonistId && centerIds.has(protagonistId)) {
      assignedCenterId = protagonistId
    }
    if (assignedCenterId) {
      buckets.get(assignedCenterId)?.push(character)
    }
  }

  for (const [centerId, bucket] of buckets) {
    const centerPosition = centerPositions.get(centerId)
    if (!centerPosition) continue
    bucket.forEach((character, index) => {
      const proximity = getLayoutProximityForProtagonist(character, protagonistId)
      const radius = BASE_RADIUS * (6 - proximity) * 0.6
      const angle = (index / Math.max(bucket.length, 1)) * Math.PI * 2
      const offset = polarToXY(angle, radius)
      nodes.push(
        buildNode(
          character,
          {
            x: centerPosition.x + offset.x,
            y: centerPosition.y + offset.y
          },
          protagonistId
        )
      )
    })
  }

  return centerEdges
}

function buildCharacterEdges(
  characters: Character[],
  visibleIds: Set<string>,
  protagonistId?: string | null
): VisNetworkEdge[] {
  const edges: VisNetworkEdge[] = []
  const edgeIds = new Set<string>()

  for (const character of characters) {
    for (const relation of character.relations) {
      if (!visibleIds.has(character.id) || !visibleIds.has(relation.targetCharacterId)) continue
      const edgeId = `${character.id}-${relation.targetCharacterId}`
      if (edgeIds.has(edgeId)) continue
      edgeIds.add(edgeId)

      const toProtagonist = protagonistId !== undefined && relation.targetCharacterId === protagonistId
      edges.push({
        id: edgeId,
        from: character.id,
        to: relation.targetCharacterId,
        label: relation.type,
        width: toProtagonist ? 2.5 : Math.max(1, (relation.strength ?? 2) * 0.5),
        title: relation.notes ?? relation.label ?? relation.type,
        dashes: false,
        arrows: { to: { enabled: true, scaleFactor: toProtagonist ? 0.65 : 0.5 } },
        smooth: { enabled: true, type: 'curvedCW', roundness: 0.22 },
        font: {
          color: toProtagonist ? '#fdba74' : '#94a3b8',
          size: 10,
          background: 'rgba(30, 41, 59, 0.92)',
          strokeWidth: 0
        },
        color: {
          color: toProtagonist ? '#f97316' : '#64748b',
          highlight: toProtagonist ? '#fb923c' : '#94a3b8',
          opacity: toProtagonist ? 0.95 : 0.65,
          inherit: false
        }
      })
    }

    const synthetic = migrateProtagonistRelationToEdges(character, protagonistId)
    if (
      synthetic &&
      visibleIds.has(character.id) &&
      visibleIds.has(synthetic.targetCharacterId)
    ) {
      const edgeId = `${character.id}-${synthetic.targetCharacterId}-synthetic`
      if (!edgeIds.has(edgeId) && !edgeIds.has(`${character.id}-${synthetic.targetCharacterId}`)) {
        edgeIds.add(edgeId)
        edges.push({
          id: edgeId,
          from: character.id,
          to: synthetic.targetCharacterId,
          label: synthetic.type,
          width: 2,
          title: `${synthetic.type}（由旧资料迁移）`,
          dashes: [8, 6],
          arrows: { to: { enabled: true, scaleFactor: 0.55 } },
          smooth: { enabled: true, type: 'curvedCW', roundness: 0.18 },
          font: {
            color: '#fdba74',
            size: 10,
            background: 'rgba(30, 41, 59, 0.92)',
            strokeWidth: 0
          },
          color: {
            color: '#fb923c',
            highlight: '#fdba74',
            opacity: 0.75,
            inherit: false
          }
        })
      }
    }
  }
  return edges
}

export function toVisNetwork(input: ToVisNetworkInput): VisNetworkGraph {
  const { visible, aggregatedCount, requiresShowAll } = filterCharactersForDisplay(
    input.characters,
    input.showAll ?? false
  )

  const nodes: VisNetworkNode[] = []
  let centerEdges: VisNetworkEdge[] = []
  if (input.networkMode === 'ensemble') {
    centerEdges = layoutEnsembleMode(visible, input.protagonistId, nodes)
  } else {
    layoutSingleMode(visible, input.protagonistId, nodes)
  }

  if (aggregatedCount > 0 && input.characters.length > 200) {
    nodes.push({
      id: AGGREGATE_NODE_ID,
      label: `+${aggregatedCount}`,
      displayName: `+${aggregatedCount}`,
      size: 24,
      margin: 10,
      color: { background: '#475569', border: '#94a3b8' },
      x: 0,
      y: BASE_RADIUS * 5,
      fixed: { x: true, y: true },
      title: `其他 ${aggregatedCount} 人`,
      shape: 'circle',
      font: {
        color: '#f8fafc',
        size: 11,
        align: 'center',
        multi: false,
        vadjust: 0,
        strokeColor: 'rgba(15, 23, 42, 0.28)'
      }
    })
  }

  const visibleIds = new Set(nodes.map((node) => node.id).filter((id) => id !== AGGREGATE_NODE_ID))
  const edges = [...buildCharacterEdges(visible, visibleIds, input.protagonistId), ...centerEdges]

  return {
    nodes,
    edges,
    meta: {
      totalCount: input.characters.length,
      displayedCount: nodes.length,
      aggregatedCount,
      requiresShowAll
    }
  }
}

export function getProtagonistNodePosition(graph: VisNetworkGraph): { x: number; y: number } | null {
  const protagonistNode = graph.nodes.find((node) => node.x === 0 && node.y === 0 && node.id !== AGGREGATE_NODE_ID)
  if (!protagonistNode) return null
  return { x: protagonistNode.x ?? 0, y: protagonistNode.y ?? 0 }
}
