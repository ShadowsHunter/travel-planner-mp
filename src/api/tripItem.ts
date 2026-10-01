import request from './request'

export type TripItemType = 'sight' | 'food' | 'hotel' | 'transport' | 'other'

export interface TripItem {
  id: string
  dayId: string
  type: TripItemType
  name: string
  address: string | null
  time: string | null
  notes: string | null
  sortOrder: number
  lat: string | null
  lng: string | null
  poiId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateItemPayload {
  type: TripItemType
  name: string
  address?: string
  time?: string
  notes?: string
  lat?: number
  lng?: number
  poiId?: string
}

export type UpdateItemPayload = Partial<CreateItemPayload>

export function createItem(
  tripId: string,
  dayId: string,
  data: CreateItemPayload,
): Promise<TripItem> {
  return request.post(
    `/trips/${tripId}/days/${dayId}/items`,
    data as unknown as Record<string, unknown>,
  )
}

export function updateItem(id: string, data: UpdateItemPayload): Promise<TripItem> {
  return request.put(`/items/${id}`, data as unknown as Record<string, unknown>)
}

export function deleteItem(id: string): Promise<{ success: boolean }> {
  return request.delete(`/items/${id}`)
}

export function reorderItems(tripId: string, dayId: string, orderedIds: string[]): Promise<void> {
  return request.patch(`/trips/${tripId}/days/${dayId}/items/reorder`, { orderedIds })
}
