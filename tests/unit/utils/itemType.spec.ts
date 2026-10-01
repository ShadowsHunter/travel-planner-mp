import { describe, expect, it } from 'vitest'
import { ITEM_TYPES, ITEM_TYPE_META } from '../../../src/utils/itemType'
import type { TripItemType } from '../../../src/api/tripItem'

describe('ITEM_TYPE_META', () => {
  it('五个类型键与 ITEM_TYPES 完全一致', () => {
    expect(Object.keys(ITEM_TYPE_META).sort()).toEqual([...ITEM_TYPES].sort())
  })

  it('颜色均为 #RRGGBB 大写十六进制', () => {
    for (const meta of Object.values(ITEM_TYPE_META)) {
      expect(meta.color).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('中文标签非空且唯一', () => {
    const labels = Object.values(ITEM_TYPE_META).map((m) => m.label)
    expect(labels.every((l) => l.length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('emoji 非空且唯一（地图 marker label 用）', () => {
    const emojis = Object.values(ITEM_TYPE_META).map((m) => m.emoji)
    expect(emojis.every((e) => e.length > 0)).toBe(true)
    expect(new Set(emojis).size).toBe(emojis.length)
  })
})

describe('ITEM_TYPES', () => {
  it('长度为 5 且元素为合法类型', () => {
    expect(ITEM_TYPES).toHaveLength(5)
    const valid: TripItemType[] = ['sight', 'food', 'hotel', 'transport', 'other']
    for (const t of ITEM_TYPES) {
      expect(valid).toContain(t)
    }
  })
})
