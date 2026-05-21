/**
 * 预览环节
 *
 * 在所有输入完成后、文件写入前，展示配置摘要供用户确认。
 * 用户可选择确认生成，或退回到任意步骤修改。
 */
import { select, note, isCancel, cancel } from '@clack/prompts';
import type { InitOptions, Language } from '../types.js';

/** 预览操作：确认生成 或 返回某一步修改 */
export type PreviewAction =
  | { type: 'confirm' }
  | { type: 'back'; step: number };

/** 语言标签映射 */
const LANGUAGE_LABELS: Record<Language, string> = {
  csharp: 'C#',
  fsharp: 'F#',
  typescript: 'TypeScript',
  rust: 'Rust',
  cpp: 'C++',
};

/** 测试策略标签 */
const TEST_LABELS: Record<string, string> = {
  tdd: 'TDD（测试驱动开发）',
  coverage: '测试覆盖',
  none: '无测试',
};

/** 权限标签 */
const PERM_LABELS: Record<string, string> = {
  deny: '禁止',
  allow: '允许',
  'manual-only': '仅限手动',
};

/**
 * 展示配置预览并获取用户操作
 */
export async function showPreview(options: InitOptions): Promise<PreviewAction> {
  // 构建预览摘要
  const engineNames = options.engines
    .map((e) => (e === 'github-copilot' ? 'GitHub Copilot' : 'Crush'))
    .join('、');

  const dotnetInfo = options.dotnetVersion
    ? ` (.NET ${options.dotnetVersion === 'net8' ? '8' : '10'})`
    : '';

  const skillsInfo =
    options.skills.length > 0 ? options.skills.join('、') : '(未选择)';

  const summary = [
    `📛 项目名称: ${options.projectName}`,
    options.description ? `📝 项目描述: ${options.description}` : '',
    `🤖 AI 引擎: ${engineNames}`,
    `🔧 技术栈: ${LANGUAGE_LABELS[options.language]} — ${options.deliveryType}${dotnetInfo}`,
    `🧪 测试策略: ${TEST_LABELS[options.testStrategy]}`,
    `📄 文档权限: ${PERM_LABELS[options.docPermission]}自动更新`,
    `🔀 Git 权限: AI ${PERM_LABELS[options.gitPermission]}提交`,
    `🛠️ Agent 技能: ${skillsInfo}`,
  ]
    .filter(Boolean)
    .join('\n');

  note(summary, '📋 配置预览');

  const action = await select({
    message: '确认以上配置并生成文件？',
    options: [
      { value: 'confirm', label: '✅ 确认并生成文件', hint: '开始写入配置文件' },
      { value: 'back-1', label: '← 修改项目信息', hint: '返回步骤 1' },
      { value: 'back-2', label: '← 修改 AI 引擎', hint: '返回步骤 2' },
      { value: 'back-3', label: '← 修改技术栈', hint: '返回步骤 3' },
      { value: 'back-4', label: '← 修改工作流', hint: '返回步骤 4' },
    ],
  });

  if (isCancel(action)) {
    cancel('操作已取消');
    process.exit(0);
  }

  if (action === 'confirm') {
    return { type: 'confirm' };
  }

  // 解析返回步骤：'back-1' → 1, 'back-2' → 2, ...
  const step = parseInt((action as string).replace('back-', ''), 10);
  return { type: 'back', step };
}
