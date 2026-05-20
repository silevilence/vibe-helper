#!/usr/bin/env node
/**
 * vibe-helper CLI 入口文件
 *
 * 负责基础设置、命令加载与 TUI 主界面渲染。
 * 采用插件化架构：每个子命令实现为独立模块，方便未来横向扩展。
 */
import { Command } from 'commander';
import { intro, outro, select, cancel, spinner, isCancel } from '@clack/prompts';
import { loadCommands, getRegisteredTools } from './core/command-registry.js';
import { handleError } from './core/utils/error-handler.js';
import type { ToolMenuItem } from './core/types.js';

// ── 基础程序设置 ────────────────────────────────────────────
const program = new Command();

program
  .name('vibe-helper')
  .description('针对 Vibe Coding 场景的 CLI/TUI 终端交互工具')
  .version('0.1.0')
  .showHelpAfterError('(提示：使用 --help 查看可用命令)');

// ── 应用程序入口 ────────────────────────────────────────────
async function main(): Promise<void> {
  // 1. 动态加载所有命令模块（插件化架构）
  const loadSpinner = spinner();
  loadSpinner.start('正在加载工具模块...');
  try {
    await loadCommands(program);
  } catch (err) {
    loadSpinner.stop('工具模块加载失败');
    handleError(err, '模块加载');
  }
  loadSpinner.stop('工具模块就绪');

  // 2. 如果用户传入了子命令参数，交由 commander 直接处理
  const userArgs = process.argv.slice(2);
  if (userArgs.length > 0) {
    program.parse(process.argv);
    return;
  }

  // 3. 无参数启动 → 展示 TUI 功能选择主界面
  showMainMenu();
}

// ── TUI 主菜单 ──────────────────────────────────────────────
async function showMainMenu(): Promise<void> {
  intro('🚀 vibe-helper — Vibe Coding 助手');

  const tools = getRegisteredTools();

  if (tools.length === 0) {
    cancel('暂无可用的工具模块。请确保 src/commands/ 目录中存在有效的命令文件。');
    process.exit(1);
  }

  // 构建菜单选项（预留未来扩展入口）
  const menuOptions = [
    ...tools.map((t: ToolMenuItem) => ({
      value: t.value,
      label: t.label,
      hint: t.hint,
    })),
    { value: 'exit', label: '退出', hint: '结束运行' },
  ];

  const selected = await select({
    message: '请选择要使用的工具：',
    options: menuOptions,
  });

  if (isCancel(selected) || selected === 'exit') {
    outro('👋 感谢使用 vibe-helper，再见！');
    process.exit(0);
  }

  // 将选择结果模拟为命令行参数传递给 commander
  process.argv.push(selected as string);
  program.parse(process.argv);
}

// ── 启动 ────────────────────────────────────────────────────
main().catch((err) => {
  handleError(err, 'vibe-helper');
});
