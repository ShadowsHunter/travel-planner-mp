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
        <view
          class="seg-item"
          :class="{ active: viewMode === 'list' }"
          @tap="viewMode = 'list'"
        >
          <text>列表</text>
        </view>
        <view
          class="seg-item"
          :class="{ active: viewMode === 'map' }"
          @tap="viewMode = 'map'"
        >
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
            :class="{ 'highlight': highlightedItemId === item.id }"
            @tap="onItemTap(item)"
          >
            <view class="item-left">
              <view
                class="type-dot"
                :style="{ background: typeColor(item.type) }"
              />
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
              <view
                class="sort-btn"
                :class="{ disabled: idx === 0 }"
                @tap.stop="moveItem(idx, -1)"
              >
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
          :scale="13"
          show-location
        />
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
            class="search-input"
            v-model="searchQuery"
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
                :style="{ borderColor: addForm.type === t ? typeColor(t) : '#E8E4E0', background: addForm.type === t ? typeColor(t) + '10' : 'transparent' }"
                @tap="addForm.type = t"
              >
                <view class="type-dot-sm" :style="{ background: typeColor(t) }" />
                <text>{{ typeLabel(t) }}</text>
              </view>
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">名称</text>
            <input class="form-input" v-model="addForm.name" placeholder="地点名称" />
          </view>

          <view class="form-row">
            <text class="form-label">地址</text>
            <input class="form-input" v-model="addForm.address" placeholder="详细地址" />
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
            <textarea class="form-textarea" v-model="addForm.notes" placeholder="补充说明..." />
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
                :style="{ borderColor: editForm.type === t ? typeColor(t) : '#E8E4E0', background: editForm.type === t ? typeColor(t) + '10' : 'transparent' }"
                @tap="editForm.type = t"
              >
                <view class="type-dot-sm" :style="{ background: typeColor(t) }" />
                <text>{{ typeLabel(t) }}</text>
              </view>
            </view>
          </view>

          <view class="form-row">
            <text class="form-label">名称</text>
            <input class="form-input" v-model="editForm.name" placeholder="地点名称" />
          </view>

          <view class="form-row">
            <text class="form-label">地址</text>
            <input class="form-input" v-model="editForm.address" placeholder="详细地址" />
          </view>

          <view class="form-row">
            <text class="form-label">时间</text>
            <picker mode="time" :value="editForm.time" @change="editForm.time = $event.detail.value">
              <view class="form-input picker-input">
                <text>{{ editForm.time || '选择时间' }}</text>
              </view>
            </picker>
          </view>

          <view class="form-row">
            <text class="form-label">备注</text>
            <textarea class="form-textarea" v-model="editForm.notes" placeholder="补充说明..." />
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
import { ref, computed, reactive, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useTripStore } from '../../../stores/trip'
import { formatDateRange } from '../../../utils/trip'
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

const trip = computed(() => tripStore.current)
const days = computed<TripDay[]>(() => trip.value?.days ?? [])
const activeDay = computed<TripDay | null>(
  () => days.value.find((d) => d.id === activeDayId.value) ?? days.value[0] ?? null
)
const activeItems = computed(() => activeDay.value?.items ?? [])
const dateRange = computed(() =>
  trip.value ? formatDateRange(trip.value.startDate, trip.value.endDate) : ''
)

// 地图中心点（取第一个有坐标的条目，或默认北京）
const mapCenter = computed(() => {
  const items = activeItems.value
  for (const item of items) {
    if (item.lat && item.lng) {
      return { lat: Number(item.lat), lng: Number(item.lng) }
    }
  }
  return { lat: 39.9042, lng: 116.4074 }
})

// 地图标记
const markers = computed(() => {
  return activeItems.value
    .filter((i) => i.lat && i.lng)
    .map((item, idx) => ({
      id: idx,
      latitude: Number(item.lat),
      longitude: Number(item.lng),
      title: item.name,
      callout: { content: item.name, display: 'ALWAYS', padding: 8, borderRadius: 4 },
      iconPath: '/static/tabbar/trips-active.png',
      width: 24,
      height: 24,
    }))
})

