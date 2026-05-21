/**
 * 步骤 4: 配置研发工作流与 AI 规范边界
 *
 * - 配置测试驱动策略：TDD / 测试覆盖 / 无测试（默认：测试覆盖。
 *   若选择"无测试"，必须触发防呆二次确认告警）
 * - 配置文档与 Git 权限边界
 * - 配置 Agent 技能挂载：动态遍历 res/tools/init/skills 目录
 */
import { select, multiselect, confirm, isCancel, cancel, note } from '@clack/prompts';
import { readdir } from 'fs/promises';
import { pathExists } from 'fs-extra';
import type {
  TestStrategy,
  DocPermission,
  GitPermission,
  StepResult,
} from '../types.js';

/** 返回上一步的标记值 */
const BACK_SENTINEL = '__back__' as const;

/** 在选项值类型上附加回退标记 */
type WithBack<T extends string> = T | typeof BACK_SENTINEL;

export interface WorkflowInput {
  testStrategy: TestStrategy;
  docPermission: DocPermission;
  gitPermission: GitPermission;
  skills: string[];
}

/**
 * 收集研发工作流与 AI 规范边界配置
 */
export async function collectWorkflow(
  skillsBasePath: string,
): Promise<StepResult<WorkflowInput>> {
  // ── 4.1 测试策略 ──
  const testStrategy = await select({
    message: '请选择测试策略：',
    options: [
      {
        value: 'coverage' as WithBack<TestStrategy>,
        label: '测试覆盖',
        hint: '推荐 — 为功能实现配套单元测试',
      },
      {
        value: 'tdd' as WithBack<TestStrategy>,
        label: 'TDD（测试驱动开发）',
        hint: '严格先写测试再写代码',
      },
      {
        value: 'none' as WithBack<TestStrategy>,
        label: '无测试',
        hint: '⚠️ 不编写自动化测试',
      },
      {
        value: BACK_SENTINEL as WithBack<TestStrategy>,
        label: '← 返回上一步',
        hint: '回到技术栈配置',
      },
    ],
    initialValue: 'coverage' as WithBack<TestStrategy>,
  });

  if (isCancel(testStrategy)) {
    cancel('操作已取消');
    process.exit(0);
  }

  if (testStrategy === BACK_SENTINEL) {
    return { type: 'back' };
  }

  // ── 防呆二次确认：选择"无测试"时 ──
  if (testStrategy === 'none') {
    note(
      '⚠️  警告：选择"无测试"意味着项目将没有任何自动化测试保护。\n' +
        '这可能导致：\n' +
        '  • 回归 Bug 难以发现\n' +
        '  • 重构风险显著增加\n' +
        '  • 代码质量难以保证',
      '风险提示',
    );

    const confirmNone = await confirm({
      message: '你确定要跳过测试吗？（不推荐）',
      initialValue: false,
    });

    if (isCancel(confirmNone) || !confirmNone) {
      cancel('已取消"无测试"选择，操作中止。请重新运行 init。');
      process.exit(0);
    }
  }

  // ── 4.2 文档更新权限 ──
  const docPermission = await select({
    message: '请配置 AI 文档更新权限：',
    options: [
      {
        value: 'deny' as WithBack<DocPermission>,
        label: '禁止自动更新',
        hint: '推荐 — AI 不可擅自修改核心文档',
      },
      {
        value: 'allow' as WithBack<DocPermission>,
        label: '允许自动更新',
        hint: 'AI 可根据需要更新文档',
      },
      {
        value: BACK_SENTINEL as WithBack<DocPermission>,
        label: '← 返回上一步',
        hint: '回到测试策略选择',
      },
    ],
    initialValue: 'deny' as WithBack<DocPermission>,
  });

  if (isCancel(docPermission)) {
    cancel('操作已取消');
    process.exit(0);
  }

  if (docPermission === BACK_SENTINEL) {
    return { type: 'back' };
  }

  // ── 4.3 Git 提交权限 ──
  const gitPermission = await select({
    message: '请配置 AI Git 操作权限：',
    options: [
      {
        value: 'manual-only' as WithBack<GitPermission>,
        label: '仅限手动提交',
        hint: '推荐 — AI 禁止 git commit/push',
      },
      {
        value: 'allow' as WithBack<GitPermission>,
        label: '允许自动提交',
        hint: 'AI 可执行 git 写入操作',
      },
      {
        value: BACK_SENTINEL as WithBack<GitPermission>,
        label: '← 返回上一步',
        hint: '回到文档权限选择',
      },
    ],
    initialValue: 'manual-only' as WithBack<GitPermission>,
  });

  if (isCancel(gitPermission)) {
    cancel('操作已取消');
    process.exit(0);
  }

  if (gitPermission === BACK_SENTINEL) {
    return { type: 'back' };
  }

  // ── 4.4 Agent 技能挂载 ──
  const skills = await collectSkills(skillsBasePath);

  return {
    type: 'next',
    data: {
      testStrategy,
      docPermission,
      gitPermission,
      skills,
    },
  };
}

/**
 * 动态遍历技能目录，生成技能列表供用户多选
 */
async function collectSkills(skillsBasePath: string): Promise<string[]> {
  // 检查技能目录是否存在
  const exists = await pathExists(skillsBasePath);
  if (!exists) {
    return [];
  }

  try {
    const entries = await readdir(skillsBasePath, { withFileTypes: true });
    const skillDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    if (skillDirs.length === 0) {
      return [];
    }

    const selected = await multiselect({
      message: '请选择要挂载的 Agent 技能（可多选）：',
      options: skillDirs.map((name) => ({
        value: name,
        label: name,
      })),
      required: false,
    });

    if (isCancel(selected)) {
      cancel('操作已取消');
      process.exit(0);
    }

    return (selected as string[]) ?? [];
  } catch {
    return [];
  }
}
