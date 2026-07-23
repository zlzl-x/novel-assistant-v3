<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { workspaceNavItems } from '@/constants/icons'

type NavKey = 'manuscript' | 'map' | 'characters' | 'settings'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => String(route.params.id ?? ''))
const activeNav = computed(() => (route.meta.nav as NavKey | undefined) ?? 'manuscript')

function navigate(routeName: string): void {
  router.push({ name: routeName, params: { id: projectId.value } })
}
</script>

<template>
  <nav class="main-nav">
    <button
      v-for="item in workspaceNavItems"
      :key="item.key"
      type="button"
      class="main-nav-item"
      :class="{ 'main-nav-item--active': activeNav === item.key }"
      @click="navigate(item.routeName)"
    >
      <span class="main-nav-icon">
        <AppIcon :name="item.icon" :size="20" />
      </span>
      <span class="main-nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.main-nav {
  display: flex;
  width: 5.5rem;
  flex-shrink: 0;
  flex-direction: column;
  gap: 0.35rem;
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 1rem 0.65rem;
}

.main-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  border: none;
  border-radius: 0.9rem;
  background: transparent;
  padding: 0.7rem 0.35rem;
  color: #64748b;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.main-nav-item:hover {
  background: rgba(255, 255, 255, 0.85);
  color: #334155;
}

.main-nav-item--active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.main-nav-icon {
  display: flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
}

.main-nav-item--active .main-nav-icon {
  background: #eff6ff;
}

.main-nav-label {
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>
