import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    rules: {
      // uni-app 页面即完整页面，不要求多词组件名
      'vue/multi-word-component-names': 'off',
      // 请求封装等处刻意使用 any 默认泛型
      '@typescript-eslint/no-explicit-any': 'off',
      // uni 是小程序运行时全局对象，类型由 @dcloudio/types 提供
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      // *.vue 模块声明 shim 需要空对象类型参数
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
)
