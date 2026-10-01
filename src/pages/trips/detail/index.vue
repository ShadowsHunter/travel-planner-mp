<template>
  <view class="page">
    <!-- 顶部：行程信息 -->
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <view v-if="trip" class="header-info">
        <text class="header-title">{{ trip.title }}</text>
        <view class="header-meta">
          <text class="meta-item">📍 {{ trip.destination }}</text>
          <text class="meta-item">📅 {{ dateRange }}</text>
        </view>
      </view>
      <view v-else class="header-info">
        <text class="header-title">行程详情</text>
      </view>
      <!-- ⋯ 菜单：自定义浮层（P5 分享需承载 open-type=share 按钮，showActionSheet 做不到） -->
      <view v-if="trip" class="menu-wrap">
        <view class="menu-btn" @tap="showHeaderMenu = !showHeaderMenu">
          <text class="menu-btn-icon">⋯</text>
        </view>
        <view v-if="showHeaderMenu" class="menu-mask" @tap="showHeaderMenu = false" />
        <view v-if="showHeaderMenu" class="menu-pop">
          <view class="menu-row" @tap="goEditTrip">
            <text class="menu-row-icon">✏️</text>
            <text class="menu-row-text">编辑行程</text>
          </view>
          <!-- 分享必须用 button open-type（showActionSheet 无法拉起转发） -->
          <button class="menu-row menu-share-btn" open-type="share">
            <text class="menu-row-icon">📤</text>
            <text class="menu-row-text">分享给好友</text>
          </button>
          <view class="menu-row" @tap="confirmDeleteTrip">
            <text class="menu-row-icon">🗑️</text>
            <text class="menu-row-text danger">删除行程</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载/错误 -->
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>
    <view v-else-if="error" class="error">
      <text class="error-text">{{ error }}</text>
    </view>

    <!-- 主体 -->
    <view v-else class="main">
      <!-- 日期 Tab（横滑） -->
      <scroll-view scroll-x class="day-tabs" :show-scrollbar="false">
        <view
          v-for="day in days"
          :key="day.id"
          class="day-tab"
          :class="{ active: day.id === activeDayId }"
          @tap="selectDay(day.id)"
        >
          <text class="day-label">Day {{ day.dayNumber }}</text>
          <text class="day-date">{{ shortDate(day.date) }}</text>
        </view>
      </scroll-view>

      <!-- Segmented Control: 列表 / 地图 -->
      <view class="segmented">
        <view class="seg-item" :class="{ active: viewMode === 'list' }" @tap="viewMode = 'list'">
          <text>列表</text>
        </view>
        <view class="seg-item" :class="{ active: viewMode === 'map' }" @tap="viewMode = 'map'">
          <text>地图</text>
        </view>
      </view>

      <!-- 列表视图 -->
      <view v-if="viewMode === 'list'" class="list-area">
        <!-- 排序模式切换 -->
        <view class="list-toolbar">
          <text class="item-count">{{ activeItems.length }} 个条目</text>
          <view class="sort-toggle" @tap="sortMode = !sortMode">
            <text class="sort-text">{{ sortMode ? '完成排序' : '排序' }}</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="activeItems.length === 0" class="empty">
          <text class="empty-icon">📝</text>
          <text class="empty-text">还没有条目</text>
          <text class="empty-hint">点击底部按钮添加</text>
        </view>

        <!-- 条目列表 -->
        <scroll-view v-else scroll-y class="items-scroll">
          <view
            v-for="(item, idx) in activeItems"
            :key="item.id"
            class="item-card"
            :class="{ highlight: highlightedItemId === item.id }"
            @tap="onItemTap(item)"
          >
            <view class="item-left">
              <view class="type-dot" :style="{ background: typeColor(item.type) }" />
              <view class="item-info">
                <text class="item-name">{{ item.name }}</text>
                <view v-if="item.address || item.time" class="item-meta">
                  <text v-if="item.time" class="item-time">{{ item.time }}</text>
                  <text v-if="item.address" class="item-addr">{{ item.address }}</text>
                </view>
                <text v-if="item.notes" class="item-notes">{{ item.notes }}</text>
              </view>
            </view>

            <!-- 排序按钮 -->
            <view v-if="sortMode" class="sort-btns">
              <view class="sort-btn" :class="{ disabled: idx === 0 }" @tap.stop="moveItem(idx, -1)">
                <text>↑</text>
              </view>
              <view
                class="sort-btn"
                :class="{ disabled: idx === activeItems.length - 1 }"
                @tap.stop="moveItem(idx, 1)"
              >
                <text>↓</text>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view v-else class="item-actions">
              <view class="action-btn edit" @tap.stop="startEdit(item)">
                <text>编辑</text>
              </view>
              <view class="action-btn delete" @tap.stop="confirmDelete(item.id)">
                <text>删除</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- 添加条目按钮 -->
        <view v-if="!sortMode" class="add-fab" @tap="showAddSheet = true">
          <text class="add-fab-icon">+</text>
          <text class="add-fab-text">添加条目</text>
        </view>
      </view>

      <!-- 地图视图 -->
      <view v-else class="map-area">
        <map
          class="trip-map"
          :latitude="mapCenter.lat"
          :longitude="mapCenter.lng"
          :markers="markers"
          :polyline="routeLine"
          :include-points="includePoints.length ? includePoints : undefined"
          :include-padding="includePadding"
          :scale="includePoints.length ? undefined : 13"
          show-location
          @markertap="onMarkerTap"
        />
        <!-- 标记信息条：类型色点 / 名称 / 地址 / 一键导航 -->
        <view v-if="selectedMarker" class="marker-bar">
          <view class="marker-dot" :style="{ background: typeColor(selectedMarker.type) }" />
          <view class="marker-info">
            <text class="marker-name">{{ selectedMarker.name }}</text>
            <text v-if="selectedMarker.address" class="marker-addr">{{
              selectedMarker.address
            }}</text>
          </view>
          <view class="marker-nav-btn" @tap="openNavigation(selectedMarker)">
            <text class="marker-nav-text">🧭 导航</text>
          </view>
          <view class="marker-close" @tap="selectedMarker = null">
            <text>✕</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加条目底部弹窗 -->
    <view v-if="showAddSheet" class="sheet-mask" @tap.self="showAddSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">添加条目</text>
          <view class="sheet-close" @tap="showAddSheet = false">
            <text>✕</text>
          </view>
        </view>

        <!-- 搜索 POI -->
        <view class="search-bar">
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索地点..."
            @confirm="doSearch"
          />
          <view class="search-btn" @tap="doSearch">
            <text>搜索</text>
          </view>
        </view>

        <!-- 搜索结果 -->
        <scroll-view v-if="searchResults.length" scroll-y class="search-results">
          <view
            v-for="poi in searchResults"
            :key="poi.id"
            class="poi-item"
            :class="{ selected: selectedPoi?.id === poi.id }"
            @tap="selectPoi(poi)"
          >
            <text class="poi-name">{{ poi.name }}</text>
            <text class="poi-addr">{{ poi.address }}</text>
          </view>
        </scroll-view>

        <!-- 表单 -->
        <view class="form">
          <view class="form-row">
            <text class="form-label">类型</text>
            <view class="type-selector">
              <view
                v-for="t in ITEM_TYPES"
                :key="t"
                class="type-option"
                :class="{ active: addForm.type === t }"
                :style="{
                  borderColor: addForm.type === t ? typeColor(t) : '#E8E4E0',
                  background: addForm.type === t ? typeColor(t) + '10' : 'transparent',
                }"
                @tap="addForm.type = t"
              >
                <view class="type-dot-sm" :style="{ background: typeColor(t) }" />
                <text>{{ typeLabel(t) }}</text>
              </view>
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">名称</text>
            <input v-model="addForm.name" class="form-input" placeholder="地点名称" />
          </view>

          <view class="form-row">
            <text class="form-label">地址</text>
            <input v-model="addForm.address" class="form-input" placeholder="详细地址" />
          </view>

          <view class="form-row">
            <text class="form-label">时间</text>
            <picker mode="time" :value="addForm.time" @change="addForm.time = $event.detail.value">
              <view class="form-input picker-input">
                <text>{{ addForm.time || '选择时间' }}</text>
              </view>
            </picker>
          </view>

          <view class="form-row">
            <text class="form-label">备注</text>
            <textarea v-model="addForm.notes" class="form-textarea" placeholder="补充说明..." />
          </view>

          <view class="form-actions">
            <view class="btn btn-cancel" @tap="showAddSheet = false">
              <text>取消</text>
            </view>
            <view class="btn btn-primary" @tap="handleAdd">
              <text>添加</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑条目底部弹窗 -->
    <view v-if="showEditSheet" class="sheet-mask" @tap.self="showEditSheet = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-header">
          <text class="sheet-title">编辑条目</text>
          <view class="sheet-close" @tap="showEditSheet = false">
            <text>✕</text>
          </view>
        </view>

        <view class="form">
          <view class="form-row">
            <text class="form-label">类型</text>
            <view class="type-selector">
              <view
                v-for="t in ITEM_TYPES"
                :key="t"
                class="type-option"
                :class="{ active: editForm.type === t }"
                :style="{
                  borderColor: editForm.type === t ? typeColor(t) : '#E8E4E0',
                  background: editForm.type === t ? typeColor(t) + '10' : 'transparent',
                }"
                @tap="editForm.type = t"
              >
                <view class="type-dot-sm" :style="{ background: typeColor(t) }" />
                <text>{{ typeLabel(t) }}</text>
              </view>
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">名称</text>
            <input v-model="editForm.name" class="form-input" placeholder="地点名称" />
          </view>

          <view class="form-row">
            <text class="form-label">地址</text>
            <input v-model="editForm.address" class="form-input" placeholder="详细地址" />
          </view>

          <view class="form-row">
            <text class="form-label">时间</text>
            <picker
              mode="time"
              :value="editForm.time"
              @change="editForm.time = $event.detail.value"
            >
              <view class="form-input picker-input">
                <text>{{ editForm.time || '选择时间' }}</text>
              </view>
            </picker>
          </view>

          <view class="form-row">
            <text class="form-label">备注</text>
            <textarea v-model="editForm.notes" class="form-textarea" placeholder="补充说明..." />
          </view>

          <view class="form-actions">
            <view class="btn btn-cancel" @tap="showEditSheet = false">
              <text>取消</text>
            </view>
            <view class="btn btn-primary" @tap="handleEdit">
              <text>保存</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app'
