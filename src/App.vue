<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAuthStore } from './stores/auth'

onLaunch(async () => {
  const auth = useAuthStore()
  if (auth.isLoggedIn) {
    const ok = await auth.checkAuth().catch(() => false)
    if (ok) return
  }
  // 未登录或 token 失效：已在登录/注册页则不重复 reLaunch
  const route = getCurrentPages().pop()?.route ?? ''
  if (route !== 'pages/login/index' && route !== 'pages/register/index') {
    uni.reLaunch({ url: '/pages/login/index' })
  }
})
</script>

<style>
/* DESIGN.md 全局变量 */
page {
  --color-primary: #ff385c;
  --color-ink: #222222;
  --color-canvas: #ffffff;
  background: #ffffff;
  color: #222222;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei',
    sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}
</style>
