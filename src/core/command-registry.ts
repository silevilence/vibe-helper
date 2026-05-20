/**
 * 命令注册架构 (Command Registry)
 *
 * 基于 commander 的插件化、松耦合子命令注册架构。
 * 预留接口确保未来能平滑横向扩展（如 add、eject、audit 等工具）。
 */
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Command } from 'commander';
import type { CommandModule, ToolMenuItem } from './types.js';

// ESM 下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 已注册的工具菜单项缓存
 */
const tools: ToolMenuItem[] = [];

/**
 * 异步加载所有命令模块并注册到 commander 实例
 *
 * 遍历 src/commands/ 目录，动态导入每个 .ts 命令模块，
 * 调用其 register 方法完成注册。
 */
export async function loadCommands(program: Command): Promise<void> {
  const commandsDir = join(__dirname, '../commands');

  try {
    const entries = await readdir(commandsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

      const modulePath = join(commandsDir, entry.name);
      try {
        // Windows ESM 兼容：必须使用 file:// URL 格式
        const moduleUrl = pathToFileURL(modulePath).href;
        const mod = await import(moduleUrl) as { default?: CommandModule };

        if (mod.default?.register && typeof mod.default.register === 'function') {
          mod.default.register(program);
          tools.push({
            value: mod.default.name,
            label: mod.default.description,
          });
        }
      } catch (err) {
        // 跳过加载失败的命令模块，不中断整体流程
        console.warn(`[vibe-helper] 警告：无法加载命令模块 "${entry.name}"`, err instanceof Error ? err.message : err);
      }
    }
  } catch {
    // commands 目录不存在或无法读取时静默处理
  }
}

/**
 * 获取所有已注册的工具菜单列表
 */
export function getRegisteredTools(): ToolMenuItem[] {
  return tools;
}
