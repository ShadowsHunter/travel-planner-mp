import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getMe, login as apiLogin, register as apiRegister, type User } from '../api/auth'
import { TOKEN_KEY, USER_KEY } from '../api/request'

/** uni storage 替代 localStorage，同步 API 用法几乎一致 */
function loadUser(): User | null {
  try {
    const raw = uni.getStorageSync(USER_KEY) as string
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function persistUser(u: User | null) {
  if (u) {
    uni.setStorageSync(USER_KEY, JSON.stringify(u))
  } else {
    uni.removeStorageSync(USER_KEY)
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>((uni.getStorageSync(TOKEN_KEY) as string) ?? '')
  const user = ref<User | null>(loadUser())

  const isLoggedIn = computed(() => !!token.value)

  function setToken(value: string) {
    token.value = value
    if (value) {
      uni.setStorageSync(TOKEN_KEY, value)
    } else {
      uni.removeStorageSync(TOKEN_KEY)
    }
  }

  async function register(phone: string, password: string, nickname: string) {
    const { token: t, user: u } = await apiRegister(phone, password, nickname)
    setToken(t)
    user.value = u
    persistUser(u)
  }

  async function login(phone: string, password: string) {
    const { token: t, user: u } = await apiLogin(phone, password)
    setToken(t)
    user.value = u
    persistUser(u)
  }

  function logout() {
    setToken('')
    user.value = null
    persistUser(null)
    uni.reLaunch({ url: '/pages/login/index' })
  }

  async function checkAuth(): Promise<boolean> {
    if (!token.value) return false
    try {
      const { user: u } = await getMe()
      user.value = u
      persistUser(u)
      return true
    } catch {
      setToken('')
      user.value = null
      persistUser(null)
      return false
    }
  }

  return { token, user, isLoggedIn, register, login, logout, checkAuth }
})
