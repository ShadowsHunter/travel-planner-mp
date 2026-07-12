<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAuthStore } from './stores/auth'

onLaunch(async () => {
  const auth = useAuthStore()
  if (auth.isLoggedIn) {
    const ok = await auth.checkAuth().catch(() => false)
    if (!ok) {
      // token 无效，跳登录（但不在登录页时才跳）
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      if (current?.route !== 'pages/login/index' && current?.route !== 'pages/register/index') {
        uni.reLaunch({ url: '/pages/login/index' })
      }
    }
  } else {
    // 无 token，跳登录
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    if (current?.route !== 'pages/login/index' && current?.route !== 'pages/register/index') {
      uni.reLaunch({ url: '/pages/login/index' })
    }
  }
})
</script>

<style>
/* DESIGN.md 全局变量 */
page {
  --color-primary: #FF385C;
  --color-ink: #222222;
  --color-canvas: #FFFFFF;
  background: #FFFFFF;
  color: #222222;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}
</style>
