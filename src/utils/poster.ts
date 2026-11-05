/**
 * 海报布局纯函数：把行程数据编译为 canvas 绘制指令序列（fillRect / text）。
 * 仅供分享海报 canvas 生成使用，绝不依赖 uni / wx / DOM，可在 node 环境单测。
 */
import { formatShortDate } from './trip'

/** 海报固定宽（设计稿单位，全逻辑坐标，与 rpx 同宽） */
export const POSTER_WIDTH = 750

// ==================== 布局常量（单位均为设计稿像素） ====================

const MARGIN = 40 // 左右页边距
const CONTENT_WIDTH = POSTER_WIDTH - MARGIN * 2 // 内容可用宽度 670

const HEAD_PADDING_TOP = 50 // 头部顶部留白（标题基线之前）
const HEAD_TITLE_SIZE = 44 // 标题字号
const HEAD_TITLE_LINE_GAP = 18 // 标题折行时行间距附加值
const HEAD_TITLE_BOTTOM_GAP = 26 // 标题块与目的地行间距
const HEAD_SUB_SIZE = 28 // 目的地/日期行字号
const HEAD_SUB_LINE_HEIGHT = 46 // 目的地/日期行行高
const HEAD_PADDING_BOTTOM = 36 // 头部底色底部留白

const DAY_BAR_SIZE = 30 // 日期条字号
const DAY_BAR_HEIGHT = 74 // 日期条整块高度（含上下留白）
const DAY_GAP = 26 // 相邻两天之间距

const ITEM_SIZE = 26 // 条目字号
const ITEM_LINE_HEIGHT = 42 // 条目行高（折行时按行数增长）
const ITEM_GAP = 12 // 条目之间距
const ITEM_INDENT = 50 // 条目文本左缩进（图标后），折行容量 = floor(620/13) = 47 半角单位

const EMPTY_SIZE = 24 // 空天"暂无安排"字号
const EMPTY_LINE_HEIGHT = 36 // 空天占位行高

const FOOTER_SIZE = 24 // 底部署名字号
const FOOTER_GAP = 46 // 底部内容前间距
const FOOTER_BOTTOM = 80 // 底部留白（不变式：height ≥ lastOp.y + 80）

// ==================== 颜色 ====================

const COLOR_BG = '#FFFFFF' // 海报底色
const COLOR_TITLE = '#FFFFFF' // 头部标题（叠在 coverColor 上）
const COLOR_SUB = 'rgba(255,255,255,0.92)' // 头部目的地/日期
const COLOR_DAY = '#333333' // 日期条
const COLOR_ITEM = '#444444' // 条目文本
const COLOR_EMPTY = '#999999' // 空天占位灰色小字
const COLOR_FOOTER = '#AAAAAA' // 底部署名

// ==================== 类型 ====================

/** 条目类型前缀图标（与只读分享页映射保持一致） */
const ITEM_ICONS: Record<string, string> = {
  sight: '📍',
  food: '🍜',
  hotel: '🏨',
  transport: '🚌',
  other: '📌',
}

/** 海报条目（由 detail 页 TripItem 直接构造） */
export interface PosterItem {
  type: string
  name: string
  address?: string | null
  time?: string | null
  notes?: string | null
}

/** 海报单日 */
export interface PosterDay {
  dayNumber: number
  date: string
  items: PosterItem[]
}

/** 海报整体输入（由 detail 页 Trip 数据构造） */
export interface PosterInput {
  title: string
  destination: string
  startDate?: string
  endDate?: string
  coverColor: string
  days: PosterDay[]
}

/** 绘制指令：矩形填充 或 文本 */
export type PosterOp =
  | { op: 'fillRect'; x: number; y: number; w: number; h: number; color: string }
  | { op: 'text'; x: number; y: number; text: string; color: string; fontSize: number }

/** 布局结果：画布尺寸 + 指令序列 */
export interface PosterLayout {
  width: number
  height: number
  ops: PosterOp[]
}

// ==================== 宽度度量与折行 ====================