import { useTripStore } from '../../../stores/trip'
import { formatDateRange, formatShortDate } from '../../../utils/trip'
import { ITEM_TYPES, ITEM_TYPE_META } from '../../../utils/itemType'
import { searchPOI, type PoiResult } from '../../../api/map'
import type { TripItemType, TripItem, CreateItemPayload } from '../../../api/tripItem'
import type { TripDay } from '../../../api/trip'

const tripStore = useTripStore()

const loading = ref(true)
const error = ref('')
const tripId = ref('')
const activeDayId = ref('')
const viewMode = ref<'list' | 'map'>('list')
const sortMode = ref(false)
const showAddSheet = ref(false)
const showEditSheet = ref(false)
const highlightedItemId = ref<string | null>(null)
const searchQuery = ref('')
const searchResults = ref<PoiResult[]>([])
const selectedPoi = ref<PoiResult | null>(null)
const editingItemId = ref('')
const showHeaderMenu = ref(false)
// 地图选中的标记条目（底部信息条数据源）
const selectedMarker = ref<TripItem | null>(null)

const trip = computed(() => tripStore.current)
const days = computed<TripDay[]>(() => trip.value?.days ?? [])
const activeDay = computed<TripDay | null>(
  () => days.value.find((d) => d.id === activeDayId.value) ?? days.value[0] ?? null,
)
const activeItems = computed(() => activeDay.value?.items ?? [])
const dateRange = computed(() =>
  trip.value ? formatDateRange(trip.value.startDate, trip.value.endDate) : '',
)

