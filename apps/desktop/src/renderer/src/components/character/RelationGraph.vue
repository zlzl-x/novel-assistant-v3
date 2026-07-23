<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { DataSet } from 'vis-data'
import { Network } from 'vis-network'
import { AGGREGATE_NODE_ID, type VisNetworkGraph } from '@novel-assistant/core'
import 'vis-network/styles/vis-network.min.css'

const props = defineProps<{
  graph: VisNetworkGraph
}>()

const emit = defineEmits<{
  selectCharacter: [characterId: string]
  selectAggregate: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const network = shallowRef<Network | null>(null)

const physicsOptions = {
  enabled: true,
  solver: 'forceAtlas2Based' as const,
  forceAtlas2Based: {
    gravitationalConstant: -58,
    centralGravity: 0.012,
    springLength: 140,
    springConstant: 0.045,
    damping: 0.48,
    avoidOverlap: 0.85
  },
  stabilization: {
    enabled: true,
    iterations: 260,
    updateInterval: 20,
    fit: true
  }
}

const networkOptions = {
  physics: physicsOptions,
  interaction: {
    hover: true,
    tooltipDelay: 80,
    zoomView: true,
    dragView: true,
    dragNodes: true,
    hideEdgesOnDrag: false,
    navigationButtons: false,
    keyboard: false
  },
  nodes: {
    borderWidth: 2,
    borderWidthSelected: 3,
    shadow: true,
    shape: 'circle',
    font: {
      align: 'center',
      multi: true,
      vadjust: 0
    },
    chosen: {
      node: (values: { size?: number }, _id: string, selected: boolean, hovering: boolean) => {
        if (selected || hovering) {
          values.size = (values.size ?? 20) * 1.06
        }
      }
    }
  },
  edges: {
    smooth: { enabled: true, type: 'dynamic', roundness: 0.35 },
    chosen: true,
    selectionWidth: 2
  },
  layout: {
    improvedLayout: true,
    randomSeed: 11
  }
}

function createNetwork(): void {
  if (!containerRef.value) return
  network.value?.destroy()

  const nodes = new DataSet(props.graph.nodes)
  const edges = new DataSet(props.graph.edges)
  network.value = new Network(containerRef.value, { nodes, edges }, networkOptions)

  network.value.on('click', (params) => {
    const nodeId = params.nodes[0]
    if (!nodeId) return
    if (nodeId === AGGREGATE_NODE_ID) {
      emit('selectAggregate')
      return
    }
    emit('selectCharacter', nodeId)
  })

  network.value.on('dragEnd', () => {
    network.value?.setOptions({ physics: { enabled: false } })
  })

  network.value.on('stabilizationIterationsDone', () => {
    network.value?.fit({ animation: { duration: 450, easingFunction: 'easeInOutQuad' } })
    network.value?.setOptions({ physics: { enabled: false } })
  })
}

function updateGraph(): void {
  if (!network.value) return
  network.value.setData({
    nodes: new DataSet(props.graph.nodes),
    edges: new DataSet(props.graph.edges)
  })
  const hasFixedLayout = props.graph.nodes.some((node) => node.fixed === true || (typeof node.fixed === 'object' && node.fixed.x))
  if (hasFixedLayout) {
    network.value.setOptions({ physics: { enabled: false } })
    network.value.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } })
    return
  }
  network.value.setOptions({ physics: { ...physicsOptions, enabled: true } })
  network.value.startSimulation()
}

function focusNode(characterId: string): void {
  network.value?.focus(characterId, {
    scale: 1.2,
    animation: { duration: 500, easingFunction: 'easeInOutQuad' }
  })
  network.value?.selectNodes([characterId])
}

onMounted(createNetwork)
watch(() => props.graph, updateGraph)

onBeforeUnmount(() => {
  network.value?.destroy()
  network.value = null
})

defineExpose({ focusNode })
</script>

<template>
  <div class="relation-graph-shell">
    <div ref="containerRef" class="relation-graph" />
  </div>
</template>

<style scoped>
.relation-graph-shell {
  position: relative;
  height: 100%;
  min-height: 480px;
  width: 100%;
  overflow: hidden;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background:
    radial-gradient(circle at 20% 15%, rgba(59, 130, 246, 0.12), transparent 42%),
    radial-gradient(circle at 80% 85%, rgba(234, 88, 12, 0.1), transparent 38%),
    linear-gradient(180deg, #111827 0%, #0b1220 55%, #0f172a 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 40px rgba(2, 6, 23, 0.35);
}

.relation-graph-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, black 35%, transparent 100%);
}

.relation-graph {
  position: relative;
  z-index: 1;
  height: 100%;
  min-height: 480px;
  width: 100%;
}

.relation-graph :deep(.vis-network) {
  outline: none;
  background: transparent;
}

.relation-graph :deep(canvas) {
  border-radius: 1rem;
}
</style>
