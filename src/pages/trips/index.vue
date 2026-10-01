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

    <!-- 加载 / 空状态 -->
    <view v-if="loading && trips.length === 0" class="empty">
      <text class="empty-text">加载中...</text>
    </view>

    <view v-else-if="trips.length === 0" class="empty">
      <view class="empty-icon-wrap">
        <text class="empty-icon">✈</text>
      </view>
      <text class="empty-text">还没有行程</text>
      <text class="empty-hint">点击右上角 + 创建第一个行程</text>
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

    <!-- 创建行程弹窗 -->
    <view v-if="showCreate" class="modal-mask" @tap.self="showCreate = false">
      <view class="modal">
        <text class="modal-title">创建行程</text>
        <input v-model="form.title" class="input" placeholder="行程标题" />
        <input v-model="form.destination" class="input" placeholder="目的地" />
        <picker mode="date" :value="form.startDate" @change="form.startDate = $event.detail.value">
          <view class="input picker-input">
            <text>{{ form.startDate || '开始日期' }}</text>
          </view>
        </picker>
        <picker mode="date" :value="form.endDate" @change="form.endDate = $event.detail.value">
          <view class="input picker-input">
            <text>{{ form.endDate || '结束日期' }}</text>
          </view>
        </picker>
        <view class="modal-actions">
          <view class="btn btn-cancel" @tap="showCreate = false">
            <text>取消</text>
          </view>
          <view class="btn btn-primary" @tap="handleCreate">
            <text>创建</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 悬浮创建按钮 -->
    <view class="fab" @tap="showCreate = true">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useTripStore } from '../../stores/trip'
import { formatDateRange, coverGradient, tripDays } from '../../utils/trip'

const tripStore = useTripStore()
const { trips, loading } = tripStore

const showCreate = ref(false)
const form = reactive({
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
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
  // 只允许左滑（dx < 0）
  if (dx < 0) {
    // rpx 转换：屏幕宽度 750rpx，实际宽度用 uni.getSystemInfoSync
    const { windowWidth } = uni.getSystemInfoSync()
    const rpxRatio = 750 / windowWidth
    s.offsetX = Math.max(-DELETE_WIDTH, dx * rpxRatio)
  } else {
    // 右滑：如果已打开则关闭
    if (s.open) {
      const { windowWidth } = uni.getSystemInfoSync()
      const rpxRatio = 750 / windowWidth
      s.offsetX = Math.min(0, -DELETE_WIDTH + dx * rpxRatio)
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
  tripStore.fetchTrips().catch(() => {})
})

onPullDownRefresh(() => {
  tripStore
    .fetchTrips()
    .then(() => {
      uni.stopPullDownRefresh()
    })
    .catch(() => {
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

async function handleCreate() {
  if (!form.title || !form.destination || !form.startDate || !form.endDate) {
    uni.showToast({ title: '请填写完整', icon: 'none' })
    return
  }
  if (form.endDate < form.startDate) {
    uni.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
    return
  }
  try {
    const trip = await tripStore.createTrip({
      title: form.title,
      destination: form.destination,
      startDate: form.startDate,
      endDate: form.endDate,
    })
    showCreate.value = false
    form.title = ''
    form.destination = ''
    form.startDate = ''
    form.endDate = ''
    uni.navigateTo({ url: `/pages/trips/detail?id=${trip.id}` })
  } catch {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
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

/* ── Modal ── */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.modal {
  width: 85%;
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
}
.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #2d2926;
  margin-bottom: 32rpx;
}
.input {
  border: 1rpx solid #e8e4e0;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}
.picker-input {
  display: flex;
  align-items: center;
  color: #6b6560;
}
.modal-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 16rpx;
}
.btn {
  flex: 1;
  height: 80rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
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
