import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试文件目录
    include: ['src/**/*.test.ts'],
    // 使用 Node.js 环境
    environment: 'node',
    // 全局设置
    globals: false,
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/__tests__/**',
      ],
      reporter: ['text', 'json', 'html'],
    },
  },
});