// ── 地图增强（P4）：类型色标记 / 视野自适应 / 目的地兜底中心 ──

// 目的地中心缓存（模块级）：同一目的地只搜一次——POI 搜索限流 30 次/10 分钟，失败也缓存避免重试
const destCenterCache = new Map<string, { lat: number; lng: number } | null>()
const destCenter = ref<{ lat: number; lng: number } | null>(null)

async function ensureDestCenter() {
  const dest = trip.value?.destination?.trim()
  if (!dest) return
  if (!destCenterCache.has(dest)) {
    try {
      const pois = await searchPOI(dest, dest)
      const first = pois[0]
      // 响应坐标是 7 位小数字符串，Number() 失败得 NaN 时按无结果缓存
      const center =
        first && !isNaN(Number(first.lat)) && !isNaN(Number(first.lng))
          ? { lat: Number(first.lat), lng: Number(first.lng) }
          : null
      destCenterCache.set(dest, center)
    } catch {
      destCenterCache.set(dest, null) // 静默失败，回落默认中心
    }
  }
  destCenter.value = destCenterCache.get(dest) ?? null
}

// 有坐标的条目：marker / 路线 / 视野自适应共用同一顺序（数组下标即 marker id）
const geoItems = computed(() => activeItems.value.filter((i) => i.lat && i.lng))

