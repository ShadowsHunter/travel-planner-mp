import request from './request'
import type { TripItem } from './tripItem'

export interface TripDay {
  id: string
  tripId: string
  dayNumber: number
  date: string
  items: TripItem[]
}

export interface Trip {
  id: string
  userId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  theme: string | null
  companions: number
  transport: string | null
  coverColor: string
  days?: TripDay[]
  createdAt: string
  updatedAt: string
}

export interface ListTripsParams {
  sort?: 'date' | 'created'
  destination?: string
}

export interface CreateTripPayload {
  title: string
  destination: string
  startDate: string
  endDate: string
  theme?: string
  companions?: number
  transport?: string
  coverColor?: string
}

export type UpdateTripPayload = Partial<CreateTripPayload>

export function getTrips(params?: ListTripsParams): Promise<Trip[]> {
  return request.get('/trips', params as Record<string, string | undefined>)
}

export function createTrip(data: CreateTripPayload): Promise<Trip> {
  return request.post('/trips', data as unknown as Record<string, unknown>)
}

export function getTrip(id: string): Promise<Trip> {
  return request.get(`/trips/${id}`)
}

export function updateTrip(id: string, data: UpdateTripPayload): Promise<Trip> {
  return request.put(`/trips/${id}`, data as unknown as Record<string, unknown>)
}

export function deleteTrip(id: string): Promise<{ success: boolean }> {
  return request.delete(`/trips/${id}`)
}
// ---------- 分享 ----------
// 后端契约：POST /trips/:id/share 需登录，幂等（已有 token 复用）；
// GET /trips/shared/:token 免登录，404 = 分享不存在或已失效。

// 类型定义（后端响应白名单字段，无 userId/nickname/phone）
export interface SharedTripItem {
  type: string // 'sight' | 'food' | 'hotel' | 'transport' | 'other'
  name: string
  address: string | null
  time: string | null
  notes: string | null
  sortOrder: number
}

export interface SharedTripDay {
  dayNumber: number
  date: string
  items: SharedTripItem[]
}

export interface SharedTrip {
  id: string
  title: string
  destination: string
  days: SharedTripDay[]
}

export function shareTrip(id: string): Promise<{ token: string }> {
  return request.post(`/trips/${id}/share`)
}

export function getSharedTrip(token: string): Promise<SharedTrip> {
  return request.get(`/trips/shared/${token}`)
}
