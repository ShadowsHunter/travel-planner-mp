<template>
  <view class="page">
    <!-- 统计条 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-num">{{ totalTrips }}</text>
        <text class="stat-label">行程总数</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">{{ totalDays }}</text>
        <text class="stat-label">累计天数</text>
      </view>
    </view>

    <!-- 搜索框 -->
    <view class="search-row">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索目的地"
          confirm-type="search"
          @confirm="searchNow"
        />
        <view v-if="keyword" class="search-clear" @tap="clearKeyword">
          <text class="search-clear-icon">×</text>
        </view>
      </view>
    </view>

    <!-- 排序切换：date=出发日期升序（后端默认），created=创建时间倒序 -->
    <view class="sort-seg">
      <view class="seg-item" :class="{ active: sortBy === 'date' }" @tap="sortBy = 'date'">
        <text>出发日期（从早到晚）</text>
      </view>
      <view class="seg-item" :class="{ active: sortBy === 'created' }" @tap="sortBy = 'created'">
        <text>最新创建</text>
      </view>
    </view>

    <!-- 加载 / 空状态 -->
    <view v-if="loading && trips.length === 0" class="empty">
      <text class="empty-text">加载中...</text>
    </view>

    <view v-else-if="trips.length === 0" class="empty">
      <template v-if="debouncedKeyword">
        <view class="empty-icon-wrap">
          <text class="empty-icon">🔍</text>
        </view>
        <text class="empty-text">没有找到目的地含「{{ debouncedKeyword }}」的行程</text>
        <text class="empty-hint">换个关键词，或点 × 清空后再试试</text>
      </template>
      <template v-else>
        <view class="empty-icon-wrap">
          <text class="empty-icon">✈</text>
        </view>
        <text class="empty-text">还没有行程</text>
        <text class="empty-hint">点击右下角 + 创建第一个行程</text>
      </template>
    </view>

    <!-- 行程列表 -->
    <view v-else class="list">
      <view v-for="trip in trips" :key="trip.id" class="card-swipe-wrap">
        <!-- 滑动容器 -->
        <view
          class="card-swipe-inner"
          :style="{ transform: `translateX(${swipeOffset(trip.id)}rpx)` }"
          @touchstart="onTouchStart($event, trip.id)"
          @touchmove="onTouchMove($event, trip.id)"
          @touchend="onTouchEnd(trip.id)"
          @tap="onCardTap(trip.id)"
        >
          <!-- 卡片主体 -->
          <view class="card" @tap="goDetail(trip.id)">
            <!-- 封面 -->
            <view class="card-cover" :style="{ background: gradient(trip.coverColor) }">
              <view class="card-cover-mask" />
              <view class="card-dest-badge">
                <text class="card-dest-dot">●</text>
                <text class="card-dest">{{ trip.destination }}</text>
              </view>
            </view>
            <!-- 内容 -->
            <view class="card-body">
              <text class="card-title">{{ trip.title }}</text>
              <view class="card-date-row">
                <text class="card-date-icon">📅</text>
                <text class="card-date">{{ range(trip.startDate, trip.endDate) }}</text>
              </view>
              <!-- 标签 -->
              <view class="card-tags">
                <text v-if="trip.theme" class="card-tag">{{ trip.theme }}</text>
                <text v-if="trip.transport" class="card-tag">{{ trip.transport }}</text>
                <text class="card-tag">{{ trip.companions }}人</text>
              </view>
              <!-- 底部统计 -->
              <view class="card-footer">
                <text class="card-days">{{ tripDaysCount(trip.startDate, trip.endDate) }} 天</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 删除按钮（滑动后露出） -->
        <view class="card-delete-zone" @tap="handleDelete(trip)">
          <text class="card-delete-text">删除</text>
        </view>
      </view>
    </view>

    <!-- 悬浮创建按钮：直达完整创建页（单一入口） -->
    <view class="fab" @tap="goCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { useTripStore } from '../../stores/trip'
import { formatDateRange, coverGradient, tripDays } from '../../utils/trip'

