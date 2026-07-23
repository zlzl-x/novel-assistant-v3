import { describe, expect, it } from 'vitest'
import { PROXIMITY_MAX, PROXIMITY_MIN, RECOGNITION_FIELD_KEYS } from '../src'

describe('@novel-assistant/core constants', () => {
  it('exports recognition field keys', () => {
    expect(RECOGNITION_FIELD_KEYS).toContain('身份/称号')
    expect(RECOGNITION_FIELD_KEYS).toContain('境界')
    expect(RECOGNITION_FIELD_KEYS.length).toBeGreaterThanOrEqual(10)
  })

  it('exports proximity bounds', () => {
    expect(PROXIMITY_MIN).toBe(1)
    expect(PROXIMITY_MAX).toBe(5)
  })
})
