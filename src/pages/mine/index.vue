<template>
  <view class="page">
    <!-- 用户信息区域 -->
    <view v-if="auth.isLoggedIn" class="user-section">
      <view class="user-card">
        <view class="avatar">
          <text class="avatar-text">{{ avatarLetter }}</text>
        </view>
        <view class="user-info">
          <text class="nickname">{{ auth.user?.nickname || '旅行者' }}</text>
          <text class="phone">{{ maskedPhone }}</text>
        </view>
      </view>

      <!-- 行程统计 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-value">{{ tripStore.trips.length }}</text>
          <text class="stat-label">全部行程</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ upcomingCount }}</text>
          <text class="stat-label">即将出发</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ completedCount }}</text>
          <text class="stat-label">已完成</text>
        </view>
      </view>
    </view>

    <!-- 未登录状态 -->
    <view v-else class="login-section">
      <view class="login-avatar-placeholder">
        <text class="login-avatar-icon">👤</text>
      </view>
      <text class="login-hint">登录后查看个人信息</text>
      <view class="login-btn" @tap="goLogin">
        <text class="login-btn-text">去登录</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view v-if="auth.isLoggedIn" class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @tap="goMyTrips">
          <text class="menu-icon">🧳</text>
          <text class="menu-text">我的行程</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goFavorites">
          <text class="menu-icon">⭐</text>
          <text class="menu-text">收藏夹</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @tap="goSettings">
          <text class="menu-icon">⚙️</text>
          <text class="menu-text">设置</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item" @tap="showAbout">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-text">关于</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <view class="menu-group">
        <view class="menu-item logout-item" @tap="handleLogout">
          <text class="menu-icon">🚪</text>
          <text class="menu-text logout-text">退出登录</text>
        </view>
      </view>
    </view>

    <!-- 版本号 -->
    <view class="footer">
      <text class="version">旅行规划 v1.0.0</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '../../stores/auth'
import { useTripStore } from '../../stores/trip'

const auth = useAuthStore()
const tripStore = useTripStore()

const avatarLetter = computed(() => {
  const n = auth.user?.nickname || auth.user?.phone || '?'
  return n.charAt(0).toUpperCase()
})

const maskedPhone = computed(() => {
  const phone = auth.user?.phone || ''
  if (phone.length >= 7) {
    return phone.slice(0, 3) + '****' + phone.slice(-4)
  }
  return phone
})

const upcomingCount = computed(() => {
  const now = new Date()
  return tripStore.trips.filter((t) => new Date(t.startDate) > now).length
})

const completedCount = computed(() => {
  const now = new Date()
  return tripStore.trips.filter((t) => new Date(t.endDate) < now).length
})

onShow(() => {
  if (auth.isLoggedIn) {
    tripStore.fetchTrips().catch(() => {})
  }
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' })
}

function goMyTrips() {
  uni.switchTab({ url: '/pages/trips/index' })
}

function goFavorites() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function goSettings() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function showAbout() {
  uni.showModal({
    title: '关于旅行规划',
    content: '版本 1.0.0\n让每一次旅行都井井有条',
    showCancel: false,
  })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        auth.logout()
      }
    },
  })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbf9f7;
}

/* 用户信息区域 */
.user-section {
  background: linear-gradient(135deg, #f27649 0%, #e0613a 100%);
  padding: 48rpx 32rpx 40rpx;
  border-radius: 0 0 40rpx 40rpx;
}
.user-card {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
}
.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
}
.avatar-text {
  color: #fff;
  font-size: 48rpx;
  font-weight: 700;
}
.user-info {
  display: flex;
  flex-direction: column;
}
.nickname {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8rpx;
}
.phone {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}
.stats-row {
  display: flex;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20rpx;
  padding: 24rpx 0;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-value {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}
.stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4rpx;
}

/* 未登录状态 */
.login-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 32rpx 60rpx;
  background: #fff;
  margin: 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.login-avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f5f3f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.login-avatar-icon {
  font-size: 56rpx;
}
.login-hint {
  font-size: 28rpx;
  color: #6b6560;
  margin-bottom: 32rpx;
}
.login-btn {
  background: #f27649;
  border-radius: 16rpx;
  padding: 20rpx 80rpx;
}
.login-btn-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

/* 菜单区域 */
.menu-section {
  padding: 24rpx;
}
.menu-group {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f3f0;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-icon {
  font-size: 36rpx;
  margin-right: 20rpx;
}
.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #2d2926;
}
.menu-arrow {
  font-size: 32rpx;
  color: #9b9590;
}
.logout-item {
  justify-content: center;
}
.logout-text {
  color: #e53935;
  text-align: center;
}

/* 底部版本号 */
.footer {
  padding: 40rpx 0 60rpx;
  text-align: center;
}
.version {
  font-size: 24rpx;
  color: #9b9590;
}
</style>
