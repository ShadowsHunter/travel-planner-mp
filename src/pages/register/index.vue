<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()

const nickname = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')
const agreed = ref(false)
const shake = ref(false)

const phoneValid = computed(() => /^1\d{10}$/.test(phone.value))

function triggerShake() {
  shake.value = false
  setTimeout(() => { shake.value = true }, 16)
  setTimeout(() => { shake.value = false }, 500)
}

async function handleRegister() {
  errorMsg.value = ''
  if (!agreed.value) {
    triggerShake()
    uni.showToast({ title: '请先同意用户协议', icon: 'none' })
    return
  }
  if (!phoneValid.value) {
    errorMsg.value = '请输入正确的 11 位手机号'
    return
  }
  if (!password.value) {
    errorMsg.value = '请输入密码'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMsg.value = '两次密码输入不一致'
    return
  }
  loading.value = true
  try {
    await auth.register(phone.value, password.value, nickname.value || phone.value)
    uni.switchTab({ url: '/pages/trips/index' })
  } catch (err: unknown) {
    const msg = (err as Error)?.message
    errorMsg.value = msg || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function goLogin() {
  uni.navigateBack()
}
</script>

<template>
  <view class="page">
    <!-- 顶部品牌区 -->
    <view class="brand">
      <view class="brand-inner">
        <view class="logo">
          <text class="logo-icon">🧭</text>
        </view>
        <text class="brand-name">旅划</text>
        <text class="brand-slogan">让出行规划从 5 个 App 变成 1 个</text>
      </view>
    </view>

    <!-- 表单区 -->
    <view class="form-area">
      <view class="form-header">
        <text class="form-title">创建账号</text>
        <text class="form-subtitle">注册开启你的旅行规划</text>
      </view>

      <!-- 昵称（选填） -->
      <view class="input-group">
        <text class="input-icon">👤</text>
        <input
          class="input-field has-icon"
          v-model="nickname"
          placeholder="昵称（选填）"
        />
      </view>

      <!-- 手机号 -->
      <view class="phone-wrapper">
        <view class="phone-prefix">
          <text class="prefix-text">+86</text>
        </view>
        <input
          class="phone-input"
          v-model="phone"
          type="number"
          maxlength="11"
          placeholder="请输入手机号"
        />
      </view>

      <!-- 密码 -->
      <view class="input-group">
        <text class="input-icon">🔒</text>
        <input
          class="input-field has-icon"
          v-model="password"
          type="password"
          password
          placeholder="请输入密码"
        />
      </view>

      <!-- 确认密码 -->
      <view class="input-group">
        <text class="input-icon">🔒</text>
        <input
          class="input-field has-icon"
          v-model="confirmPassword"
          type="password"
          password
          placeholder="请确认密码"
        />
      </view>

      <!-- 错误提示 -->
      <text v-if="errorMsg" class="error-text">{{ errorMsg }}</text>

      <!-- 注册按钮 -->
      <view
        class="register-btn"
        :class="{ 'btn-disabled': loading }"
        @tap="handleRegister"
      >
        <text class="register-btn-text">{{ loading ? '注册中…' : '注 册' }}</text>
      </view>

      <!-- 登录链接 -->
      <view class="login-link" @tap="goLogin">
        <text class="link-normal">已有账号？</text>
        <text class="link-highlight">返回登录</text>
      </view>

      <!-- 协议勾选 -->
      <view class="agreement" :class="{ 'shake-anim': shake }">
        <checkbox
          :checked="agreed"
          @tap="agreed = !agreed"
          color="#FF385C"
          style="transform: scale(0.7)"
        />
        <text class="agreement-text">
          我已阅读并同意《用户协议》和《隐私政策》
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
}

/* 品牌区 */
.brand {
  background: #1A1A1A;
  padding-top: 120rpx;
  padding-bottom: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 0 40rpx 40rpx;
}
.brand-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.logo {
  width: 88rpx;
  height: 88rpx;
  background: #FF385C;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}
.logo-icon {
  font-size: 44rpx;
}
.brand-name {
  font-size: 48rpx;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}
.brand-slogan {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.55);
}

/* 表单区 */
.form-area {
  flex: 1;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.form-header {
  margin-bottom: 8rpx;
}
.form-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #222222;
  display: block;
}
.form-subtitle {
  font-size: 26rpx;
  color: #6A6A6A;
  margin-top: 8rpx;
  display: block;
}

/* 手机号输入 */
.phone-wrapper {
  display: flex;
  align-items: center;
  height: 88rpx;
  border: 1.5rpx solid #DDDDDD;
  border-radius: 16rpx;
  overflow: hidden;
}
.phone-prefix {
  background: #F7F7F7;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-right: 1rpx solid #DDDDDD;
}
.prefix-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #222222;
}
.phone-input {
  flex: 1;
  height: 100%;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #222222;
}

/* 通用输入框 */
.input-group {
  position: relative;
  display: flex;
  align-items: center;
  height: 88rpx;
  border: 1.5rpx solid #DDDDDD;
  border-radius: 16rpx;
  background: #FFFFFF;
}
.input-icon {
  position: absolute;
  left: 24rpx;
  font-size: 32rpx;
  z-index: 1;
}
.input-field {
  flex: 1;
  height: 100%;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #222222;
}
.input-field.has-icon {
  padding-left: 64rpx;
}

/* 错误文字 */
.error-text {
  font-size: 26rpx;
  color: #E53935;
  margin-top: -4rpx;
}

/* 注册按钮 */
.register-btn {
  background: #FF385C;
  border-radius: 16rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
}
.register-btn:active {
  background: #E00B41;
}
.btn-disabled {
  opacity: 0.6;
}
.register-btn-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
}

/* 登录链接 */
.login-link {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4rpx;
}
.link-normal {
  font-size: 26rpx;
  color: #6A6A6A;
}
.link-highlight {
  font-size: 26rpx;
  color: #FF385C;
  font-weight: 500;
}

/* 协议 */
.agreement {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}
.agreement-text {
  font-size: 22rpx;
  color: #929292;
  margin-left: -8rpx;
}

/* 抖动动画 */
@keyframes shake-x {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.shake-anim {
  animation: shake-x 0.4s ease;
}
.shake-anim .agreement-text {
  color: #E53935;
}
</style>
