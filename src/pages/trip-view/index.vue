<template>
  <view class="page">
    <!-- 加载中 -->
    <view v-if="loading" class="status">
      <text class="status-text">加载中...</text>
    </view>

    <!-- 无 token / 请求失败（404 等） -->
    <view v-else-if="error" class="status">
      <text class="status-text">{{ error }}</text>
    </view>

    <!-- 只读展示（红线：无编辑/删除入口，无任何互动组件） -->
    <view v-else-if="trip" class="content">
      <!-- 行程信息头卡：标题 + 目的地 + 日期范围 -->
      <view class="hero-card">
        <text class="hero-title">{{ trip.title }}</text>
        <view class="hero-meta">
          <text class="meta-item">📍 {{ trip.destination }}</text>
          <text v-if="dateRange" class="meta-item">📅 {{ dateRange }}</text>
        </view>
      </view>

      <!-- 按天分节 -->
      <view v-for="day in trip.days" :key="day.dayNumber" class="day-section">
        <view class="day-header">
          <text class="day-badge">Day {{ day.dayNumber }}</text>
          <text class="day-sep">·</text>
          <text class="day-date">{{ formatShortDate(day.date) }}</text>
        </view>

        <!-- 空天占位 -->
        <view v-if="!day.items.length" class="empty-card">
          <text class="empty-text">暂无安排</text>
        </view>

        <!-- 条目卡片（纯展示） -->
        <view v-for="(item, idx) in day.items" :key="idx" class="item-card">
          <text class="item-icon">{{ typeIcon(item.type) }}</text>
          <view class="item-body">
            <text class="item-name">{{ item.name }}</text>
            <view v-if="item.time || item.address" class="item-meta">
              <text v-if="item.time" class="item-time">{{ item.time }}</text>
              <text v-if="item.address" class="item-addr">{{ item.address }}</text>
            </view>
            <text v-if="item.notes" class="item-notes">{{ item.notes }}</text>
          </view>
        </view>
      </view>

      <!-- 页脚 -->
      <view class="footer">
        <text class="footer-text">— 旅行规划 · 分享行程 —</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getSharedTrip, type SharedTrip } from '../../api/trip'
import { formatDateRange, formatShortDate } from '../../utils/trip'

// 条目类型 → emoji 前缀图标（SharedTripItem.type 是 string，未知类型回退 📌）
const TYPE_ICON: Record<string, string> = {
  sight: '📍',
  food: '🍜',
  hotel: '🏨',
  transport: '🚌',
  other: '📌',
}

const loading = ref(true)
const error = ref('')
const trip = ref<SharedTrip | null>(null)

// SharedTrip 无 startDate/endDate 字段，日期范围从 days 首尾推导；days 为空则不显示
const dateRange = computed(() => {
  const days = trip.value?.days ?? []
  if (!days.length) return ''
  return formatDateRange(days[0].date, days[days.length - 1].date)
})

onLoad((options) => {
  const token = options?.token
  if (!token) {
    error.value = '分享链接无效'
    loading.value = false
    return
  }
  void loadSharedTrip(token)
})

async function loadSharedTrip(token: string) {
  try {
    trip.value = await getSharedTrip(token)
  } catch {
    // 后端契约：404 = 分享不存在或已失效；网络异常等失败也统一落到该文案
    error.value = '分享不存在或已失效'
  } finally {
    loading.value = false
  }
}

function typeIcon(type: string): string {
  return TYPE_ICON[type] ?? '📌'
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbf9f7;
  padding: 24rpx 24rpx 0;
  box-sizing: border-box;
}

/* 加载中 / 错误态 */
.status {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-text {
  font-size: 28rpx;
  color: #9b9590;
}

/* 行程信息头卡 */
.hero-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.hero-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #2d2926;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 32rpx;
  margin-top: 16rpx;
}
.meta-item {
  font-size: 24rpx;
  color: #6b6560;
}

/* 天分节 */
.day-section {
  margin-top: 28rpx;
}
.day-header {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  padding: 4rpx 8rpx 16rpx;
}
.day-badge {
  font-size: 28rpx;
  font-weight: 700;
  color: #f27649;
}
.day-sep {
  font-size: 24rpx;
  color: #c8c2bc;
}
.day-date {
  font-size: 24rpx;
  color: #9b9590;
}

/* 空天 */
.empty-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  display: flex;
  justify-content: center;
}
.empty-text {
  font-size: 24rpx;
  color: #9b9590;
}

/* 条目卡片 */
.item-card {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.item-icon {
  font-size: 32rpx;
  line-height: 1.3;
}
.item-body {
  flex: 1;
}
.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2926;
}
.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 20rpx;
  margin-top: 8rpx;
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
  margin-top: 8rpx;
}

/* 页脚 */
.footer {
  padding: 48rpx 0 64rpx;
  display: flex;
  justify-content: center;
}
.footer-text {
  font-size: 22rpx;
  color: #c8c2bc;
}
</style>