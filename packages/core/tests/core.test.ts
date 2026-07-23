import { describe, expect, it } from 'vitest'
import type { Project } from '../src'

describe('@novel-assistant/core', () => {
  it('exports Project type shape', () => {
    const project: Project = {
      id: 'test-id',
      title: '测试作品',
      networkMode: 'single',
      genre: 'generic',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 1
    }

    expect(project.title).toBe('测试作品')
    expect(project.networkMode).toBe('single')
  })
})
