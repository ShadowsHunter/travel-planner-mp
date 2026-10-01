import { defineConfig } from 'vitest/config'

/**
 * 纯逻辑单元测试配置：node 环境，不加载 uni 插件。
 * api 层在测试中通过 vi.mock 替换，uni 全局不被触碰。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
  },
})
