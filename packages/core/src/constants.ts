/** 识别字段 key 清单，对齐 md/06 §10.1 */
export const RECOGNITION_FIELD_KEYS = [
  '身份/称号',
  '境界',
  '职业',
  '所在地',
  '势力',
  '关系',
  '功法/技能',
  '法宝/装备',
  '年龄/寿命',
  '与主角关系',
  '与主角关系远近',
  '状态'
] as const

export type RecognitionFieldKey = (typeof RECOGNITION_FIELD_KEYS)[number]

export const PROXIMITY_MIN = 1
export const PROXIMITY_MAX = 5

export const SCHEMA_VERSION = 1
