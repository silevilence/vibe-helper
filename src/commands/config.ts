/**
 * config 命令 — 全局配置管理工具
 *
 * 提供 TUI 交互式界面查看和修改 vibe-helper 的全局配置参数。
 * 支持子命令：
 *   - config (无参数)    — TUI 交互式配置菜单
 *   - config show        — 显示当前配置
 *   - config reset       — 重置为默认配置
 */
import type { Command } from 'commander';
import { intro, outro, note, select, confirm, cancel, isCancel, spinner, text } from '@clack/prompts';
import type { CommandModule, CrushOverwriteMode, LLMProvider } from '../core/types.js';
import {
  getConfig,
  getInitStrategy,
  updateConfig,
  updateInitStrategy,
  saveConfig,
  resetConfig,
  reloadConfig,
  getConfigFilePath,
} from '../core/config/config-manager.js';
import { handleError } from '../core/utils/error-handler.js';

const command: CommandModule = {
  name: 'config',
  description: '全局配置 — 管理工具运行参数',

  register(program: Command): void {
    const configCmd = program
      .command('config')
      .description('管理 vibe-helper 全局配置参数');

    // config show — 显示当前配置
    configCmd
      .command('show')
      .description('查看当前全局配置')
      .action(async () => {
        await showConfig();
      });

    // config reset — 重置配置
    configCmd
      .command('reset')
      .description('重置全部配置为默认值')
      .action(async () => {
        await resetConfigAction();
      });

    // config (无子命令) — TUI 交互式菜单
    configCmd.action(async () => {
      await interactiveConfig();
    });
  },
};

// ── config show ─────────────────────────────────────────────

async function showConfig(): Promise<void> {
  intro('📋 全局配置 — 查看');

  const config = await getConfig();

  note(formatConfigForDisplay(config), '当前配置');

  outro(`配置文件路径: ${getConfigFilePath()}`);
}

// ── config reset ────────────────────────────────────────────

async function resetConfigAction(): Promise<void> {
  intro('🔄 全局配置 — 重置');

  const confirmed = await confirm({
    message: '确认将所有配置重置为默认值？此操作不可撤销。',
    initialValue: false,
  });

  if (isCancel(confirmed) || !confirmed) {
    cancel('操作已取消，配置保持不变。');
    process.exit(0);
  }

  const s = spinner();
  s.start('正在重置配置...');
  await resetConfig();
  s.stop('配置已重置为默认值');

  outro('✅ 配置重置完成');
}

// ── config (TUI) ────────────────────────────────────────────

async function interactiveConfig(): Promise<void> {
  intro('⚙️  全局配置管理');

  await reloadConfig();
  let dirty = false;

  // 主菜单循环
  let running = true;
  while (running) {
    const choice = await select({
      message: '请选择要修改的配置项：',
      options: [
        {
          value: 'init',
          label: 'Init 工具执行策略',
          hint: '控制文件覆盖行为',
        },
        {
          value: 'llm',
          label: 'LLM 引擎网关配置',
          hint: '供应商 / 接口地址 / 模型',
        },
        {
          value: 'view',
          label: '查看当前完整配置',
          hint: '展示所有配置项',
        },
        {
          value: 'reset',
          label: '重置为默认值',
          hint: '所有配置恢复出厂设置',
        },
        {
          value: 'exit',
          label: '保存并退出',
          hint: dirty ? '有未保存的变更' : '配置未修改',
        },
        {
          value: 'quit',
          label: '不保存退出',
          hint: '放弃所有修改',
        },
      ],
    });

    if (isCancel(choice)) {
      cancel('操作已取消');
      process.exit(0);
    }

    switch (choice) {
      case 'init':
        dirty = (await configureInitStrategy()) || dirty;
        break;
      case 'llm':
        dirty = (await configureLLM()) || dirty;
        break;
      case 'view':
        await showCurrentConfig();
        break;
      case 'reset':
        await doReset();
        dirty = false;
        break;
      case 'exit':
        if (dirty) {
          const s = spinner();
          s.start('正在保存配置...');
          await saveConfig();
          s.stop('配置已保存');
          note(`配置文件: ${getConfigFilePath()}`, '保存位置');
        }
        outro('✅ 配置已更新');
        running = false;
        break;
      case 'quit':
        outro('👋 已放弃修改，配置保持不变');
        running = false;
        break;
    }
  }
}

