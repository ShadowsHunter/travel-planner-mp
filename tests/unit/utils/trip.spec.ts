import { describe, expect, it } from 'vitest'
import {
  addDays,
  coverGradient,
  formatDateRange,
  formatShortDate,
  parseLocalDate,
  todayLocal,
  tripDays,
} from '../../../src/utils/trip'

describe('parseLocalDate', () => {
  it('解析 YYYY-MM-DD 为本地时区日期', () => {
    const d = parseLocalDate('2026-10-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9)
    expect(d.getDate()).toBe(1)
  })

  it('容忍首尾空白', () => {
    const d = parseLocalDate(' 2026-01-05 ')
    expect(d.getDate()).toBe(5)
  })

  it('非标准格式回退 new Date()', () => {
    const d = parseLocalDate('2026-10-01T08:00:00Z')
    expect(d.getTime()).toBe(new Date('2026-10-01T08:00:00Z').getTime())
  })
})

describe('tripDays', () => {
  it('闭区间含首尾：同一天为 1', () => {
    expect(tripDays('2026-10-01', '2026-10-01')).toBe(1)
  })

  it('跨月区间 7 天', () => {
    expect(tripDays('2026-09-28', '2026-10-04')).toBe(7)
  })

  it('反向区间返回 0', () => {
    expect(tripDays('2026-10-05', '2026-10-01')).toBe(0)
  })

  it('非法输入返回 0', () => {
    expect(tripDays('not-a-date', '2026-10-01')).toBe(0)
  })
})

describe('formatDateRange', () => {
  it('单日行程只显示一天', () => {
    expect(formatDateRange('2026-08-15', '2026-08-15')).toBe('2026/08/15')
  })

  it('同年省略结束年份', () => {
    expect(formatDateRange('2026-08-15', '2026-08-19')).toBe('2026/08/15 - 08/19')
  })

  it('跨年保留两个年份', () => {
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('2026/12/30 - 2027/01/02')
  })

  it('非法输入原样返回', () => {
    expect(formatDateRange('bad', '2026-08-19')).toBe('bad - 2026-08-19')
  })
})

describe('coverGradient', () => {
  it('输出 135° 双色渐变（shade 输出小写 hex）', () => {
    expect(coverGradient('#FF385C')).toMatch(
      /^linear-gradient\(135deg, #[0-9a-f]{6} 0%, #[0-9a-f]{6} 100%\)$/,
    )
  })

  it('非法色原样传入不抛错', () => {
    expect(coverGradient('red')).toBe('linear-gradient(135deg, red 0%, red 100%)')
  })
})

describe('todayLocal', () => {
  it('返回本地时区 YYYY-MM-DD', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('与本地当前日期一致（回归 UTC 偏移 bug）', () => {
    const now = new Date()
    const expectStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(todayLocal()).toBe(expectStr)
  })
})

describe('addDays', () => {
  it('同月内加天数', () => {
    expect(addDays('2026-10-01', 6)).toBe('2026-10-07')
  })

  it('跨月进位', () => {
    expect(addDays('2026-09-28', 5)).toBe('2026-10-03')
  })

  it('跨年进位', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('负数退位跨月', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('闰年 2 月 29', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('非法输入原样返回', () => {
    expect(addDays('bad', 3)).toBe('bad')
  })
})

describe('formatShortDate', () => {
  it('输出 M/D 格式', () => {
    expect(formatShortDate('2026-10-01')).toBe('10/1')
  })

  it('非法输入原样返回', () => {
    expect(formatShortDate('bad')).toBe('bad')
  })
})