// marker id → 条目反查表，供点击回填信息条
const markerItems = computed(() => {
  const map = new Map<number, TripItem>()
  geoItems.value.forEach((item, idx) => map.set(idx, item))
  return map
})

// 地图中心点：第一个有坐标的条目 > 目的地中心 > 默认北京
const mapCenter = computed(() => {
  const first = geoItems.value[0]
  if (first) return { lat: Number(first.lat), lng: Number(first.lng) }
  return destCenter.value ?? { lat: 39.9042, lng: 116.4074 }
})

// 地图标记：类型 emoji 常显 label + 类型色 callout（点击才展示名称，多 marker 常显会叠）
const markers = computed(() =>
  geoItems.value.map((item, idx) => {
    const meta = ITEM_TYPE_META[item.type] ?? ITEM_TYPE_META.other
    return {
      id: idx,
      latitude: Number(item.lat),
      longitude: Number(item.lng),
      title: item.name,
      label: {
        content: meta.emoji,
        bgColor: meta.color + 'E6',
        color: '#FFFFFF',
        fontSize: 12,
        borderRadius: 6,
        padding: 4,
      },
      callout: {
        content: `${meta.emoji} ${item.name}`,
        display: 'BYCLICK',
        bgColor: meta.color,
        color: '#FFFFFF',
        fontSize: 12,
        borderRadius: 6,
        padding: 8,
      },
      iconPath: '/static/tabbar/trips-active.png',
      width: 24,
      height: 24,
    }
  }),
)

// 视野自适应点集：空数组在部分基础库版本会聚焦到无效点，模板里空时不传
const includePoints = computed(() =>
  geoItems.value.map((i) => ({ latitude: Number(i.lat), longitude: Number(i.lng) })),
)
// 底部留白给标记信息条（单位 px）
const includePadding = { top: 80, left: 40, right: 40, bottom: 160 }

// 路线
const routeLine = computed(() => {
  const points = includePoints.value
  if (points.length < 2) return []
  return [{ points, color: '#F27649', width: 3, dottedLine: true }]
})

// 点击标记 → 信息条（markerId 在 e 或 e.detail 上，基础库版本差异）
function onMarkerTap(e: any) {
  const id = e?.markerId ?? e?.detail?.markerId
  if (id == null) return
  selectedMarker.value = markerItems.value.get(Number(id)) ?? null
}

// 一键导航：坐标是字符串必须 Number()（openLocation 只收数值）
function openNavigation(item: TripItem) {
  const lat = Number(item.lat)
  const lng = Number(item.lng)
  if (item.lat == null || item.lng == null || isNaN(lat) || isNaN(lng)) {
    uni.showToast({ title: '该条目没有可用坐标', icon: 'none' })
    return
  }
  uni.openLocation({
    latitude: lat,
    longitude: lng,
    name: item.name,
    address: item.address || item.name,
    fail: () => uni.showToast({ title: '打开导航失败', icon: 'none' }),
  })
}

// 切视图 / 切天 / 条目增删 → 清空选中（下标 id 映射已失效）
watch([viewMode, () => activeItems.value.map((i) => i.id).join(',')], () => {
  selectedMarker.value = null
})

// 进入地图且当天无坐标条目时，按目的地定位（懒加载）
watch([viewMode, activeDayId], () => {
  if (viewMode.value === 'map' && geoItems.value.length === 0) {
    void ensureDestCenter()
  }
})

// 添加表单
const addForm = reactive({
  type: 'sight' as TripItemType,
  name: '',
  address: '',
  time: '',
  notes: '',
})

// 编辑表单（lat/lng/poiId 仅原样透传：编辑不改地理位置，但保存时必须回传，否则坐标被清空）
const editForm = reactive({
  type: 'sight' as TripItemType,
  name: '',
  address: '',
  time: '',
  notes: '',
  lat: null as number | null,
  lng: null as number | null,
  poiId: null as string | null,
})

