/**
 * 海报布局纯函数单测：textWidth / wrapText / buildPosterLayout。
 * 全部为纯逻辑断言，不依赖 uni / wx / DOM。
 */
import { describe, expect, it } from 'vitest'
import { buildPosterLayout, POSTER_WIDTH, textWidth, wrapText } from '../poster'
import type { PosterInput } from '../poster'

/** 造一个最小可用海报输入 */
function makeInput(overrides: Partial<PosterInput> = {}): PosterInput {
  return {
    title: '海南环岛之旅',
    destination: '海南',
    startDate: '2026-08-01',
    endDate: '2026-08-02',
    coverColor: '#3B82F6',
    days: [
      {
        dayNumber: 1,
        date: '2026-08-01',
        items: [
          { type: 'sight', name: '亚龙湾', address: '三亚市吉阳区', time: '09:00' },
          { type: 'food', name: '椰子鸡', address: '市区店', time: '12:30' },
        ],
      },
      {
        dayNumber: 2,
        date: '2026-08-02',
        items: [{ type: 'hotel', name: '海棠湾酒店', address: '海棠北路' }],
      },
    ],
    ...overrides,
  }
}

describe('textWidth', () => {
  it('中文按 2 计（海南 → 4）', () => {
    expect(textWidth('海南')).toBe(4)
  })

  it('半角按 1 计（abc → 3）', () => {
    expect(textWidth('abc')).toBe(3)
  })

  it('中英混合（海南abc → 7）', () => {
    expect(textWidth('海南abc')).toBe(7)
  })

  it('中文标点按 2 计（，。！？ → 8）', () => {
    expect(textWidth('，。！？')).toBe(8)
  })

  it('全角 ASCII 按 2 计（ＡＢＣ → 6）', () => {
    expect(textWidth('ＡＢＣ')).toBe(6)
  })

  it('全角空格按 2 计', () => {
    expect(textWidth('a　b')).toBe(4)
  })

  it('空串宽度为 0', () => {
    expect(textWidth('')).toBe(0)
  })

  it('emoji 按半角 1 计（📍 → 1）', () => {
    expect(textWidth('📍')).toBe(1)
  })
})

describe('wrapText', () => {
  it('不超宽原样一行', () => {
    expect(wrapText('abc', 10)).toEqual(['abc'])
  })

  it('超宽折成多行', () => {
    expect(wrapText('abcdefgh', 4)).toEqual(['abcd', 'efgh'])
  })

  it('贪心边界：恰好等于 maxWidth 仍放当前行', () => {
    expect(wrapText('abcdef', 6)).toEqual(['abcdef'])
    expect(wrapText('abcdefg', 6)).toEqual(['abcdef', 'g'])
  })

  it('每行宽度都不超过 maxWidth', () => {
    const lines = wrapText('海南三亚自由行八日游攻略指南手册', 8)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) {
      expect(textWidth(line)).toBeLessThanOrEqual(8)
    }
  })

  it('折行不丢字符（拼接还原原文）', () => {
    const src = '海南三亚自由行八日游攻略指南手册第二版'
    const lines = wrapText(src, 7)
    expect(lines.join('')).toBe(src)
  })

  it('空串返回单个空行', () => {
    expect(wrapText('', 5)).toEqual([''])
  })

  it('单个字符超宽也独占一行（不丢字符）', () => {
    expect(wrapText('ab中c', 1)).toEqual(['a', 'b', '中', 'c'])
  })

  it('maxWidth <= 0 兜底为整串一行', () => {
    expect(wrapText('abc', 0)).toEqual(['abc'])
    expect(wrapText('abc', -1)).toEqual(['abc'])
  })
})

