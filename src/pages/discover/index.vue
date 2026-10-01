<template>
  <view class="page">
    <view class="header">
      <text class="title">发现</text>
      <text class="subtitle">精选行程模板，选好出发日一键创建</text>
    </view>

    <!-- 模板卡片列表 -->
    <view v-for="t in templates" :key="t.id" class="tpl-card" @tap="useTemplate(t)">
      <view class="tpl-cover" :style="{ background: coverGradient(t.coverColor) }">
        <text class="tpl-days">{{ t.days }} 天</text>
      </view>
      <view class="tpl-body">
        <text class="tpl-title">{{ t.title }}</text>
        <view class="tpl-meta">
          <text class="tpl-dest">📍 {{ t.destination }}</text>
          <text class="tpl-theme">{{ t.theme }} · {{ t.transport }}</text>
        </view>
        <view class="tpl-highlights">
          <text v-for="h in t.highlights" :key="h" class="tpl-tag">{{ h }}</text>
        </view>
        <view class="tpl-footer">
          <text class="tpl-count">{{ itemCount(t) }} 个条目</text>
          <text class="tpl-use">使用模板 →</text>
        </view>
      </view>
    </view>

    <!-- 从空白创建（次级入口） -->
    <view class="blank-entry" @tap="createBlank">
      <text class="blank-icon">＋</text>
      <view class="blank-info">
        <text class="blank-title">从空白创建</text>
        <text class="blank-hint">不套模板，从零开始规划</text>
      </view>
      <text class="blank-arrow">→</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useTemplateStore } from '../../stores/template'
import { coverGradient } from '../../utils/trip'
import { TRIP_TEMPLATES, type TripTemplate } from '../../config/tripTemplates'

const templateStore = useTemplateStore()
const templates = TRIP_TEMPLATES

function itemCount(t: TripTemplate): number {
  return t.dayItems.reduce((n, day) => n + day.length, 0)
}

/** 暂存模板（读后即焚）→ 跳创建页预填 */
function useTemplate(t: TripTemplate) {
  templateStore.set(t)
  uni.navigateTo({ url: '/pages/trips/create' })
}

function createBlank() {
  uni.navigateTo({ url: '/pages/trips/create' })
}
</script>

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
  display: block;
}
.subtitle {
  font-size: 24rpx;
  color: #9b9590;
  margin-top: 8rpx;
  display: block;
}

/* 模板卡片 */
.tpl-card {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.tpl-cover {
  width: 160rpx;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16rpx;
  box-sizing: border-box;
}
.tpl-days {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.95);
  font-weight: 600;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}
.tpl-body {
  flex: 1;
  min-width: 0;
  padding: 20rpx 24rpx;
}
.tpl-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2d2926;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tpl-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}
.tpl-dest {
  font-size: 22rpx;
  color: #6b6560;
}
.tpl-theme {
  font-size: 22rpx;
  color: #9b9590;
}
.tpl-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 12rpx;
}
.tpl-tag {
  font-size: 20rpx;
  color: #f27649;
  background: #fff0eb;
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
}
.tpl-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14rpx;
}
.tpl-count {
  font-size: 20rpx;
  color: #9b9590;
}
.tpl-use {
  font-size: 24rpx;
  color: #f27649;
  font-weight: 600;
}

/* 从空白创建 */
.blank-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border: 2rpx dashed #e8e4e0;
  border-radius: 20rpx;
  padding: 24rpx;
}
.blank-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f3f0;
  border-radius: 16rpx;
  font-size: 36rpx;
  color: #6b6560;
}
.blank-info {
  flex: 1;
}
.blank-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2d2926;
  display: block;
}
.blank-hint {
  font-size: 22rpx;
  color: #9b9590;
  margin-top: 4rpx;
  display: block;
}
.blank-arrow {
  font-size: 28rpx;
  color: #9b9590;
}
</style>