onLoad((options) => {
  const id = options?.id
  if (id) {
    tripId.value = id
    loadTrip(id)
  } else {
    error.value = '行程不存在'
    loading.value = false
  }
})

// 分享：转发卡片落到本页详情；接收方非属主时后端 404，由已有 error 分支兜底
onShareAppMessage(() => {
  if (trip.value) {
    return {
      title: `「${trip.value.title}」行程邀你同游`,
      path: `/pages/trips/detail/index?id=${tripId.value}`,
    }
  }
  return { title: '旅行规划', path: '/pages/trips/index' }
})

async function loadTrip(id: string) {
  try {
    const t = await tripStore.fetchTrip(id)
    if (t?.days?.length) {
      activeDayId.value = t.days[0].id
    }
  } catch {
    error.value = '行程不存在或无访问权限'
  } finally {
    loading.value = false
  }
}

// 编辑行程改日期后 days 会被增删重建，选中 day 失效时重置视图状态
watch(
  () => days.value.map((d) => d.id).join(','),
  () => {
    if (days.value.length && !days.value.some((d) => d.id === activeDayId.value)) {
      activeDayId.value = days.value[0].id
      sortMode.value = false
      highlightedItemId.value = null
    }
  },
)

function selectDay(dayId: string) {
  activeDayId.value = dayId
  sortMode.value = false
  highlightedItemId.value = null
}

function goBack() {
  uni.navigateBack()
}

/** ⋯ 菜单：编辑行程（完整路径，create 页双模式） */
function goEditTrip() {
  showHeaderMenu.value = false
  uni.navigateTo({ url: `/pages/trips/create?id=${tripId.value}` })
}

