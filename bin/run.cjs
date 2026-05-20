#!/usr/bin/env node
/**
 * 智能 JS 桥接策略 (Smart JS Bridge Strategy)
 *
 * 根据运行环境动态判断执行策略：
 * - 优先使用已编译的 dist 产物（面向未来 npm 发布）
 * - 回退使用 npx tsx 执行源码（兼容当前直接从 GitHub 运行）
 */
const { existsSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const distEntry = join(__dirname, '../dist/index.js');
const srcEntry = join(__dirname, '../src/index.ts');

let result;

if (existsSync(distEntry)) {
  // 已编译产物存在，直接使用 Node.js 执行
  result = spawnSync(process.execPath, [distEntry, ...args], { stdio: 'inherit', shell: false });
} else {
  // 回退：使用 tsx 执行 TypeScript 源码（Windows 需 shell: true 以支持 npx.cmd）
  result = spawnSync('npx', ['tsx', srcEntry, ...args], { stdio: 'inherit', shell: true });
}

process.exit(result.status ?? 1);
