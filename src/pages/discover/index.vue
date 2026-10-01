<template>
  <view class="page">
    <view class="header">
      <text class="title">发现</text>
    </view>
    <view class="empty">
      <text class="empty-text">发现功能开发中</text>
      <text class="empty-hint">敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts"></script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbf9f7;
  padding: 24rpx;
}
.header {
  margin-bottom: 32rpx;
}
.title {
  font-size: 44rpx;
  font-weight: 700;
  color: #2d2926;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
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
</style>
