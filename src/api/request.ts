/**
 * uni.request 封装，替代 axios。
 * 自动携带 token，401 清除登录态并跳登录页。
 */

const TOKEN_KEY = 'travel_token'
const USER_KEY = 'travel_user'
// dev 时换回 'http://localhost:3000/api'
const BASE_URL = 'https://qinzilv.cn/api'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: Record<string, unknown> | unknown[]
  params?: Record<string, string | number | undefined>
}

function buildUrl(url: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return url
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return qs ? `${url}?${qs}` : url
}

function request<T = any>(opts: RequestOptions): Promise<T> {
  const token = uni.getStorageSync(TOKEN_KEY) as string
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) header.Authorization = `Bearer ${token}`

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: buildUrl(`${BASE_URL}${opts.url}`, opts.params),
      // wx.request 实际支持 PATCH，但 @dcloudio/types 的 method 类型未收录，此处收窄绕过
      method: (opts.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'DELETE',
      data: opts.data as AnyObject,
      header,
      success: (res) => {
        const status = res.statusCode
        const data = res.data as T
        if (status === 401) {
          uni.removeStorageSync(TOKEN_KEY)
          uni.removeStorageSync(USER_KEY)
          // 用 reLaunch 跳登录页，避免页面栈累积
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('未登录'))
          return
        }
        if (status >= 200 && status < 300) {
          resolve(data)
        } else {
          reject(new Error(`请求失败 (${status})`))
        }
      },
      fail: (err) => reject(new Error(err.errMsg)),
    })
  })
}

export default {
  get: <T = any>(url: string, params?: Record<string, string | number | undefined>) =>
    request<T>({ url, method: 'GET', params }),
  post: <T = any>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data }),
  delete: <T = any>(url: string) => request<T>({ url, method: 'DELETE' }),
  patch: <T = any>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PATCH', data }),
}

export { TOKEN_KEY, USER_KEY }
