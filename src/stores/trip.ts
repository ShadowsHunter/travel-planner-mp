import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createTrip as apiCreateTrip,
  deleteTrip as apiDeleteTrip,
  getTrip as apiGetTrip,
  getTrips as apiGetTrips,
  updateTrip as apiUpdateTrip,
  type CreateTripPayload,
  type ListTripsParams,
  type Trip,
  type TripDay,
  type UpdateTripPayload,
} from '../api/trip'
import {
  createItem as apiCreateItem,
  deleteItem as apiDeleteItem,
  reorderItems as apiReorderItems,
  updateItem as apiUpdateItem,
  type CreateItemPayload,
  type TripItem,
  type UpdateItemPayload,
} from '../api/tripItem'

/** 直接从 web 端拷贝，零改动（无 platform 依赖）。 */
export const useTripStore = defineStore('trip', () => {
  const trips = ref<Trip[]>([])
  const current = ref<Trip | null>(null)
  const loading = ref(false)

  async function fetchTrips(params?: ListTripsParams) {
    loading.value = true
    try {
      trips.value = await apiGetTrips(params)
    } finally {
      loading.value = false
    }
  }

  async function fetchTrip(id: string) {
    current.value = await apiGetTrip(id)
    return current.value
  }

  async function createTrip(payload: CreateTripPayload): Promise<Trip> {
    const trip = await apiCreateTrip(payload)
    trips.value = [trip, ...trips.value]
    return trip
  }

  async function updateTrip(id: string, payload: UpdateTripPayload): Promise<Trip> {
    const trip = await apiUpdateTrip(id, payload)
    const idx = trips.value.findIndex((t) => t.id === id)
    if (idx !== -1) trips.value[idx] = trip
    if (current.value?.id === id) current.value = trip
    return trip
  }

  async function removeTrip(id: string) {
    await apiDeleteTrip(id)
    trips.value = trips.value.filter((t) => t.id !== id)
    if (current.value?.id === id) current.value = null
  }

  function findDay(dayId: string): TripDay | null {
    return current.value?.days?.find((d) => d.id === dayId) ?? null
  }

  async function addItem(dayId: string, payload: CreateItemPayload): Promise<TripItem> {
    if (!current.value) throw new Error('未加载行程')
    const item = await apiCreateItem(current.value.id, dayId, payload)
    const day = findDay(dayId)
    if (day) day.items.push(item)
    return item
  }

  async function updateItem(
    dayId: string,
    itemId: string,
    payload: UpdateItemPayload,
  ): Promise<TripItem> {
    const item = await apiUpdateItem(itemId, payload)
    const day = findDay(dayId)
    if (day) {
      const idx = day.items.findIndex((i) => i.id === itemId)
      if (idx !== -1) day.items[idx] = item
    }
    return item
  }

  async function removeItem(dayId: string, itemId: string): Promise<void> {
    await apiDeleteItem(itemId)
    const day = findDay(dayId)
    if (day) day.items = day.items.filter((i) => i.id !== itemId)
  }

  async function reorderItems(dayId: string, orderedIds: string[]): Promise<void> {
    const day = findDay(dayId)
    if (!day) return
    const byId = new Map(day.items.map((i) => [i.id, i]))
    const next = orderedIds.map((id) => byId.get(id)).filter((i): i is TripItem => !!i)
    if (next.length !== day.items.length) return
    day.items = next
    next.forEach((i, idx) => (i.sortOrder = idx))
    if (!current.value) return
    try {
      await apiReorderItems(current.value.id, dayId, orderedIds)
    } catch {
      await fetchTrip(current.value.id)
    }
  }

  return {
    trips,
    current,
    loading,
    fetchTrips,
    fetchTrip,
    createTrip,
    updateTrip,
    removeTrip,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
  }
})
