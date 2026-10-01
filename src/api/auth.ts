import request from './request'

/** 用户信息（与后端 User 实体对齐，JSON 字段为 camelCase）。 */
export interface User {
  id: string
  phone: string
  nickname: string | null
  avatar: string | null
  createdAt: string
  updatedAt: string
}

/** 注册：手机号 + 密码 + 昵称。 */
export function register(
  phone: string,
  password: string,
  nickname: string,
): Promise<{ token: string; user: User }> {
  return request.post('/auth/register', { phone, password, nickname })
}

/** 密码登录，返回 JWT token + 用户。 */
export function login(phone: string, password: string): Promise<{ token: string; user: User }> {
  return request.post('/auth/login', { phone, password })
}

/** 获取当前登录用户。 */
export function getMe(): Promise<{ user: User }> {
  return request.get('/auth/me')
}
