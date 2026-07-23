import type { MapNode } from '@novel-assistant/core'
import type { TreeOption } from 'naive-ui'

export function buildMapTreeOptions(nodes: MapNode[]): TreeOption[] {
  const optionMap = new Map<string, TreeOption>()
  for (const node of nodes) {
    optionMap.set(node.id, {
      key: node.id,
      label: node.name,
      children: []
    })
  }

  const roots: TreeOption[] = []
  for (const node of nodes) {
    const option = optionMap.get(node.id)
    if (!option) continue
    if (node.parentId && optionMap.has(node.parentId)) {
      const parent = optionMap.get(node.parentId)!
      parent.children = parent.children ?? []
      parent.children.push(option)
    } else {
      roots.push(option)
    }
  }
  return roots
}