// ── Init 策略配置子菜单（先选择要改的项，再改） ──────────

async function configureInitStrategy(): Promise<boolean> {
  const strategy = await getInitStrategy();

  // 展示当前值，让用户选要改哪个
  while (true) {
    const copilotLabel = strategy.copilotConfirmOverwrite ? '覆盖前二次确认' : '静默覆盖';
    const roadmapLabel = strategy.roadmapConfirmOverwrite ? '覆盖前二次确认' : '静默覆盖';
    const crushLabel =
      strategy.crushOverwriteMode === 'merge-confirm' ? '结构合并前二次确认'
        : strategy.crushOverwriteMode === 'confirm' ? '覆盖前二次确认'
        : '静默替换';

    const choice = await select({
      message: 'Init 策略 — 选择要修改的项（当前值见右侧提示）：',
      options: [
        {
          value: 'copilot',
          label: 'copilot-instructions.md 覆盖策略',
          hint: `当前：${copilotLabel}`,
        },
        {
          value: 'roadmap',
          label: 'ROADMAP.md 覆盖策略',
          hint: `当前：${roadmapLabel}`,
        },
        {
          value: 'crush',
          label: 'crush.json 覆盖策略',
          hint: `当前：${crushLabel}`,
        },
        {
          value: 'back',
          label: '← 返回主菜单',
        },
      ],
    });

    if (isCancel(choice) || choice === 'back') return false;

    switch (choice) {
      case 'copilot': {
        const val = await select({
          message: 'copilot-instructions.md 写入冲突控制：',
          options: [
            { value: 'true', label: '覆盖前二次确认', hint: '安全模式：文件存在时先询问' },
            { value: 'false', label: '静默覆盖', hint: '直接覆盖，不询问' },
          ],
        });
        if (isCancel(val)) break;
        updateInitStrategy({ copilotConfirmOverwrite: val === 'true' });
        strategy.copilotConfirmOverwrite = val === 'true';
        break;
      }
      case 'roadmap': {
        const val = await select({
          message: 'ROADMAP.md 写入冲突控制：',
          options: [
            { value: 'true', label: '覆盖前二次确认', hint: '安全模式：文件存在时先询问' },
            { value: 'false', label: '静默覆盖', hint: '直接覆盖，不询问' },
          ],
        });
        if (isCancel(val)) break;
        updateInitStrategy({ roadmapConfirmOverwrite: val === 'true' });
        strategy.roadmapConfirmOverwrite = val === 'true';
        break;
      }
      case 'crush': {
        const val = await select({
          message: 'crush.json 覆盖策略：',
          options: [
            { value: 'merge-confirm', label: '结构合并前二次确认', hint: '推荐：智能合并新旧 JSON 后询问' },
            { value: 'confirm', label: '覆盖前二次确认', hint: '直接替换前先询问' },
            { value: 'replace', label: '静默替换', hint: '不询问，直接覆盖' },
          ],
        });
        if (isCancel(val)) break;
        updateInitStrategy({ crushOverwriteMode: val as CrushOverwriteMode });
        strategy.crushOverwriteMode = val as CrushOverwriteMode;
        break;
      }
    }
    // 修改后回到选择界面，让用户可以看到更新后的 hint
  }
}

// ── LLM 引擎网关配置子菜单（先选择要改的项，再改） ────────

