/**
 * generator/index.ts 单元测试
 *
 * 覆盖：generateFiles 流程、showGenerationSummary 输出
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFiles, showGenerationSummary } from '../../core/generator/index.js';
import type { InitOptions } from '../../core/types.js';

// Mock @clack/prompts — 不引用外部变量，安全
vi.mock('@clack/prompts', () => ({
  spinner: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
  note: (...args: unknown[]) => {
    mockNoteCalls.push(args);
  },
  isCancel: vi.fn(),
  cancel: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
}));

const mockNoteCalls: unknown[][] = [];

// Mock fs-extra — 使用 vi.hoisted 避免变量提升问题
const { mockOutputFile, mockCopy, mockEnsureDir, mockPathExists } = vi.hoisted(() => ({
  mockOutputFile: vi.fn().mockResolvedValue(undefined),
  mockCopy: vi.fn().mockResolvedValue(undefined),
  mockEnsureDir: vi.fn().mockResolvedValue(undefined),
  mockPathExists: vi.fn().mockResolvedValue(false),
}));

vi.mock('fs-extra', () => ({
  outputFile: mockOutputFile,
  copy: mockCopy,
  ensureDir: mockEnsureDir,
  pathExists: mockPathExists,
}));

// Mock fs/promises — generateFiles 中动态 import('fs/promises') 用于读取 ROADMAP
vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue('# Roadmap Content'),
}));

// Mock file-check
const { mockFileExists } = vi.hoisted(() => ({
  mockFileExists: vi.fn().mockResolvedValue(false),
}));

vi.mock('../../core/utils/file-check.js', () => ({
  fileExists: mockFileExists,
  findExistingFiles: vi.fn().mockResolvedValue([]),
  getResPath: vi.fn(),
}));

// Mock confirm-overwrite
vi.mock('../../core/prompts/confirm-overwrite.js', () => ({
  confirmOverwrite: vi.fn().mockResolvedValue('overwrite'),
}));

// Mock template-loader
vi.mock('../../core/generator/template-loader.js', () => ({
  buildCopilotInstructions: vi.fn().mockResolvedValue('# Generated Instructions\n\nThis is test content.'),
  buildCrushJson: vi.fn().mockResolvedValue('{"name":"test"}'),
  getRoadmapTemplatePath: vi.fn().mockReturnValue('/fake/ROADMAP.md'),
  getSkillsResPath: vi.fn().mockReturnValue('/fake/skills'),
}));

import { confirmOverwrite } from '../../core/prompts/confirm-overwrite.js';
import { buildCopilotInstructions, buildCrushJson } from '../../core/generator/template-loader.js';

function makeOptions(overrides: Partial<InitOptions> = {}): InitOptions {
  return {
    projectName: 'test-project',
    description: 'A test project',
    engines: ['github-copilot'],
    language: 'typescript',
    deliveryType: 'CLI',
    testStrategy: 'coverage',
    docPermission: 'deny',
    gitPermission: 'manual-only',
    skills: [],
    ...overrides,
  };
}

describe('generateFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认：所有文件都不存在（走"创建"路径）
    mockFileExists.mockResolvedValue(false);
    mockOutputFile.mockResolvedValue(undefined);
    mockEnsureDir.mockResolvedValue(undefined);
    mockCopy.mockResolvedValue(undefined);
  });

  // ── 正常情况：最小配置（仅 GitHub Copilot） ──
  it('仅 GitHub Copilot 引擎 → 生成 copilot-instructions.md 和 ROADMAP.md', async () => {
    // ROADMAP 模板存在 → fileExists(roadmapSrc) = true
    mockFileExists.mockImplementation((p: string) => {
      return Promise.resolve(String(p).replace(/\\/g, '/').includes('ROADMAP.md'));
    });

    const options = makeOptions();
    const result = await generateFiles(options, '/fake/res', '/fake/cwd');

    expect(result.created).toContain('.github/copilot-instructions.md');
    expect(result.created).toContain('ROADMAP.md');
    expect(result.failed).toHaveLength(0);
    expect(buildCopilotInstructions).toHaveBeenCalled();
  });

  // ── 正常情况：启用 Crush 引擎 ──
  it('启用 Crush + Copilot → 同时生成 copilot-instructions.md 和 crush.json', async () => {
    mockFileExists.mockResolvedValue(true);

    const options = makeOptions({ engines: ['github-copilot', 'crush'] });
    const result = await generateFiles(options, '/fake/res', '/fake/cwd');

    expect(result.created).toContain('.github/copilot-instructions.md');
    expect(result.created).toContain('crush.json');
    expect(buildCrushJson).toHaveBeenCalled();
  });

  // ── 正常情况：仅 Crush → 仅生成 crush.json ──
  it('仅 Crush 引擎 → 不生成 copilot-instructions.md', async () => {
    mockFileExists.mockResolvedValue(true);

    const options = makeOptions({ engines: ['crush'] });
    const result = await generateFiles(options, '/fake/res', '/fake/cwd');

    expect(result.created).toContain('crush.json');
    expect(result.created).not.toContain('.github/copilot-instructions.md');
    expect(buildCopilotInstructions).not.toHaveBeenCalled();
  });

  // ── 边界情况：ROADMAP.md 模板不存在 ──
  it('ROADMAP.md 模板不存在 → 跳过生成', async () => {
    // 所有 fileExists 都返回 false（包括 roadmap 检查）
    mockFileExists.mockResolvedValue(false);

    const options = makeOptions();
    const result = await generateFiles(options, '/fake/res', '/fake/cwd');

    expect(result.created).not.toContain('ROADMAP.md');
  });

  // ── 边界情况：空技能列表 → 不复制技能目录 ──
  it('空技能列表 → 不复制任何技能目录', async () => {
    mockFileExists.mockResolvedValue(true);

    const options = makeOptions({ skills: [] });
    const result = await generateFiles(options, '/fake/res', '/fake/cwd');

    expect(mockCopy).not.toHaveBeenCalled();
    expect(result.created).not.toContain(expect.stringContaining('.github/skills'));
  });

  // ── 边界情况：文件已存在且用户选择跳过 ──
  it('文件已存在且用户选择跳过 → 记录到 skipped', async () => {
    // 目标文件"已存在" → fileExists 返回 true，触发覆盖确认
    mockFileExists.mockResolvedValue(true);
    vi.mocked(confirmOverwrite).mockResolvedValue('skip' as never);

    const options = makeOptions({ engines: ['crush'] });
    const result = await generateFiles(options, '/fake/res', '/fake/cwd');

    expect(result.skipped).toContain('crush.json');
    expect(result.created).not.toContain('crush.json');
  });

  // ── 异常情况：写入失败 ──
  it('写入失败 → 记录到 failed', async () => {
    // ROADMAP 存在但写入时抛出异常
    mockFileExists.mockResolvedValue(false);
    mockOutputFile.mockRejectedValue(new Error('磁盘写入错误'));

    const options = makeOptions({ engines: ['crush'] });
    const result = await generateFiles(options, '/fake/res', '/fake/cwd');

    expect(result.failed.length).toBeGreaterThan(0);
  });
});

describe('showGenerationSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoteCalls.length = 0;
  });

  function getNoteCalls(): string[][] {
    return mockNoteCalls.map(call => call as string[]);
  }

  // ── 正常情况：三项均有内容 ──
  it('有创建、跳过、失败项 → 显示三类信息', () => {
    showGenerationSummary({
      created: ['a.md', 'b.md'],
      skipped: ['c.md'],
      failed: [{ path: 'd.md', error: '权限不足' }],
    });

    const calls = getNoteCalls();
    expect(calls).toHaveLength(3);
    // 第一项：已生成
    expect(calls[0]![0]).toContain('a.md');
    expect(calls[0]![1]).toBe('已生成');
    // 第二项：已跳过
    expect(calls[1]![0]).toContain('c.md');
    expect(calls[1]![1]).toBe('已跳过');
    // 第三项：失败
    expect(calls[2]![0]).toContain('d.md');
    expect(calls[2]![1]).toBe('失败');
  });

  // ── 边界情况：仅创建列表 ──
  it('仅有创建项 → 只显示已生成', () => {
    showGenerationSummary({
      created: ['x.md'],
      skipped: [],
      failed: [],
    });

    const calls = getNoteCalls();
    expect(calls).toHaveLength(1);
  });

  // ── 边界情况：全空 ──
  it('全部为空 → 不显示任何 note', () => {
    showGenerationSummary({
      created: [],
      skipped: [],
      failed: [],
    });

    const calls = getNoteCalls();
    expect(calls).toHaveLength(0);
  });

  // ── 边界情况：失败项包含多条 ──
  it('多条失败 → 全部展示', () => {
    showGenerationSummary({
      created: [],
      skipped: [],
      failed: [
        { path: 'a.md', error: 'EACCES' },
        { path: 'b.md', error: 'ENOENT' },
      ],
    });

    const calls = getNoteCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]![0]).toContain('a.md');
    expect(calls[0]![0]).toContain('b.md');
  });
});
