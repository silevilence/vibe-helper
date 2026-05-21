/**
 * preview.ts 单元测试
 *
 * 覆盖：配置摘要构建、用户操作解析
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showPreview, type PreviewAction } from '../../core/prompts/preview.js';
import type { InitOptions } from '../../core/types.js';

// Mock @clack/prompts
const mockCancel = vi.fn();
const mockNote = vi.fn();
let mockSelectResult: unknown = 'confirm';

vi.mock('@clack/prompts', () => ({
  select: () => mockSelectResult,
  note: (...args: unknown[]) => mockNote(...args),
  isCancel: (val: unknown) => val === Symbol.for('clack:cancel'),
  cancel: (...args: unknown[]) => {
    mockCancel(...args);
    // 不调用 process.exit
  },
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
}));

vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

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

describe('showPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectResult = 'confirm';
  });

  // ── 正常情况：确认生成 ──
  it('用户选择确认 → 返回 confirm 动作', async () => {
    const result = await showPreview(makeOptions());
    expect(result.type).toBe('confirm');
    expect(mockNote).toHaveBeenCalled();
  });

  // ── 正常情况：摘要包含所有关键信息 ──
  it('摘要包含项目名、AI 引擎、技术栈、测试策略等', async () => {
    await showPreview(makeOptions({
      projectName: 'MyApp',
      description: 'Awesome app',
      engines: ['github-copilot', 'crush'],
      language: 'csharp',
      deliveryType: 'WPF',
      dotnetVersion: 'net10',
      testStrategy: 'tdd',
      skills: ['code-review', 'refactor'],
    }));

    const callArg = mockNote.mock.calls[0]![0] as string;
    expect(callArg).toContain('MyApp');
    expect(callArg).toContain('Awesome app');
    expect(callArg).toContain('GitHub Copilot');
    expect(callArg).toContain('Crush');
    expect(callArg).toContain('C#');
    expect(callArg).toContain('WPF');
    expect(callArg).toContain('.NET 10');
    expect(callArg).toContain('TDD');
    expect(callArg).toContain('code-review');
    expect(callArg).toContain('refactor');
  });

  // ── 正常情况：.NET 8 版本显示 ──
  it('.NET 8 版本正确显示', async () => {
    await showPreview(makeOptions({
      language: 'csharp',
      deliveryType: 'MAUI',
      dotnetVersion: 'net8',
    }));

    const callArg = mockNote.mock.calls[0]![0] as string;
    expect(callArg).toContain('.NET 8');
  });

  // ── 正常情况：回退到步骤 1 ──
  it('用户选择修改项目信息 → 返回 back step=1', async () => {
    mockSelectResult = 'back-1';
    const result = await showPreview(makeOptions());
    expect(result.type).toBe('back');
    if (result.type === 'back') {
      expect(result.step).toBe(1);
    }
  });

  // ── 正常情况：回退到步骤 2 ──
  it('用户选择修改 AI 引擎 → 返回 back step=2', async () => {
    mockSelectResult = 'back-2';
    const result = await showPreview(makeOptions());
    if (result.type === 'back') {
      expect(result.step).toBe(2);
    }
  });

  // ── 正常情况：回退到步骤 3 ──
  it('用户选择修改技术栈 → 返回 back step=3', async () => {
    mockSelectResult = 'back-3';
    const result = await showPreview(makeOptions());
    if (result.type === 'back') {
      expect(result.step).toBe(3);
    }
  });

  // ── 正常情况：回退到步骤 4 ──
  it('用户选择修改工作流 → 返回 back step=4', async () => {
    mockSelectResult = 'back-4';
    const result = await showPreview(makeOptions());
    if (result.type === 'back') {
      expect(result.step).toBe(4);
    }
  });

  // ── 边界情况：无描述 ──
  it('无项目描述时不显示描述行', async () => {
    await showPreview(makeOptions({ description: '' }));

    const callArg = mockNote.mock.calls[0]![0] as string;
    expect(callArg).not.toContain('📝');
  });

  // ── 边界情况：无技能 ──
  it('无技能时显示未选择', async () => {
    await showPreview(makeOptions({ skills: [] }));

    const callArg = mockNote.mock.calls[0]![0] as string;
    expect(callArg).toContain('(未选择)');
  });

  // ── 边界情况：无 .NET 版本 ──
  it('非 C#/F# 项目不显示 .NET 版本', async () => {
    await showPreview(makeOptions({ language: 'rust', deliveryType: 'CLI' }));

    const callArg = mockNote.mock.calls[0]![0] as string;
    expect(callArg).not.toContain('.NET');
  });

  // ── 边界情况：无测试 ──
  it('无测试策略显示正确标签', async () => {
    await showPreview(makeOptions({ testStrategy: 'none' }));

    const callArg = mockNote.mock.calls[0]![0] as string;
    expect(callArg).toContain('无测试');
  });

  // ── 边界情况：git permission 为 allow ──
  it('Git 权限为允许时显示正确标签', async () => {
    await showPreview(makeOptions({ gitPermission: 'allow' }));

    const callArg = mockNote.mock.calls[0]![0] as string;
    expect(callArg).toContain('允许提交');
  });
});
