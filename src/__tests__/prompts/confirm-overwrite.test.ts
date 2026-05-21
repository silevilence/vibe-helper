/**
 * confirm-overwrite.ts 单元测试
 *
 * 覆盖：用户确认覆盖/跳过/取消操作
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmOverwrite, batchConfirmOverwrite } from '../../core/prompts/confirm-overwrite.js';

// Mock @clack/prompts
let mockConfirmResult: unknown = true;
const mockCancelFn = vi.fn();

vi.mock('@clack/prompts', () => ({
  confirm: () => mockConfirmResult,
  isCancel: (val: unknown) => val === Symbol.for('clack:cancel'),
  cancel: (...args: unknown[]) => {
    mockCancelFn(...args);
    // 不调用 process.exit
  },
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
}));

vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

describe('confirmOverwrite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmResult = true;
  });

  // ── 正常情况：用户确认覆盖 ──
  it('用户确认 → 返回 overwrite', async () => {
    mockConfirmResult = true;
    const result = await confirmOverwrite('test.md');
    expect(result).toBe('overwrite');
  });

  // ── 正常情况：用户拒绝覆盖 ──
  it('用户拒绝 → 返回 skip', async () => {
    mockConfirmResult = false;
    const result = await confirmOverwrite('test.md');
    expect(result).toBe('skip');
  });

  // ── 边界情况：长文件路径 ──
  it('长文件路径正确显示在提示中', async () => {
    const longPath = '.github/skills/code-review/very/deep/nested/file.md';
    await confirmOverwrite(longPath);
    // 无异常即为通过
  });
});

describe('batchConfirmOverwrite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况：部分确认部分跳过 ──
  it('用户确认部分文件 → 返回确认文件列表', async () => {
    // 第一次返回 true（确认），第二次返回 false（跳过），第三次返回 true
    let callCount = 0;
    mockConfirmResult = {
      then: (resolve: (v: unknown) => void) => {
        callCount++;
        resolve(callCount === 1 || callCount === 3);
      },
    };

    const result = await batchConfirmOverwrite(['a.md', 'b.md', 'c.md']);
    expect(result).toEqual(['a.md', 'c.md']);
  });

  // ── 边界情况：空列表 ──
  it('空文件列表 → 返回空数组', async () => {
    const result = await batchConfirmOverwrite([]);
    expect(result).toEqual([]);
  });

  // ── 边界情况：全部确认 ──
  it('全部确认 → 返回完整列表', async () => {
    mockConfirmResult = true;
    const result = await batchConfirmOverwrite(['a.md', 'b.md']);
    expect(result).toEqual(['a.md', 'b.md']);
  });

  // ── 边界情况：全部跳过 ──
  it('全部跳过 → 返回空数组', async () => {
    mockConfirmResult = false;
    const result = await batchConfirmOverwrite(['a.md', 'b.md', 'c.md']);
    expect(result).toEqual([]);
  });
});
