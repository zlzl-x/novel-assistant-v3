import type { LlmChatMessage } from '../llm/types'
import type { MapNode, MapWorld } from '../models/map'
import { selectMapPlateNodes } from './tessellated-map'

export const MAP_CODEGEN_SYSTEM_PROMPT = `你是小说创作助手的地图代码生成器。根据作者「世界说明」绘制网文开篇地理示意图（单文件 HTML + SVG）。

最高优先级：完整落实世界说明中的地理格局、相对位置、配色、交互要求。说明与下列规范冲突时，以世界说明为准。

地图类型：俯视角区域地理示意图（不是简单色块拼图，不是拼满画布的无缝行政区）。

应包含的地理元素（按说明取舍）：
1. 西侧远景：万里妖山等屏障山脉——画面上方约 1/3，深色山脊 path，墨绿 #166534
2. 城池：青山城等——居中偏西，略方正陆块，青灰 #64748b
3. 矿区：火晶岩矿——城东，面积可略大于其他区域，橙褐 #c2410c；矿洞/棚区/监工台仅作区内点缀，不单独设 data-place-id
4. 河流：黑水河等——弯曲 path，浅蓝描边/半透明填充，经城池北缘，自西北向东南
5. 荒原：乱石荒原等——南侧土黄 #ca8a04 陆地，点缀即可
6. 道路/矿道：细虚线 path 连接城池与矿区，不设 data-place-id

可点击区域（6~8 个）：
- 结构：<g data-place-id="id" class="region"> + 区域轮廓(<path>或<polygon>) + <text>中文地名</text>
- 无节点时 id 用 region-1、region-2…，名称必须来自世界说明（如万里妖山、青山城、火晶岩矿、黑水河、乱石荒原）
- type=building 的节点不单独成区；不要画具体人物

布局建议（viewBox="0 0 1000 700"）：
- 青山城居中偏西，是视觉中心之一
- 火晶岩矿在青山城东侧，比邻或通过矿道相连
- 妖山在西侧远景占上方
- 黑水河在城北
- 荒原在南侧
- 允许区域之间留白/河流分隔，不要强行拼成无缝拼图

样式与交互（必须写）：
body { margin:0; background:#e8eef5; }
.region { cursor:pointer; }
.region:hover path, .region:hover polygon { stroke:#fbbf24; stroke-width:3; filter:drop-shadow(0 0 6px rgba(251,191,36,0.5)); }
地名用中文，text-anchor="middle"，放在区域旁或区域内易读位置

输出约束：
- 单个 <svg> 放 body 内，总长度 ≤180 行
- 必须完整闭合 </svg></body></html>
- 禁止外链、fetch、eval、具体人物
- 只输出 HTML 源码，不要 markdown 围栏，不要解释`

export const MAP_REGION_EXTRACT_SYSTEM_PROMPT = `你是小说地图区域提取器。根据世界说明，提取主要地理板块名称（3-8 个），用于拼图式地图。

规则：
1. 只提取宏观区域：山脉、城池、荒野、矿区、河流地带等
2. 排除建筑级设施：矿道、棚区、监工、工棚、矿洞入口、哨所等
3. 按说明中的地理顺序排列（通常从西到东，或从北到南）
4. id 使用 region-1、region-2…；name 用简短中文地名（2-8 字）
5. 只输出 JSON：{"regions":[{"id":"region-1","name":"万里妖山"}]}
6. 不要 markdown 围栏，不要解释`

export const MAP_LAYOUT_SYSTEM_PROMPT = `你是小说创作助手的地图布局规划器（仅作备用）。请输出 JSON 布局。不要 HTML。`

function formatNodeList(nodes: MapNode[]): string {
  const plateNodes = selectMapPlateNodes(nodes)
  if (plateNodes.length === 0) {
    return [
      '（暂无地点节点）',
      '请从「世界说明」提取 6~8 个可点击宏观区域（如万里妖山、青山城、火晶岩矿、黑水河、乱石荒原等），',
      'data-place-id 使用 region-1、region-2…，名称与说明一致。',
      '矿道/棚区/监工台等画在火晶岩矿区域内，不单独设 id。'
    ].join('\n')
  }
  return plateNodes
    .map((node) => {
      const geoParts = [
        node.geo?.relativePosition ? `相对位置：${node.geo.relativePosition}` : '',
        node.geo?.distanceHint ? `距离：${node.geo.distanceHint}` : '',
        node.geo?.neighbors?.length ? `邻接：${node.geo.neighbors.join('、')}` : ''
      ].filter(Boolean)
      return [
        `- id: ${node.id}`,
        `  名称: ${node.name}`,
        `  类型: ${node.type}`,
        node.summary ? `  说明: ${node.summary}` : '',
        geoParts.length ? `  地理: ${geoParts.join('；')}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')
}

function buildUserPrompt(input: {
  world: MapWorld
  nodes: MapNode[]
  extraPrompt?: string
}): string {
  const style = input.world.stylePreset?.trim() || '网文开篇地理示意图，布局清晰优于细节繁复'
  return [
    `世界名称：${input.world.name}`,
    `视觉风格：${style}`,
    `世界说明（必须严格遵循）：\n${input.world.description || '（作者未填写）'}`,
    `地点节点（有则 data-place-id 必须用下列 id；无则按说明自建 region-1…）：\n${formatNodeList(input.nodes)}`,
    '请按世界说明绘制地理示意图：保留山脉/河流/道路/城池/矿区/荒原的相对位置与配色，不要改成简单拼图或忽略说明。',
    '火晶岩矿区域略大；每个可点击区域支持悬停高亮；不要画人物。',
    input.extraPrompt ? `补充要求：\n${input.extraPrompt}` : ''
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildMapRegionExtractMessages(input: {
  world: MapWorld
  extraPrompt?: string
}): LlmChatMessage[] {
  const style = input.world.stylePreset?.trim() || '网文开篇地理示意图'
  return [
    { role: 'system', content: MAP_REGION_EXTRACT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        `世界名称：${input.world.name}`,
        `视觉风格：${style}`,
        `世界说明：\n${input.world.description || '（未填写）'}`,
        '请提取主要地理板块名称，排除矿道/棚区/建筑级设施。',
        input.extraPrompt ? `补充要求：\n${input.extraPrompt}` : ''
      ]
        .filter(Boolean)
        .join('\n\n')
    }
  ]
}

export function buildMapLayoutMessages(input: {
  world: MapWorld
  nodes: MapNode[]
  extraPrompt?: string
}): LlmChatMessage[] {
  return [
    { role: 'system', content: MAP_LAYOUT_SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) }
  ]
}

export function buildMapCodegenMessages(input: {
  world: MapWorld
  nodes: MapNode[]
  extraPrompt?: string
}): LlmChatMessage[] {
  return [
    { role: 'system', content: MAP_CODEGEN_SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(input) }
  ]
}
