import { describe, expect, it } from 'vitest'
import { TRIP_TEMPLATES } from '../../../src/config/tripTemplates'
import type { TripItemType } from '../../../src/api/tripItem'

const VALID_TYPES: TripItemType[] = ['sight', 'food', 'hotel', 'transport', 'other']
/** 写接口限流 20 次/分钟：模板建程 1 次 + 条目 N 次，N 封顶 15 */
const MAX_ITEMS = 15

describe('TRIP_TEMPLATES', () => {
  it('预置 6~8 个模板且 id 唯一', () => {
    expect(TRIP_TEMPLATES.length).toBeGreaterThanOrEqual(6)
    expect(TRIP_TEMPLATES.length).toBeLessThanOrEqual(8)
    const ids = TRIP_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('标题/目的地/主题/出行方式非空', () => {
    for (const t of TRIP_TEMPLATES) {
      expect(t.title.trim().length).toBeGreaterThan(0)
      expect(t.destination.trim().length).toBeGreaterThan(0)
      expect(t.theme.trim().length).toBeGreaterThan(0)
      expect(t.transport.trim().length).toBeGreaterThan(0)
    }
  })

  it('天数在 1~30 且封面色为 #RRGGBB', () => {
    for (const t of TRIP_TEMPLATES) {
      expect(t.days).toBeGreaterThanOrEqual(1)
      expect(t.days).toBeLessThanOrEqual(30)
      expect(t.coverColor).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it('dayItems 天数不超模板天数，总条目 ≤ 15', () => {
    for (const t of TRIP_TEMPLATES) {
      expect(t.dayItems.length).toBeLessThanOrEqual(t.days)
      const total = t.dayItems.reduce((n, day) => n + day.length, 0)
      expect(total).toBeLessThanOrEqual(MAX_ITEMS)
      expect(total).toBeGreaterThan(0)
    }
  })

  it('每个条目类型合法、名称非空且 ≤100 字', () => {
    for (const t of TRIP_TEMPLATES) {
      for (const day of t.dayItems) {
        for (const item of day) {
          expect(VALID_TYPES).toContain(item.type)
          expect(item.name.trim().length).toBeGreaterThan(0)
          expect(item.name.length).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('时间格式为 HH:mm 或 HH:mm-HH:mm（可选）', () => {
    for (const t of TRIP_TEMPLATES) {
      for (const day of t.dayItems) {
        for (const item of day) {
          if (item.time != null) {
            expect(item.time).toMatch(/^\d{2}:\d{2}(-\d{2}:\d{2})?$/)
          }
        }
      }
    }
  })

  it('亮点标签 2~3 个且非空', () => {
    for (const t of TRIP_TEMPLATES) {
      expect(t.highlights.length).toBeGreaterThanOrEqual(2)
      expect(t.highlights.length).toBeLessThanOrEqual(3)
      expect(t.highlights.every((h) => h.trim().length > 0)).toBe(true)
    }
  })
})