const tripStore = useTripStore()
// store 是 reactive 对象，直接解构会丢失响应性（列表白屏的根因），必须 storeToRefs
const { trips, loading } = storeToRefs(tripStore)

// —— 搜索 / 排序 ——
const keyword = ref('')
const debouncedKeyword = ref('')
const sortBy = ref<'date' | 'created'>('date')

// 300ms 防抖：停顿后再发请求，避免逐字触发限流
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(keyword, (v) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = v.trim()
  }, 300)
})
onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

/** 键盘「搜索」立即生效（跳过防抖等待） */
function searchNow() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debouncedKeyword.value = keyword.value.trim()
}

function clearKeyword() {
  keyword.value = ''
  searchNow()
}

/** 统一取数入口：onShow / 下拉刷新 / 筛选变化都走这里，保持筛选态 */
function refresh(): Promise<void> {
  return tripStore.fetchTrips({
    sort: sortBy.value,
    destination: debouncedKeyword.value || undefined,
  })
}

watch([debouncedKeyword, sortBy], () => {
  refresh().catch(() => {})
})

// —— 统计 ——
const totalTrips = computed(() => trips.value.length)
const totalDays = computed(() =>
  trips.value.reduce((sum, t) => sum + tripDays(t.startDate, t.endDate), 0),
)

// —— 滑动删除状态 ——
const touchState = reactive<
  Record<string, { startX: number; startY: number; offsetX: number; open: boolean }>
>({})
const SWIPE_THRESHOLD = 40 // rpx，触发滑动的最小距离
const DELETE_WIDTH = 140 // rpx，删除按钮宽度

// rpx 换算比例缓存：getSystemInfoSync 有同步桥开销，touchmove 高频路径只取一次
let rpxRatio = 0
function getRpxRatio(): number {
  if (!rpxRatio) {
    const { windowWidth } = uni.getSystemInfoSync()
    rpxRatio = 750 / windowWidth
  }
  return rpxRatio
}

function ensureState(id: string) {
  if (!touchState[id]) touchState[id] = { startX: 0, startY: 0, offsetX: 0, open: false }
  return touchState[id]
}

function swipeOffset(id: string): number {
  const s = touchState[id]
  if (!s) return 0
  return s.open ? -DELETE_WIDTH : s.offsetX
}

function onTouchStart(e: TouchEvent, id: string) {
  // 先关闭其他已打开的卡片
  for (const k of Object.keys(touchState)) {
    if (k !== id && touchState[k].open) {
      touchState[k].open = false
      touchState[k].offsetX = 0
    }
  }
  const s = ensureState(id)
  s.startX = e.touches[0].clientX
  s.startY = e.touches[0].clientY
  s.offsetX = 0
}

function onTouchMove(e: TouchEvent, id: string) {
  const s = ensureState(id)
  const dx = e.touches[0].clientX - s.startX
  const dy = e.touches[0].clientY - s.startY
  // 纵向滑动距离大于横向时忽略（避免与滚动冲突）
  if (Math.abs(dy) > Math.abs(dx)) return
  const ratio = getRpxRatio()
  // 只允许左滑（dx < 0）
  if (dx < 0) {
    s.offsetX = Math.max(-DELETE_WIDTH, dx * ratio)
  } else {
    // 右滑：如果已打开则关闭
    if (s.open) {
      s.offsetX = Math.min(0, -DELETE_WIDTH + dx * ratio)
    } else {
      s.offsetX = 0
    }
  }
}

function onTouchEnd(id: string) {
  const s = ensureState(id)
  if (s.offsetX < -SWIPE_THRESHOLD) {
    s.open = true
    s.offsetX = -DELETE_WIDTH
  } else {
    s.open = false
    s.offsetX = 0
  }
}

/** 点击卡片时，如果已滑开则先关闭，否则导航 */
function onCardTap(id: string) {
  const s = touchState[id]
  if (s?.open) {
    s.open = false
    s.offsetX = 0
    return
  }
}

// —— 页面生命周期 ——
onShow(() => {
  refresh().catch(() => {})
})