async function configureLLM(): Promise<boolean> {
  const config = await getConfig();
  const llm = config.llm;
  let changed = false;

  while (true) {
    const providerLabel =
      llm.provider === 'openai' ? 'OpenAI Chat'
        : llm.provider === 'gemini' ? 'Gemini'
        : 'Claude';

    const choice = await select({
      message: 'LLM 引擎 — 选择要修改的项（当前值见右侧提示）：',
      options: [
        {
          value: 'provider',
          label: '供应商类型',
          hint: `当前：${providerLabel}`,
        },
        {
          value: 'baseUrl',
          label: 'API 基础请求地址',
          hint: `当前：${llm.baseUrl || '(未设置)'}`,
        },
        {
          value: 'model',
          label: '模型资源标识',
          hint: `当前：${llm.modelId || '(未设置)'}`,
        },
        {
          value: 'back',
          label: '← 返回主菜单',
        },
      ],
    });

    if (isCancel(choice) || choice === 'back') return changed;

    switch (choice) {
      case 'provider': {
        const val = await select({
          message: '选择 LLM 供应商：',
          options: [
            { value: 'openai', label: 'OpenAI Chat', hint: 'api.openai.com' },
            { value: 'gemini', label: 'Gemini', hint: 'Google AI' },
            { value: 'claude', label: 'Claude', hint: 'Anthropic' },
          ],
        });
        if (isCancel(val)) break;
        updateConfig({ llm: { ...llm, provider: val as LLMProvider } });
        llm.provider = val as LLMProvider;
        changed = true;
        break;
      }
      case 'baseUrl': {
        const val = await select({
          message: 'API 基础请求地址：',
          options: [
            { value: 'https://api.openai.com/v1', label: 'OpenAI 官方', hint: 'api.openai.com/v1' },
            { value: 'https://generativelanguage.googleapis.com/v1beta', label: 'Gemini 官方', hint: 'Google AI' },
            { value: 'https://api.anthropic.com/v1', label: 'Claude 官方', hint: 'Anthropic' },
            { value: '__custom__', label: '自定义地址', hint: '手动输入' },
          ],
        });
        if (isCancel(val)) break;
        if (val === '__custom__') {
          const custom = await text({
            message: '请输入 API 基础请求地址：',
            placeholder: 'https://your-api.example.com/v1',
            defaultValue: llm.baseUrl,
          });
          if (isCancel(custom)) break;
          updateConfig({ llm: { ...llm, baseUrl: custom.trim() } });
          llm.baseUrl = custom.trim();
        } else {
          updateConfig({ llm: { ...llm, baseUrl: val as string } });
          llm.baseUrl = val as string;
        }
        changed = true;
        break;
      }
      case 'model': {
        const val = await select({
          message: '模型资源标识：',
          options: [
            { value: 'gpt-4', label: 'GPT-4', hint: 'OpenAI' },
            { value: 'gpt-4o', label: 'GPT-4o', hint: 'OpenAI 多模态' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', hint: 'OpenAI' },
            { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', hint: 'Google' },
            { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', hint: 'Google' },
            { value: 'claude-3-opus', label: 'Claude 3 Opus', hint: 'Anthropic' },
            { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', hint: 'Anthropic' },
            { value: '__custom__', label: '自定义模型', hint: '手动输入' },
          ],
        });
        if (isCancel(val)) break;
        if (val === '__custom__') {
          const custom = await text({
            message: '请输入模型资源标识 (Model ID)：',
            placeholder: 'your-model-id',
            defaultValue: llm.modelId,
          });
          if (isCancel(custom)) break;
          updateConfig({ llm: { ...llm, modelId: custom.trim() } });
          llm.modelId = custom.trim();
        } else {
          updateConfig({ llm: { ...llm, modelId: val as string } });
          llm.modelId = val as string;
        }
        changed = true;
        break;
      }
    }
  }
}

// ── 辅助函数 ────────────────────────────────────────────────

async function showCurrentConfig(): Promise<void> {
  const config = await getConfig();
  note(formatConfigForDisplay(config), '当前配置');
}

async function doReset(): Promise<void> {
  const confirmed = await confirm({
    message: '确认将所有配置重置为默认值？',
    initialValue: false,
  });

  if (isCancel(confirmed) || !confirmed) {
    cancel('操作已取消');
    return;
  }

  const s = spinner();
  s.start('正在重置...');
  await resetConfig();
  s.stop('已重置为默认值');
}

/**
 * 格式化配置对象为友好展示文本
 */
function formatConfigForDisplay(config: Record<string, unknown>, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${prefix}▸ ${key}:`);
      lines.push(formatConfigForDisplay(value as Record<string, unknown>, indent + 1));
    } else {
      lines.push(`${prefix}  ${key}: ${String(value)}`);
    }
  }

  return lines.join('\n');
}

export default command;