// 路线
const routeLine = computed(() => {
  const points = activeItems.value
    .filter((i) => i.lat && i.lng)
    .map((i) => ({ latitude: Number(i.lat), longitude: Number(i.lng) }))
  if (points.length < 2) return []
  return [{
    points,
    color: '#F27649',
    width: 3,
    dottedLine: true,
  }]
})

// 添加表单
const addForm = reactive({
  type: 'sight' as TripItemType,
  name: '',
  address: '',
  time: '',
  notes: '',
})

// 编辑表单
const editForm = reactive({
  type: 'sight' as TripItemType,
  name: '',
  address: '',
  time: '',
  notes: '',
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

function selectDay(dayId: string) {
  activeDayId.value = dayId
  sortMode.value = false
  highlightedItemId.value = null
}

function goBack() {
  uni.navigateBack()
}

function shortDate(date: string): string {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
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
  background: #FBF9F7;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #E8E4E0;
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
  color: #2D2926;
}
.header-info {
  flex: 1;
  margin-left: 16rpx;
}
.header-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2D2926;
}
.header-meta {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}
.meta-item {
  font-size: 22rpx;
  color: #6B6560;
}

/* Loading/Error */
.loading, .error {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-text {
  font-size: 28rpx;
  color: #9B9590;
}
.error-text {
  font-size: 28rpx;
  color: #E53935;
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
  border-bottom: 1rpx solid #E8E4E0;
  padding: 16rpx 24rpx;
}
.day-tab {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 28rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
  background: #F5F3F0;
}
.day-tab.active {
  background: #F27649;
}
.day-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #2D2926;
}
.day-tab.active .day-label {
  color: #fff;
}
.day-date {
  font-size: 20rpx;
  color: #6B6560;
  margin-top: 4rpx;
}
.day-tab.active .day-date {
  color: rgba(255,255,255,0.8);
}

/* Segmented Control */
.segmented {
  display: flex;
  margin: 16rpx 24rpx;
  background: #F5F3F0;
  border-radius: 12rpx;
  padding: 4rpx;
}
.seg-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 10rpx;
  font-size: 26rpx;
  color: #6B6560;
}
.seg-item.active {
  background: #fff;
  color: #2D2926;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06);
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
  color: #9B9590;
}
.sort-toggle {
  padding: 8rpx 20rpx;
  background: #F5F3F0;
  border-radius: 8rpx;
}
.sort-text {
  font-size: 24rpx;
  color: #F27649;
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
  color: #6B6560;
}
.empty-hint {
  font-size: 24rpx;
  color: #9B9590;
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
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.item-card.highlight {
  border: 2rpx solid #F27649;
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
  color: #2D2926;
}
.item-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 6rpx;
}
.item-time {
  font-size: 22rpx;
  color: #F27649;
}
.item-addr {
  font-size: 22rpx;
  color: #9B9590;
}
.item-notes {
  font-size: 22rpx;
  color: #6B6560;
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
  background: #F5F3F0;
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
  background: #FFF0EB;
  color: #F27649;
}
.action-btn.delete {
  background: #FFF1F2;
  color: #E53935;
}

/* FAB */
.add-fab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin: 20rpx 24rpx;
  padding: 24rpx;
  background: #F27649;
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
}
.trip-map {
  width: 100%;
  height: 100%;
}

/* Bottom Sheet */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
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
  color: #2D2926;
}
.sheet-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9B9590;
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
  border: 1rpx solid #E8E4E0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
}
.search-btn {
  padding: 16rpx 24rpx;
  background: #F27649;
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
  border-bottom: 1rpx solid #F5F3F0;
}
.poi-item.selected {
  background: #FFF0EB;
}
.poi-name {
  font-size: 26rpx;
  color: #2D2926;
  font-weight: 500;
}
.poi-addr {
  font-size: 22rpx;
  color: #9B9590;
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
  color: #6B6560;
  margin-bottom: 8rpx;
}
.form-input {
  border: 1rpx solid #E8E4E0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
}
.form-textarea {
  border: 1rpx solid #E8E4E0;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 26rpx;
  height: 120rpx;
}
.picker-input {
  display: flex;
  align-items: center;
  color: #9B9590;
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
  border: 1rpx solid #E8E4E0;
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
  background: #F5F3F0;
  color: #6B6560;
}
.btn-primary {
  background: #F27649;
  color: #fff;
}
</style>