describe('buildPosterLayout', () => {
  it('宽度恒为 750', () => {
    expect(buildPosterLayout(makeInput()).width).toBe(POSTER_WIDTH)
    expect(POSTER_WIDTH).toBe(750)
  })

  it('头部区域含 coverColor 的 fillRect', () => {
    const layout = buildPosterLayout(makeInput({ coverColor: '#123456' }))
    expect(layout.ops[0]).toMatchObject({ op: 'fillRect', color: '#FFFFFF' })
    expect(layout.ops[1]).toMatchObject({ op: 'fillRect', color: '#123456' })
    const head = layout.ops[1] as { h: number }
    expect(head.h).toBeGreaterThan(0)
  })

  it('高度随天数增加而增长', () => {
    const one = makeInput({ days: [makeInput().days[0]] })
    const two = makeInput()
    expect(two.days.length).toBe(2)
    const h1 = buildPosterLayout(one).height
    const h2 = buildPosterLayout(two).height
    expect(h2).toBeGreaterThan(h1)
  })

  it('高度随条目数增加而增长', () => {
    const base = makeInput()
    const more = makeInput()
    more.days[0].items.push({ type: 'transport', name: '环岛高铁', address: '三亚站' })
    const h1 = buildPosterLayout(base).height
    const h2 = buildPosterLayout(more).height
    expect(h2).toBeGreaterThan(h1)
  })

  it('空天输出灰色小字"暂无安排"文本指令', () => {
    const layout = buildPosterLayout(
      makeInput({
        days: [{ dayNumber: 1, date: '2026-08-01', items: [] }],
      })
    )
    const emptyOp = layout.ops.find((o) => o.op === 'text' && o.text === '暂无安排')
    expect(emptyOp).toBeDefined()
    expect(emptyOp).toMatchObject({ color: '#999999', fontSize: 24 })
  })

  it('条目文本超宽折行：46 个半角字符折两行、45 个不折', () => {
    const shortInput = makeInput({
      days: [{ dayNumber: 1, date: '2026-08-01', items: [{ type: 'sight', name: 'a'.repeat(45) }] }],
    })
    const longInput = makeInput({
      days: [{ dayNumber: 1, date: '2026-08-01', items: [{ type: 'sight', name: 'a'.repeat(46) }] }],
    })
    const shortLayout = buildPosterLayout(shortInput)
    const longLayout = buildPosterLayout(longInput)
    // 条目前缀 "📍 " 占 2 个半角单位，折行容量 47：总宽 47 不折、48 折
    const shortTexts = shortLayout.ops.filter((o) => o.op === 'text').map((o) => o.text)
    const longTexts = longLayout.ops.filter((o) => o.op === 'text').map((o) => o.text)
    expect(shortTexts).toContain(`📍 ${'a'.repeat(45)}`)
    expect(longTexts).toContain(`📍 ${'a'.repeat(45)}`)
    expect(longTexts).toContain('a')
    expect(longLayout.height).toBeGreaterThan(shortLayout.height)
  })

  it('长文本条目折行后高度比短文本高', () => {
    const short = buildPosterLayout(
      makeInput({ days: [{ dayNumber: 1, date: '2026-08-01', items: [{ type: 'food', name: '清补凉' }] }] })
    )
    const long = buildPosterLayout(
      makeInput({
        days: [
          {
            dayNumber: 1,
            date: '2026-08-01',
            items: [
              { type: 'food', name: '清补凉', address: '海南省三亚市天涯区解放路步行街老字号门店三楼靠窗位置' },
            ],
          },
        ],
      })
    )
    expect(long.height).toBeGreaterThan(short.height)
  })

  it('不变式：height ≥ 最后一个 op 的 y + 80', () => {
    const layout = buildPosterLayout(makeInput())
    const lastOp = layout.ops[layout.ops.length - 1]
    expect(layout.height).toBeGreaterThanOrEqual(lastOp.y + 80)
  })

  it('头部含标题、📍目的地、📅日期范围', () => {
    const layout = buildPosterLayout(makeInput())
    const texts = layout.ops.filter((o) => o.op === 'text').map((o) => o.text)
    expect(texts).toContain('海南环岛之旅')
    expect(texts.some((t) => t.startsWith('📍 海南'))).toBe(true)
    expect(texts.some((t) => t.startsWith('📅 8/1 - 8/2'))).toBe(true)
  })

  it('无 startDate 时日期范围从 days 首末 date 推导', () => {
    const layout = buildPosterLayout(
      makeInput({ startDate: undefined, endDate: undefined })
    )
    const texts = layout.ops.filter((o) => o.op === 'text').map((o) => o.text)
    expect(texts.some((t) => t.startsWith('📅 8/1 - 8/2'))).toBe(true)
  })

  it('条目图标映射：sight📍 food🍜 hotel🏨 transport🚌 other📌', () => {
    const layout = buildPosterLayout(
      makeInput({
        days: [
          {
            dayNumber: 1,
            date: '2026-08-01',
            items: [
              { type: 'sight', name: 'A' },
              { type: 'food', name: 'B' },
              { type: 'hotel', name: 'C' },
              { type: 'transport', name: 'D' },
              { type: 'other', name: 'E' },
              { type: 'unknown-type', name: 'F' },
            ],
          },
        ],
      })
    )
    const texts = layout.ops.filter((o) => o.op === 'text').map((o) => o.text)
    expect(texts).toContain('📍 A')
    expect(texts).toContain('🍜 B')
    expect(texts).toContain('🏨 C')
    expect(texts).toContain('🚌 D')
    expect(texts).toContain('📌 E')
    expect(texts.some((t) => t.startsWith('📌 F'))).toBe(true) // 未知类型回退 other
  })

  it('日期条输出 Day N · M/D', () => {
    const layout = buildPosterLayout(makeInput())
    const texts = layout.ops.filter((o) => o.op === 'text').map((o) => o.text)
    expect(texts).toContain('Day 1 · 8/1')
    expect(texts).toContain('Day 2 · 8/2')
  })

  it('底部输出"— 旅行规划 · 分享行程 —"', () => {
    const layout = buildPosterLayout(makeInput())
    const lastOp = layout.ops[layout.ops.length - 1]
    expect(lastOp).toMatchObject({ op: 'text', text: '— 旅行规划 · 分享行程 —' })
  })
})