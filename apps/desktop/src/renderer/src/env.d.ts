/// <reference types="vite/client" />

declare global {
  interface Window {
    novelApi: import('@novel-assistant/core').NovelApi
  }
}

export {}