/**
 * 判断码位是否全角（按 2 个半角宽度计）。
 * 覆盖：CJK 统一表意、中文标点（含全角空格）、全角 ASCII、CJK 扩展 A、谚文等；
 * emoji 及其余字符一律按半角 1 处理。
 */
function isFullWidth(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // 谚文 Jamo
    (code >= 0x2e80 && code <= 0x303e) || // CJK 部首/中文标点（含 U+3000 全角空格）
    (code >= 0x3041 && code <= 0x33ff) || // 假名/注音/兼容
    (code >= 0x3400 && code <= 0x4dbf) || // CJK 扩展 A
    (code >= 0x4e00 && code <= 0x9fff) || // CJK 统一表意
    (code >= 0xa000 && code <= 0xa4cf) || // 彝文
    (code >= 0xac00 && code <= 0xd7a3) || // 谚文音节
    (code >= 0xf900 && code <= 0xfaff) || // CJK 兼容表意
    (code >= 0xfe30 && code <= 0xfe4f) || // CJK 兼容形式
    (code >= 0xff00 && code <= 0xff60) || // 全角 ASCII（FF01-FF5E 等）
    (code >= 0xffe0 && code <= 0xffe6) // 全角符号
  )
}

/**
 * 计算字符串显示宽度：中文/全角 = 2，半角（含 emoji）= 1。
 * 按码位遍历，不依赖任何运行时 API，可在 node 单测。
 */
export function textWidth(str: string): number {
  let w = 0
  for (const ch of str) {
    w += isFullWidth(ch.codePointAt(0) ?? 0) ? 2 : 1
  }
  return w
}

/**
 * 按半角宽度贪心折行：逐字符累加，超过 maxWidth 就换行。
 * 单个字符超宽也独占一行（不丢字符）；空串返回 ['']。
 */
export function wrapText(str: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [str]
  const lines: string[] = []
  let line = ''
  let lineW = 0
  for (const ch of str) {
    const cw = textWidth(ch)
    if (lineW > 0 && lineW + cw > maxWidth) {
      lines.push(line)
      line = ch
      lineW = cw
    } else {
      line += ch
      lineW += cw
    }
  }
  lines.push(line)
  return lines
}

/** 像素宽度 → 半角单位容量（字号越大同宽下能放的字符越少） */
function unitCapacity(pxWidth: number, fontSize: number): number {
  return Math.floor(pxWidth / (fontSize / 2))
}

// ==================== 布局生成 ====================

/**
 * 推导日期范围文本：优先 startDate/endDate，缺省时回退 days 首末 date。
 * 输出 'M/D' 风格（formatShortDate），同日只显示一个。
 */
function resolveDateRange(input: PosterInput): { start?: string; end?: string } {
  let start = input.startDate || input.endDate || undefined
  let end = input.endDate || input.startDate || undefined
  const dates = (input.days || []).map((d) => d.date).filter(Boolean)
  if (!start && dates.length > 0) start = dates[0]
  if (!end && dates.length > 0) end = dates[dates.length - 1]
  return { start, end }
}

/**
 * 生成海报绘制指令：头部（coverColor 底 + 标题/目的地/日期范围）
 * → 每天（日期条 + 条目折行 / 空天占位）→ 底部署名。
 * 关键不变式：height ≥ 最后一个 op 的 y + FOOTER_BOTTOM。
 */
