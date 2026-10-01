import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTemplateStore } from '../../../src/stores/template'
import type { TripTemplate } from '../../../src/config/tripTemplates'

const mockTemplate: TripTemplate = {
  id: 'test-1',
  title: '测试模板',
  destination: '测试城',
  days: 2,
  theme: '自由行',
  transport: '高铁',
  coverColor: '#FF385C',
  highlights: ['a', 'b'],
  dayItems: [[{ type: 'sight', name: '景点一' }], []],
}

describe('useTemplateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始 pending 为 null', () => {
    const store = useTemplateStore()
    expect(store.pending).toBeNull()
  })

  it('set 后 pending 有值，consume 返回模板并清空（读后即焚）', () => {
    const store = useTemplateStore()
    store.set(mockTemplate)
    expect(store.pending?.id).toBe('test-1')

    const consumed = store.consume()
    expect(consumed?.id).toBe('test-1')
    expect(store.pending).toBeNull()

    // 二次 consume 拿到 null，防止重复预填/重复建条目
    expect(store.consume()).toBeNull()
  })
})
