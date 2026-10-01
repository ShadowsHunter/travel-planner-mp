<template>
  <view class="page">
    <view class="form-section">
      <!-- 行程标题 -->
      <view class="field">
        <text class="label">行程标题 <text class="required">*</text></text>
        <input
          v-model="form.title"
          class="input"
          placeholder="例如：东京 5 日自由行"
          maxlength="50"
        />
      </view>

      <!-- 目的地 -->
      <view class="field">
        <text class="label">目的地 <text class="required">*</text></text>
        <input
          v-model="form.destination"
          class="input"
          placeholder="输入城市或地区名称"
          maxlength="30"
        />
      </view>

      <!-- 日期范围 -->
      <view class="field-row">
        <view class="field field-half">
          <text class="label">出发日期 <text class="required">*</text></text>
          <picker mode="date" :value="form.startDate" :start="today" @change="onStartChange">
            <view class="input picker-input">
              <text :class="{ placeholder: !form.startDate }">{{
                form.startDate || '选择日期'
              }}</text>
            </view>
          </picker>
        </view>
        <view class="field field-half">
          <text class="label">返回日期 <text class="required">*</text></text>
          <picker
            mode="date"
            :value="form.endDate"
            :start="form.startDate || today"
            @change="form.endDate = $event.detail.value"
          >
            <view class="input picker-input">
              <text :class="{ placeholder: !form.endDate }">{{ form.endDate || '选择日期' }}</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 出行主题 -->
      <view class="field">
        <text class="label">出行主题</text>
        <input
          v-model="form.theme"
          class="input"
          placeholder="例如：自由行、亲子游"
          maxlength="20"
        />
        <view class="theme-tags">
          <view
            v-for="t in themeSuggestions"
            :key="t"
            class="theme-tag"
            :class="{ active: form.theme === t }"
            @tap="form.theme = t"
          >
            <text>{{ t }}</text>
          </view>
        </view>
      </view>

      <!-- 同行人数 -->
      <view class="field">
        <text class="label">同行人数</text>
        <view class="stepper">
          <view class="stepper-btn" @tap="adjustCompanions(-1)">
            <text class="stepper-icon">−</text>
          </view>
          <text class="stepper-value">{{ form.companions }}</text>
          <view class="stepper-btn" @tap="adjustCompanions(1)">
            <text class="stepper-icon">+</text>
          </view>
          <text class="stepper-unit">人</text>
        </view>
      </view>

      <!-- 出行方式 -->
      <view class="field">
        <text class="label">出行方式</text>
        <picker :range="transportOptions" :value="transportIndex" @change="onTransportChange">
          <view class="input picker-input">
            <text>{{ form.transport }}</text>
          </view>
        </picker>
      </view>

      <!-- 封面色 -->
      <view class="field">
        <text class="label">封面色</text>
        <view class="color-picker">
          <view
            v-for="c in coverPresets"
            :key="c"
            class="color-dot"
            :class="{ selected: form.coverColor === c }"
            :style="{ background: c }"
            @tap="form.coverColor = c"
          />
        </view>
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="actions">
      <button class="btn-primary" :disabled="submitting" @tap="handleSubmit">
        {{ submitting ? '创建中...' : '创建行程' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useTripStore } from '../../stores/trip'
import { todayLocal } from '../../utils/trip'
import type { CreateTripPayload } from '../../api/trip'

const tripStore = useTripStore()
const submitting = ref(false)

// 本地时区今天（toISOString 会按 UTC 切日，东八区早 8 点前差一天）
const today = todayLocal()

const themeSuggestions = ['自由行', '亲子游', '蜜月', '商务', '朋友聚会', '周末短途']
const transportOptions = ['飞机', '高铁', '自驾', '大巴', '轮船', '其他']
const coverPresets = ['#FF385C', '#2d6a4f', '#1e3a5f', '#7b2d8e', '#b45309', '#be123c']

const form = reactive({
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
  theme: '',
  companions: 2,
  transport: '飞机',
  coverColor: '#FF385C',
})

const transportIndex = computed(() => transportOptions.indexOf(form.transport))

function onStartChange(e: any) {
  form.startDate = e.detail.value
  // 结束日期联动：若早于开始则抬到开始日
  if (form.endDate && form.endDate < form.startDate) {
    form.endDate = form.startDate
  }
}

function adjustCompanions(delta: number) {
  form.companions = Math.max(1, form.companions + delta)
}

function onTransportChange(e: any) {
  form.transport = transportOptions[e.detail.value]
}

async function handleSubmit() {
  if (!form.title.trim()) {
    uni.showToast({ title: '请填写行程标题', icon: 'none' })
    return
  }
  if (!form.destination.trim()) {
    uni.showToast({ title: '请填写目的地', icon: 'none' })
    return
  }
  if (!form.startDate || !form.endDate) {
    uni.showToast({ title: '请选择出发与返回日期', icon: 'none' })
    return
  }
  if (form.endDate < form.startDate) {
    uni.showToast({ title: '返回日期不能早于出发日期', icon: 'none' })
    return
  }

  const payload: CreateTripPayload = {
    title: form.title.trim(),
    destination: form.destination.trim(),
    startDate: form.startDate,
    endDate: form.endDate,
    companions: form.companions,
    transport: form.transport,
    coverColor: form.coverColor,
  }
  if (form.theme.trim()) payload.theme = form.theme.trim()

  submitting.value = true
  try {
    const trip = await tripStore.createTrip(payload)
    // 必须用 pages.json 注册的完整路径（短路径真机失效）
    uni.redirectTo({ url: `/pages/trips/detail/index?id=${trip.id}` })
  } catch {
    uni.showToast({ title: '创建失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fbf9f7;
  padding: 24rpx;
  padding-bottom: 180rpx;
}
.form-section {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.field {
  margin-bottom: 32rpx;
}
.field:last-child {
  margin-bottom: 0;
}
.field-row {
  display: flex;
  gap: 24rpx;
}
.field-half {
  flex: 1;
}
.label {
  font-size: 26rpx;
  font-weight: 600;
  color: #6b6560;
  margin-bottom: 12rpx;
  display: block;
  text-transform: uppercase;
  letter-spacing: 1rpx;
}
.required {
  color: #e53935;
}
.input {
  border: 1.5rpx solid #e8e4e0;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #2d2926;
  background: #fff;
}
.picker-input {
  display: flex;
  align-items: center;
}
.placeholder {
  color: #9b9590;
}
.theme-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 16rpx;
}
.theme-tag {
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
  background: #f5f3f0;
  font-size: 24rpx;
  color: #6b6560;
}
.theme-tag.active {
  background: #fff0eb;
  color: #f27649;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.stepper-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  border: 1.5rpx solid #e8e4e0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stepper-icon {
  font-size: 36rpx;
  color: #2d2926;
}
.stepper-value {
  font-size: 36rpx;
  font-weight: 600;
  color: #2d2926;
  min-width: 48rpx;
  text-align: center;
}
.stepper-unit {
  font-size: 26rpx;
  color: #6b6560;
}
.color-picker {
  display: flex;
  gap: 20rpx;
}
.color-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
}
.color-dot.selected {
  border-color: #2d2926;
  transform: scale(1.1);
}
.actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.btn-primary {
  width: 100%;
  height: 88rpx;
  border-radius: 16rpx;
  background: #f27649;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}
.btn-primary[disabled] {
  opacity: 0.6;
}
</style>
