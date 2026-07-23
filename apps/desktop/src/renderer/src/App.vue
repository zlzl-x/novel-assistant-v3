<script setup lang="ts">
import { RouterView } from 'vue-router'
import { NConfigProvider, NDialogProvider, NMessageProvider, zhCN, dateZhCN } from 'naive-ui'
import type { GlobalThemeOverrides } from 'naive-ui'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#2563eb',
    primaryColorHover: '#1d4ed8',
    primaryColorPressed: '#1e40af',
    borderRadius: '10px',
    borderRadiusSmall: '8px',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    textColor1: '#0f172a',
    textColor2: '#334155',
    textColor3: '#64748b'
  },
  Card: {
    borderRadius: '14px'
  },
  Button: {
    borderRadiusMedium: '10px',
    borderRadiusLarge: '12px'
  },
  Input: {
    borderRadius: '10px'
  }
}
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <n-dialog-provider>
      <n-message-provider>
        <RouterView />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}
</style>