/** ⋯ 菜单：删除行程（软删除，级联 days） */
function confirmDeleteTrip() {
  showHeaderMenu.value = false
  if (!trip.value) return
  uni.showModal({
    title: '删除行程',
    content: `「${trip.value.title}」及其全部条目将被删除，此操作不可恢复。`,
    confirmColor: '#E53935',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await tripStore.removeTrip(tripId.value)
        uni.showToast({ title: '已删除', icon: 'success' })
        uni.navigateBack()
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}

function shortDate(date: string): string {
  // 'YYYY-MM-DD' 直传 new Date() 按 UTC 解析会差 8 小时，formatShortDate 内部走本地解析
  return formatShortDate(date)
}

function typeColor(type: TripItemType): string {
  return ITEM_TYPE_META[type]?.color ?? '#64748B'
}

function typeLabel(type: TripItemType): string {
  return ITEM_TYPE_META[type]?.label ?? type
}

// 条目操作
function onItemTap(item: TripItem) {
  highlightedItemId.value = item.id === highlightedItemId.value ? null : item.id
}

function startEdit(item: TripItem) {
  editingItemId.value = item.id
  editForm.type = item.type
  editForm.name = item.name
  editForm.address = item.address ?? ''
  editForm.time = item.time ?? ''
  editForm.notes = item.notes ?? ''
  // 响应里 lat/lng 是 7 位小数字符串，转换回 number 供提交
  editForm.lat = item.lat != null ? Number(item.lat) : null
  editForm.lng = item.lng != null ? Number(item.lng) : null
  editForm.poiId = item.poiId ?? null
  showEditSheet.value = true
}

async function handleEdit() {
  if (!editForm.name) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  if (!activeDay.value) return
  try {
    await tripStore.updateItem(activeDay.value.id, editingItemId.value, {
      type: editForm.type,
      name: editForm.name,
      address: editForm.address || undefined,
      time: editForm.time || undefined,
      notes: editForm.notes || undefined,
      // 坐标透传（undefined 字段序列化时被丢弃，不会作为多余字段发出去）
      lat: editForm.lat ?? undefined,
      lng: editForm.lng ?? undefined,
      poiId: editForm.poiId ?? undefined,
    })
    showEditSheet.value = false
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

async function confirmDelete(itemId: string) {
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复，确定删除？',
    success: async (res) => {
      if (res.confirm && activeDay.value) {
        try {
          await tripStore.removeItem(activeDay.value.id, itemId)
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

// 排序
function moveItem(idx: number, direction: number) {
  const target = idx + direction
  if (target < 0 || target >= activeItems.value.length) return
  const ids = activeItems.value.map((i) => i.id)
  const [moved] = ids.splice(idx, 1)
  ids.splice(target, 0, moved)
  if (activeDay.value) {
    void tripStore.reorderItems(activeDay.value.id, ids)
  }
}

// 搜索
async function doSearch() {
  if (!searchQuery.value.trim()) return
  try {
    const city = trip.value?.destination
    searchResults.value = await searchPOI(searchQuery.value, city)
  } catch {
    uni.showToast({ title: '搜索失败', icon: 'none' })
  }
}

function selectPoi(poi: PoiResult) {
  selectedPoi.value = poi
  addForm.name = poi.name
  addForm.address = poi.address
}

// 添加条目
async function handleAdd() {
  if (!addForm.name) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  if (!activeDay.value) return

  const payload: CreateItemPayload = {
    type: addForm.type,
    name: addForm.name,
    address: addForm.address || undefined,
    time: addForm.time || undefined,
    notes: addForm.notes || undefined,
  }

  if (selectedPoi.value) {
    payload.lat = Number(selectedPoi.value.lat)
    payload.lng = Number(selectedPoi.value.lng)
    payload.poiId = selectedPoi.value.id
  }

  try {
    await tripStore.addItem(activeDay.value.id, payload)
    showAddSheet.value = false
    resetAddForm()
  } catch {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

function resetAddForm() {
  addForm.type = 'sight'
  addForm.name = ''
  addForm.address = ''
  addForm.time = ''
  addForm.notes = ''
  searchQuery.value = ''
  searchResults.value = []
  selectedPoi.value = null
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbf9f7;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e4e0;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-icon {
  font-size: 36rpx;
  color: #2d2926;
}
.header-info {
  flex: 1;
  margin-left: 16rpx;
}
.header-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2d2926;
}
.header-meta {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}
.meta-item {
  font-size: 22rpx;
  color: #6b6560;
}

/* ── ⋯ 菜单 ── */
.menu-wrap {
  position: relative;
  flex-shrink: 0;
}
.menu-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-btn-icon {
  font-size: 40rpx;
  color: #2d2926;
  line-height: 1;
  font-weight: 700;
}
.menu-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
}
.menu-pop {
  position: absolute;
  right: 0;
  top: 72rpx;
  width: 280rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.14);
  overflow: hidden;
  z-index: 91;
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 26rpx 28rpx;
  border-bottom: 1rpx solid #f5f3f0;
}
.menu-row:last-child {
  border-bottom: none;
}
.menu-row-icon {
  font-size: 30rpx;
}
.menu-row-text {
  font-size: 28rpx;
  color: #2d2926;
}
.menu-row-text.danger {
  color: #e53935;
}

/* 分享行：button 伪装成普通菜单行（清除小程序 button 默认外观） */
.menu-share-btn {
  width: 100%;
  margin: 0;
  padding: 26rpx 28rpx;
  border: none;
  border-radius: 0;
  background: transparent;
  text-align: left;
  line-height: inherit;
  font-size: inherit;
  box-sizing: border-box;
}
.menu-share-btn::after {
  border: none;
}

/* Loading/Error */
.loading,
.error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-text {
  font-size: 28rpx;
  color: #9b9590;
}
.error-text {
  font-size: 28rpx;
  color: #e53935;
}

/* Main */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Day Tabs */
.day-tabs {
  white-space: nowrap;
  background: #fff;
  border-bottom: 1rpx solid #e8e4e0;
  padding: 16rpx 24rpx;
}
.day-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
  background: #f5f3f0;
}
.day-tab.active {
  background: #f27649;
}
.day-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #2d2926;
}
.day-tab.active .day-label {
  color: #fff;
}
.day-date {
  font-size: 20rpx;
  color: #6b6560;
  margin-top: 4rpx;
}
.day-tab.active .day-date {
  color: rgba(255, 255, 255, 0.8);
}

/* Segmented Control */
.segmented {
  display: flex;
  margin: 16rpx 24rpx;
  background: #f5f3f0;
  border-radius: 12rpx;
  padding: 4rpx;
}
.seg-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 10rpx;
  font-size: 26rpx;
  color: #6b6560;
}
.seg-item.active {
  background: #fff;
  color: #2d2926;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

/* List Area */
.list-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 24rpx;
}
.item-count {
  font-size: 24rpx;
  color: #9b9590;
}
.sort-toggle {
  padding: 8rpx 20rpx;
  background: #f5f3f0;
  border-radius: 8rpx;
}
.sort-text {
  font-size: 24rpx;
  color: #f27649;
  font-weight: 600;
}

/* Empty */
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}
.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #6b6560;
}
.empty-hint {
  font-size: 24rpx;
  color: #9b9590;
  margin-top: 8rpx;
}

/* Items */
.items-scroll {
  flex: 1;
  padding: 0 24rpx;
}
.item-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.item-card.highlight {
  border: 2rpx solid #f27649;
}
.item-left {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.type-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-top: 8rpx;
}
.item-info {
  flex: 1;
}
.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2926;
}
.item-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 6rpx;
}
.item-time {
  font-size: 22rpx;
  color: #f27649;
}
.item-addr {
  font-size: 22rpx;
  color: #9b9590;
}
.item-notes {
  font-size: 22rpx;
  color: #6b6560;
  margin-top: 6rpx;
}

/* Sort Buttons */
.sort-btns {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-left: 16rpx;
}
.sort-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f3f0;
  border-radius: 8rpx;
}
.sort-btn.disabled {
  opacity: 0.3;
}

