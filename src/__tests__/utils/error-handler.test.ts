/**
 * error-handler.ts 单元测试
 *
 * 覆盖：正常、异常、边界情况
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 由于 handleError 会调用 process.exit，我们需要 mock
const mockCancel = vi.fn();
const mockOutro = vi.fn();
const mockExit = vi.fn();

vi.mock('@clack/prompts', () => ({
  cancel: (...args: unknown[]) => mockCancel(...args),
  outro: (...args: unknown[]) => mockOutro(...args),
  spinner: vi.fn(),
  isCancel: vi.fn(),
  intro: vi.fn(),
  note: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
}));

// 防止 process.exit 真正退出
vi.spyOn(process, 'exit').mockImplementation(mockExit as never);

import { handleError, safeExecute, gracefulExit } from '../../core/utils/error-handler.js';

describe('handleError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况：带错误码的 Error ──
  it('EACCES 错误 → 显示权限不足提示', () => {
    const err = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('权限不足'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('ENOENT 错误 → 显示未找到文件提示', () => {
    const err = Object.assign(new Error('No such file'), { code: 'ENOENT' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('未找到指定文件'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('EEXIST 错误 → 显示文件已存在提示', () => {
    const err = Object.assign(new Error('File exists'), { code: 'EEXIST' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('目标文件已存在'),
    );
  });

  it('ENOSPC 错误 → 显示磁盘空间不足提示', () => {
    const err = Object.assign(new Error('No space'), { code: 'ENOSPC' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('磁盘空间不足'),
    );
  });

  it('EISDIR 错误 → 显示路径为目录提示', () => {
    const err = Object.assign(new Error('Is a directory'), { code: 'EISDIR' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('目录'),
    );
  });

  it('ENOTDIR 错误 → 显示路径为文件提示', () => {
    const err = Object.assign(new Error('Not a directory'), { code: 'ENOTDIR' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('文件'),
    );
  });

  it('EPERM 错误 → 显示操作被拒绝提示', () => {
    const err = Object.assign(new Error('Operation not permitted'), { code: 'EPERM' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('操作被系统拒绝'),
    );
  });

  // ── 边界情况：未知错误码 ──
  it('未知错误码 → 显示原始错误消息', () => {
    const err = Object.assign(new Error('Something strange happened'), { code: 'EUNKNOWN' });
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('Something strange happened'),
    );
  });

  // ── 边界情况：带上下文的错误 ──
  it('带 context 的错误 → 显示上下文前缀', () => {
    const err = Object.assign(new Error('Access denied'), { code: 'EACCES' });
    handleError(err, 'init');
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('[init]'),
    );
  });

  // ── 异常情况：普通 Error（无 code） ──
  it('普通 Error → 显示错误消息', () => {
    const err = new Error('普通错误信息');
    handleError(err);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('普通错误信息'),
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('非 Error 的字符串异常', () => {
    handleError('一段字符串错误');
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('一段字符串错误'),
    );
  });

  it('null 异常', () => {
    handleError(null);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('null'),
    );
  });

  it('undefined 异常', () => {
    handleError(undefined);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('undefined'),
    );
  });

  it('数字类型的异常', () => {
    handleError(404);
    expect(mockCancel).toHaveBeenCalledWith(
      expect.stringContaining('404'),
    );
  });
});

describe('safeExecute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况：成功执行 ──
  it('成功执行返回结果', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await safeExecute(fn, 'test-op');
    expect(result).toBe('success');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('没有上下文时也正常返回', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await safeExecute(fn);
    expect(result).toBe(42);
  });

  // ── 异常情况：执行失败时调用 handleError ──
  it('执行失败时调用 handleError', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('操作失败'));
    await safeExecute(fn, 'dangerous-op');
    expect(mockCancel).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe('gracefulExit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况 ──
  it('显示默认告别消息后退出', () => {
    gracefulExit();
    expect(mockOutro).toHaveBeenCalledWith(
      expect.stringContaining('感谢使用 vibe-helper'),
    );
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('显示自定义消息后退出', () => {
    gracefulExit('任务完成，再见！');
    expect(mockOutro).toHaveBeenCalledWith('任务完成，再见！');
    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