onPullDownRefresh(() => {
  refresh()
    .catch(() => {})
    .finally(() => {
      uni.stopPullDownRefresh()
    })
})

// —— 工具函数 ——
function gradient(color: string) {
  return coverGradient(color)
}

function range(s: string, e: string) {
  return formatDateRange(s, e)
}

function tripDaysCount(s: string, e: string) {
  return tripDays(s, e)
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/trips/detail/index?id=${id}` })
}

/** FAB 直达完整创建页（必须用 pages.json 注册的完整路径） */
function goCreate() {
  uni.navigateTo({ url: '/pages/trips/create' })
}

async function handleDelete(trip: { id: string; title: string }) {
  uni.showModal({
    title: '确认删除',
    content: `确定删除「${trip.title}」吗？此操作不可撤销。`,
    confirmColor: '#E53935',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await tripStore.removeTrip(trip.id)
        // 清理滑动状态
        delete touchState[trip.id]
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbf9f7;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

/* ── 统计条 ── */
.stats-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 40rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
}
.stat-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #2d2926;
  font-family: 'Space Grotesk', system-ui, sans-serif;
}
.stat-label {
  font-size: 24rpx;
  color: #9b9590;
}
.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: #e8e4e0;
  margin: 0 40rpx;
}

/* ── 搜索与排序 ── */
.search-row {
  margin-bottom: 20rpx;
}
.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 16rpx 28rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.search-icon {
  font-size: 26rpx;
  margin-right: 16rpx;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #2d2926;
}
.search-clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #f5f3f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.search-clear-icon {
  font-size: 28rpx;
  color: #9b9590;
  line-height: 1;
}
.sort-seg {
  display: flex;
  background: #efece9;
  border-radius: 32rpx;
  padding: 6rpx;
  margin-bottom: 28rpx;
}
.seg-item {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 14rpx 0;
  border-radius: 28rpx;
  font-size: 24rpx;
  color: #6b6560;
}
.seg-item.active {
  background: #fff;
  color: #f27649;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

/* ── 空状态 ── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.empty-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #fff0eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.empty-icon {
  font-size: 56rpx;
}
.empty-text {
  font-size: 32rpx;
  color: #6b6560;
}
.empty-hint {
  font-size: 26rpx;
  color: #9b9590;
  margin-top: 16rpx;
}

/* ── 列表 ── */
.list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

/* ── 滑动容器 ── */
.card-swipe-wrap {
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
}
.card-swipe-inner {
  position: relative;
  z-index: 1;
  transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border-radius: 24rpx;
}
.card-delete-zone {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 140rpx;
  background: #e53935;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 24rpx 24rpx 0;
}
.card-delete-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

/* ── 卡片 ── */
.card {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.card-cover {
  height: 200rpx;
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 24rpx;
}
.card-cover-mask {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.25));
}
.card-dest-badge {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(242, 118, 73, 0.88);
  padding: 8rpx 20rpx;
  border-radius: 32rpx;
  backdrop-filter: blur(4px);
}
.card-dest-dot {
  font-size: 16rpx;
  color: #fff;
}
.card-dest {
  color: #fff;
  font-size: 26rpx;
  font-weight: 600;
}

.card-body {
  padding: 24rpx;
}
.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2d2926;
  margin-bottom: 12rpx;
}
.card-date-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}
.card-date-icon {
  font-size: 24rpx;
}
.card-date {
  font-size: 24rpx;
  color: #6b6560;
}
.card-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
}
.card-tag {
  font-size: 22rpx;
  color: #6b6560;
  background: #f5f3f0;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}
.card-footer {
  border-top: 1rpx solid #f2f2f2;
  padding-top: 16rpx;
}
.card-days {
  font-size: 22rpx;
  color: #9b9590;
}

/* ── FAB ── */
.fab {
  position: fixed;
  right: 40rpx;
  bottom: 180rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: #f27649;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(242, 118, 73, 0.35);
  z-index: 100;
}
.fab-icon {
  color: #fff;
  font-size: 52rpx;
  line-height: 1;
}
</style>
