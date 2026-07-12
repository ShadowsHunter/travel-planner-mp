import type { TripItemType } from '../api/tripItem'

/**
 * 条目类型元数据：中文标签 + 标记色（取自原型 --color-* 变量）。
 * 颜色同时用于卡片类型图标底色、地图标记、图例。
 */
export interface ItemTypeMeta {
  label: string
  color: string
}

export const ITEM_TYPE_META: Record<TripItemType, ItemTypeMeta> = {
  sight: { label: '景点', color: '#3B82F6' },
  food: { label: '餐饮', color: '#F59E0B' },
  hotel: { label: '住宿', color: '#8B5CF6' },
  transport: { label: '交通', color: '#6366F1' },
  other: { label: '其他', color: '#64748B' },
}

/** 所有类型，用于类型选择器渲染顺序。 */
export const ITEM_TYPES: TripItemType[] = ['sight', 'food', 'hotel', 'transport', 'other']
