/**
 * 行程相关展示工具：天数计算、日期范围格式化、封面渐变。
 * 集中放置避免 Home / CreateTripModal / TripDetail 各自重复实现。
 */

/** 解析 'YYYY-MM-DD' 为本地时区 Date（避免 date-only ISO 被当作 UTC）。 */
export function parseLocalDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim())
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return new Date(s)
}

/** 当前本地时区日期 'YYYY-MM-DD'。替代 toISOString().slice(0,10)（UTC 8 小时偏移 bug）。 */
export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 日期字符串加 n 天（跨月/跨年安全），返回 'YYYY-MM-DD'。非法输入原样返回。 */
export function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 短日期 'M/D'（详情页 Day 标签、条目时间等）。非法输入原样返回。 */
export function formatShortDate(dateStr: string): string {
  const d = parseLocalDate(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 计算行程天数（含首尾，start..end 闭区间）。非法/反向区间返回 0。 */
export function tripDays(startDate: string, endDate: string): number {
  const s = parseLocalDate(startDate)
  const e = parseLocalDate(endDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0
  const ms = e.getTime() - s.getTime()
  return Math.round(ms / 86_400_000) + 1
}

/**
 * 格式化日期范围：同年省略结束年份 → "2026/08/15 - 08/19"。
 * 单日行程 → "2026/08/15"。非法 → 原样返回。
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const s = parseLocalDate(startDate)
  const e = parseLocalDate(endDate)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return `${startDate} - ${endDate}`
  }
  const fmt = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  const md = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  if (s.toDateString() === e.toDateString()) return fmt(s)
  if (s.getFullYear() === e.getFullYear()) return `${fmt(s)} - ${md(e)}`
  return `${fmt(s)} - ${fmt(e)}`
}

/** 将 #RRGGBB 按比例调亮(正)/调暗(负)，返回 #RRGGBB。用于封面渐变。 */
function shade(hex: string, percent: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return hex
  const num = parseInt(m[1], 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  const t = percent < 0 ? 0 : 255
  const p = Math.abs(percent) / 100
  r = Math.round((t - r) * p) + r
  g = Math.round((t - g) * p) + g
  b = Math.round((t - b) * p) + b
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/** 由单色封面色生成 135° 深浅渐变（与原型多色卡片观感接近）。 */
export function coverGradient(coverColor: string): string {
  return `linear-gradient(135deg, ${shade(coverColor, 8)} 0%, ${shade(coverColor, -38)} 100%)`
}
