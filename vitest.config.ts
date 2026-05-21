import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,ts}', 'mobile/src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/utils/**/*.ts', 'src/stores/**/*.ts', 'src/adapters/**/*.ts', 'mobile/src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts']
    }
  },
  resolve: {
    alias: [
      { find: /^@\/adapters$/, replacement: resolve(__dirname, 'mobile/src/adapters/index') },
      { find: /^@\/stores$/, replacement: resolve(__dirname, 'mobile/src/stores') },
      { find: /^@\/utils$/, replacement: resolve(__dirname, 'mobile/src/stores/useUtils') },
      // useUtils.ts 中 uni-app 条件编译里的动态 import 指向不存在的 src/wordbanks/*.ts
      // 测试环境下用 stub 代替，避免 Vite import-analysis 报错（匹配整个路径）
      { find: /^@\/wordbanks\/.*\.ts$/, replacement: resolve(__dirname, 'mobile/src/stores/__wordbank-stub.ts') },
      { find: /^@\//, replacement: resolve(__dirname, 'src/') + '/' },
      { find: /^@shared\//, replacement: resolve(__dirname, 'src/') + '/' },
    ],
  },
})