/* Action Buttons */
.item-actions {
  display: flex;
  gap: 8rpx;
  margin-left: 12rpx;
}
.action-btn {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}
.action-btn.edit {
  background: #fff0eb;
  color: #f27649;
}
.action-btn.delete {
  background: #fff1f2;
  color: #e53935;
}

/* FAB */
.add-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin: 20rpx 24rpx;
  padding: 24rpx;
  background: #f27649;
  border-radius: 16rpx;
}
.add-fab-icon {
  font-size: 32rpx;
  color: #fff;
}
.add-fab-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

/* Map */
.map-area {
  flex: 1;
  position: relative; /* 标记信息条定位基准 */
}
.trip-map {
  width: 100%;
  height: 100%;
}

/* 标记信息条 */
.marker-bar {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.14);
}
.marker-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.marker-info {
  flex: 1;
  min-width: 0;
}
.marker-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2926;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.marker-addr {
  font-size: 22rpx;
  color: #9b9590;
  margin-top: 4rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.marker-nav-btn {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  background: #f27649;
  border-radius: 12rpx;
}
.marker-nav-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 600;
}
.marker-close {
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9b9590;
  font-size: 26rpx;
}

/* Bottom Sheet */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  max-height: 85vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  overflow-y: auto;
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2d2926;
}
.sheet-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9b9590;
  font-size: 28rpx;
}

/* Search */
.search-bar {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.search-input {
  flex: 1;
  border: 1rpx solid #e8e4e0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
}
.search-btn {
  padding: 16rpx 24rpx;
  background: #f27649;
  border-radius: 12rpx;
  color: #fff;
  font-size: 26rpx;
}
.search-results {
  max-height: 200rpx;
  margin-bottom: 16rpx;
}
.poi-item {
  padding: 16rpx;
  border-bottom: 1rpx solid #f5f3f0;
}
.poi-item.selected {
  background: #fff0eb;
}
.poi-name {
  font-size: 26rpx;
  color: #2d2926;
  font-weight: 500;
}
.poi-addr {
  font-size: 22rpx;
  color: #9b9590;
  margin-top: 4rpx;
}

/* Form */
.form {
  margin-top: 16rpx;
}
.form-row {
  margin-bottom: 20rpx;
}
.form-label {
  font-size: 24rpx;
  color: #6b6560;
  margin-bottom: 8rpx;
}
.form-input {
  border: 1rpx solid #e8e4e0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
}
.form-textarea {
  border: 1rpx solid #e8e4e0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  height: 120rpx;
}
.picker-input {
  display: flex;
  align-items: center;
  color: #9b9590;
}

/* Type Selector */
.type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.type-option {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 16rpx;
  border: 1rpx solid #e8e4e0;
  border-radius: 10rpx;
  font-size: 24rpx;
}
.type-dot-sm {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.btn-cancel {
  background: #f5f3f0;
  color: #6b6560;
}
.btn-primary {
  background: #f27649;
  color: #fff;
}
</style>
