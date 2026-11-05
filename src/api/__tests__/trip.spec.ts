import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

// 直接 mock request 封装本身：API 层测试只验证 url 拼接与响应透传，不触碰 uni 全局
vi.mock('../request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}))

import request from '../request'
import {
  getSharedTrip,
  shareTrip,
  type SharedTrip,
  type SharedTripDay,
  type SharedTripItem,
} from '../trip'

const mockedGet = vi.mocked(request.get)
const mockedPost = vi.mocked(request.post)

function makeSharedTrip(): SharedTrip {
  return {
    id: 't1',
    title: '海南度假',
    destination: '三亚',
    days: [
      {
        dayNumber: 1,
        date: '2026-08-01',
        items: [
          {
            type: 'sight',
            name: '蜈支洲岛',
            address: '海棠湾',
            time: '09:00',
            notes: null,
            sortOrder: 0,
          },
        ],
      },
    ],
  }
}

describe('share API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shareTrip 调用 POST /trips/:id/share 并透传响应', async () => {
    mockedPost.mockResolvedValue({ token: 'tok-abc' })
    const res = await shareTrip('t1')
    expect(mockedPost).toHaveBeenCalledTimes(1)
    expect(mockedPost).toHaveBeenCalledWith('/trips/t1/share')
    expect(res).toEqual({ token: 'tok-abc' })
  })

  it('getSharedTrip 调用 GET /trips/shared/:token 并透传响应', async () => {
    const shared = makeSharedTrip()
    mockedGet.mockResolvedValue(shared)
    const res = await getSharedTrip('tok123')
    expect(mockedGet).toHaveBeenCalledTimes(1)
    expect(mockedGet).toHaveBeenCalledWith('/trips/shared/tok123')
    expect(res).toEqual(shared)
  })

  it('getSharedTrip 对失效 token 向上抛错（由调用方处理）', async () => {
    mockedGet.mockRejectedValue(new Error('请求失败 (404)'))
    await expect(getSharedTrip('expired')).rejects.toThrow('请求失败 (404)')
  })

  it('SharedTrip 响应仅含白名单字段（无 userId/nickname/phone）', () => {
    const shared = makeSharedTrip()
    const sensitiveKeys = ['userId', 'nickname', 'phone'] as const
    expect(Object.keys(shared).sort()).toEqual(['days', 'destination', 'id', 'title'])
    expect(Object.keys(shared.days[0]).sort()).toEqual(['date', 'dayNumber', 'items'])
    expect(Object.keys(shared.days[0].items[0]).sort()).toEqual([
      'address',
      'name',
      'notes',
      'sortOrder',
      'time',
      'type',
    ])
    for (const key of sensitiveKeys) {
      expect(shared).not.toHaveProperty(key)
      for (const day of shared.days) {
        for (const item of day.items) {
          expect(item).not.toHaveProperty(key)
        }
      }
    }
  })

  it('SharedTrip 类型为白名单字段（编译期约束）', () => {
    expectTypeOf<SharedTrip>().toEqualTypeOf<{
      id: string
      title: string
      destination: string
      days: SharedTripDay[]
    }>()
    expectTypeOf<SharedTripDay>().toEqualTypeOf<{
      dayNumber: number
      date: string
      items: SharedTripItem[]
    }>()
    expectTypeOf<SharedTripItem>().toEqualTypeOf<{
      type: string
      name: string
      address: string | null
      time: string | null
      notes: string | null
      sortOrder: number
    }>()
  })
})