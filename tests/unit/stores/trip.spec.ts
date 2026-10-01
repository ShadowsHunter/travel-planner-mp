import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// mock 整个 api 层：store 测试不触碰 request.ts / uni 全局
vi.mock('../../../src/api/trip', () => ({
  getTrips: vi.fn(),
  createTrip: vi.fn(),
  getTrip: vi.fn(),
  updateTrip: vi.fn(),
  deleteTrip: vi.fn(),
}))
vi.mock('../../../src/api/tripItem', () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  reorderItems: vi.fn(),
}))

import {
  createTrip as apiCreateTrip,
  getTrips as apiGetTrips,
  getTrip as apiGetTrip,
  updateTrip as apiUpdateTrip,
  deleteTrip as apiDeleteTrip,
  type Trip,
} from '../../../src/api/trip'
import {
  createItem as apiCreateItem,
  reorderItems as apiReorderItems,
  type TripItem,
} from '../../../src/api/tripItem'
import { useTripStore } from '../../../src/stores/trip'

function makeTrip(over: Partial<Trip> = {}): Trip {
  return {
    id: 't1',
    userId: 'u1',
    title: '测试行程',
    destination: '成都',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    theme: null,
    companions: 2,
    transport: null,
    coverColor: '#FF385C',
    days: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...over,
  }
}

function makeItem(over: Partial<TripItem> = {}): TripItem {
  return {
    id: 'i1',
    dayId: 'd1',
    type: 'sight',
    name: '宽窄巷子',
    address: null,
    time: null,
    notes: null,
    sortOrder: 0,
    lat: null,
    lng: null,
    poiId: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...over,
  }
}

const mockedGetTrips = vi.mocked(apiGetTrips)
const mockedCreateTrip = vi.mocked(apiCreateTrip)
const mockedGetTrip = vi.mocked(apiGetTrip)
const mockedUpdateTrip = vi.mocked(apiUpdateTrip)
const mockedDeleteTrip = vi.mocked(apiDeleteTrip)
const mockedCreateItem = vi.mocked(apiCreateItem)
const mockedReorder = vi.mocked(apiReorderItems)

describe('useTripStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchTrips 覆盖列表并复位 loading', async () => {
    mockedGetTrips.mockResolvedValue([makeTrip()])
    const store = useTripStore()
    await store.fetchTrips({ sort: 'created' })
    expect(mockedGetTrips).toHaveBeenCalledWith({ sort: 'created' })
    expect(store.trips).toHaveLength(1)
    expect(store.loading).toBe(false)
  })

  it('createTrip 新行程插入列表头部', async () => {
    const store = useTripStore()
    store.$patch({ trips: [makeTrip({ id: 'old' })] })
    mockedCreateTrip.mockResolvedValue(makeTrip({ id: 'new' }))
    await store.createTrip({
      title: '新',
      destination: '杭州',
      startDate: '2026-10-01',
      endDate: '2026-10-02',
    })
    expect(store.trips.map((t) => t.id)).toEqual(['new', 'old'])
  })

  it('updateTrip 同步列表与 current', async () => {
    const store = useTripStore()
    store.$patch({
      trips: [makeTrip({ id: 't1', title: '旧标题' })],
      current: makeTrip({ id: 't1', title: '旧标题' }),
    })
    mockedUpdateTrip.mockResolvedValue(makeTrip({ id: 't1', title: '新标题' }))
    await store.updateTrip('t1', { title: '新标题' })
    expect(store.trips[0].title).toBe('新标题')
    expect(store.current?.title).toBe('新标题')
  })

  it('removeTrip 从列表移除并清空 current', async () => {
    const store = useTripStore()
    store.$patch({ trips: [makeTrip({ id: 't1' })], current: makeTrip({ id: 't1' }) })
    mockedDeleteTrip.mockResolvedValue({ success: true })
    await store.removeTrip('t1')
    expect(store.trips).toHaveLength(0)
    expect(store.current).toBeNull()
  })

  it('addItem 未加载行程时抛错', async () => {
    const store = useTripStore()
    await expect(store.addItem('d1', { type: 'sight', name: 'x' })).rejects.toThrow('未加载行程')
  })

  it('addItem 追加到对应 day 并返回新条目', async () => {
    const store = useTripStore()
    store.$patch({
      current: makeTrip({
        id: 't1',
        days: [{ id: 'd1', tripId: 't1', dayNumber: 1, date: '2026-10-01', items: [] }],
      }),
    })
    mockedCreateItem.mockResolvedValue(makeItem({ id: 'i9', dayId: 'd1' }))
    const item = await store.addItem('d1', { type: 'food', name: '火锅' })
    expect(mockedCreateItem).toHaveBeenCalledWith('t1', 'd1', { type: 'food', name: '火锅' })
    expect(item.id).toBe('i9')
    expect(store.current?.days?.[0].items).toHaveLength(1)
  })

  it('reorderItems 乐观重排并更新 sortOrder', async () => {
    const store = useTripStore()
    const i1 = makeItem({ id: 'i1', sortOrder: 0 })
    const i2 = makeItem({ id: 'i2', sortOrder: 1 })
    store.$patch({
      current: makeTrip({
        id: 't1',
        days: [{ id: 'd1', tripId: 't1', dayNumber: 1, date: '2026-10-01', items: [i1, i2] }],
      }),
    })
    mockedReorder.mockResolvedValue(undefined)
    await store.reorderItems('d1', ['i2', 'i1'])
    const items = store.current?.days?.[0].items ?? []
    expect(items.map((i) => i.id)).toEqual(['i2', 'i1'])
    expect(items.map((i) => i.sortOrder)).toEqual([0, 1])
  })

  it('reorderItems API 失败时回滚（重新拉取详情）', async () => {
    const store = useTripStore()
    const i1 = makeItem({ id: 'i1' })
    const i2 = makeItem({ id: 'i2', sortOrder: 1 })
    const original = [i1, i2]
    store.$patch({
      current: makeTrip({
        id: 't1',
        days: [{ id: 'd1', tripId: 't1', dayNumber: 1, date: '2026-10-01', items: original }],
      }),
    })
    mockedReorder.mockRejectedValue(new Error('请求失败 (429)'))
    // 回滚路径调用 getTrip 拉服务端真值
    mockedGetTrip.mockResolvedValue(
      makeTrip({
        id: 't1',
        days: [{ id: 'd1', tripId: 't1', dayNumber: 1, date: '2026-10-01', items: [i1, i2] }],
      }),
    )
    await store.reorderItems('d1', ['i2', 'i1'])
    expect(mockedGetTrip).toHaveBeenCalledWith('t1')
    // 回滚后以服务端顺序为准
    expect(store.current?.days?.[0].items.map((i) => i.id)).toEqual(['i1', 'i2'])
  })

  it('reorderItems orderedIds 不完整时整体不动作', async () => {
    const store = useTripStore()
    store.$patch({
      current: makeTrip({
        id: 't1',
        days: [
          {
            id: 'd1',
            tripId: 't1',
            dayNumber: 1,
            date: '2026-10-01',
            items: [makeItem({ id: 'i1' }), makeItem({ id: 'i2', sortOrder: 1 })],
          },
        ],
      }),
    })
    await store.reorderItems('d1', ['i1'])
    expect(mockedReorder).not.toHaveBeenCalled()
    expect(store.current?.days?.[0].items.map((i) => i.id)).toEqual(['i1', 'i2'])
  })
})
