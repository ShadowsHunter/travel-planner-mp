import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { TripTemplate } from '../config/tripTemplates'

/**
 * 模板暂存（读后即焚）：发现页 set() → create 页 consume()。
 * 用 store 而非 URL query 传模板：数据量大，且与编辑模式（options.id）天然互斥——
 * id > pending 模板 > 空白新建。读后即焚防止刷新/重进重复预填。
 */
export const useTemplateStore = defineStore('template', () => {
  const pending = ref<TripTemplate | null>(null)

  function set(template: TripTemplate) {
    pending.value = template
  }

  function consume(): TripTemplate | null {
    const template = pending.value
    pending.value = null
    return template
  }

  return { pending, set, consume }
})
