/**
 * 步骤 2: 配置 AI Agent 引擎
 *
 * 选择核心辅助工具（提供 GitHub Copilot、Crush 选项，支持多选）。
 * 支持返回上一步。
 */
import { multiselect, isCancel, cancel } from '@clack/prompts';
import type { AiEngine, StepResult } from '../types.js';

export interface AiEngineInput {
  engines: AiEngine[];
}

/** 返回上一步的标记值 */
const BACK_SENTINEL = '__back__' as const;

/**
 * 收集 AI Agent 引擎选择
 */
export async function collectAiEngine(): Promise<StepResult<AiEngineInput>> {
  const engines = await multiselect({
    message: '请选择要使用的 AI Agent 引擎（可多选）：',
    options: [
      {
        value: 'github-copilot' as const,
        label: 'GitHub Copilot',
        hint: '推荐 — GitHub 官方 AI 编程助手',
      },
      {
        value: 'crush' as const,
        label: 'Crush',
        hint: '由 Charm 开发的开源 AI 编程 Agent，运行在终端中',
      },
      {
        value: BACK_SENTINEL,
        label: '← 返回上一步',
        hint: '回到项目信息填写',
      },
    ],
    required: true,
  });

  if (isCancel(engines)) {
    cancel('操作已取消');
    process.exit(0);
  }

  // 检测是否选择了返回
  const selected = engines as string[];
  if (selected.includes(BACK_SENTINEL)) {
    return { type: 'back' };
  }

  return { type: 'next', data: { engines: selected as AiEngine[] } };
}
