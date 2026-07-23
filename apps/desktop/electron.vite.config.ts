import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

const coreAlias = resolve(__dirname, '../../packages/core/src/index.ts')
const dbAlias = resolve(__dirname, '../../packages/db/src/index.ts')

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@novel-assistant/core', '@novel-assistant/db']
      })
    ],
    build: {
      rollupOptions: {
        external: ['better-sqlite3']
      }
    },
    resolve: {
      alias: {
        '@novel-assistant/core': coreAlias,
        '@novel-assistant/db': dbAlias
      }
    }
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@na/ipc']
      })
    ],
    resolve: {
      alias: {
        '@na/ipc': resolve(__dirname, '../../packages/core/src/ipc-types.ts')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@novel-assistant/core': coreAlias,
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