export function buildPosterLayout(input: PosterInput): PosterLayout {
  const ops: PosterOp[] = []
  let y = 0

  // ---------- 头部 ----------
  // 先按已知内容排布，最后根据累计高度在头部开头补 fillRect（头部为动态高度）
  const titleLines = wrapText(input.title || '', unitCapacity(CONTENT_WIDTH, HEAD_TITLE_SIZE))
  const headStartY = HEAD_PADDING_TOP + HEAD_TITLE_SIZE
  let cursor = headStartY
  for (let i = 0; i < titleLines.length; i++) {
    if (i > 0) cursor += HEAD_TITLE_LINE_GAP
    ops.push({ op: 'text', x: MARGIN, y: cursor, text: titleLines[i], color: COLOR_TITLE, fontSize: HEAD_TITLE_SIZE })
    cursor += HEAD_TITLE_SIZE
  }
  cursor += HEAD_TITLE_BOTTOM_GAP

  const subLines: { text: string; y: number }[] = []
  const { start, end } = resolveDateRange(input)
  const subTexts: string[] = [`📍 ${input.destination || ''}`]
  if (start || end) {
    const s = start ? formatShortDate(start) : ''
    const e = end ? formatShortDate(end) : ''
    subTexts.push(`📅 ${s === e ? s : `${s} - ${e}`}`)
  }
  for (const t of subTexts) {
    cursor += HEAD_SUB_SIZE
    ops.push({ op: 'text', x: MARGIN, y: cursor, text: t, color: COLOR_SUB, fontSize: HEAD_SUB_SIZE })
    subLines.push({ text: t, y: cursor })
    cursor += HEAD_SUB_LINE_HEIGHT - HEAD_SUB_SIZE
  }

  const headBottom = cursor + HEAD_PADDING_BOTTOM
  // 头部底色块插到最前（宽度为整幅海报）
  ops.unshift({ op: 'fillRect', x: 0, y: 0, w: POSTER_WIDTH, h: headBottom, color: input.coverColor })
  y = headBottom

  // ---------- 每天内容 ----------
  const days = input.days || []
  for (let di = 0; di < days.length; di++) {
    if (di > 0) y += DAY_GAP
    const day = days[di]

    // 日期条：Day N · M/D
    y += DAY_BAR_HEIGHT - DAY_BAR_SIZE
    ops.push({
      op: 'text',
      x: MARGIN,
      y: y + DAY_BAR_SIZE,
      text: `Day ${day.dayNumber} · ${formatShortDate(day.date)}`,
      color: COLOR_DAY,
      fontSize: DAY_BAR_SIZE,
    })
    y = y + DAY_BAR_SIZE + (DAY_BAR_HEIGHT - DAY_BAR_SIZE)

    if (!day.items || day.items.length === 0) {
      // 空天：灰色小字占位
      y += EMPTY_LINE_HEIGHT - EMPTY_SIZE
      ops.push({ op: 'text', x: MARGIN, y: y + EMPTY_SIZE, text: '暂无安排', color: COLOR_EMPTY, fontSize: EMPTY_SIZE })
      y += EMPTY_SIZE
      continue
    }

    for (let ii = 0; ii < day.items.length; ii++) {
      if (ii > 0) y += ITEM_GAP
      const item = day.items[ii]
      const icon = ITEM_ICONS[item.type] || ITEM_ICONS.other
      // 组合一行文本：名称 + 时间 + 地址（notes 不进海报，保持画面克制）
      let line = `${icon} ${item.name || ''}`
      if (item.time) line += ` ${item.time}`
      if (item.address) line += ` · ${item.address}`
      const capacity = unitCapacity(CONTENT_WIDTH - ITEM_INDENT, ITEM_SIZE)
      const lines = wrapText(line, capacity)
      for (let li = 0; li < lines.length; li++) {
        y += ITEM_LINE_HEIGHT
        ops.push({ op: 'text', x: MARGIN + ITEM_INDENT, y, text: lines[li], color: COLOR_ITEM, fontSize: ITEM_SIZE })
      }
    }
  }

  // ---------- 底部 ----------
  y += FOOTER_GAP
  y += FOOTER_SIZE
  ops.push({
    op: 'text',
    x: (POSTER_WIDTH - textWidth('— 旅行规划 · 分享行程 —') * (FOOTER_SIZE / 2)) / 2,
    y,
    text: '— 旅行规划 · 分享行程 —',
    color: COLOR_FOOTER,
    fontSize: FOOTER_SIZE,
  })

  const height = y + FOOTER_BOTTOM
  // 海报整体底色（头部底色覆盖其上）
  ops.unshift({ op: 'fillRect', x: 0, y: 0, w: POSTER_WIDTH, h: height, color: COLOR_BG })

  return { width: POSTER_WIDTH, height, ops }
}