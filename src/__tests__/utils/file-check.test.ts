/**
 * file-check.ts 单元测试
 *
 * 覆盖：正常、异常、边界情况
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileExists, findExistingFiles, getResPath, resolvePath } from '../../core/utils/file-check.js';

// Mock fs-extra — 必须导出命名导出的 pathExists
// 使用 vi.hoisted 解决 vi.mock 的变量提升问题
const { mockPathExists } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
}));

vi.mock('fs-extra', () => ({
  pathExists: mockPathExists,
  default: { pathExists: mockPathExists },
}));

describe('fileExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况 ──
  it('文件存在时返回 true', async () => {
    mockPathExists.mockResolvedValue(true as never);
    const result = await fileExists('/test/file.txt');
    expect(result).toBe(true);
    expect(mockPathExists).toHaveBeenCalledWith('/test/file.txt');
  });

  it('文件不存在时返回 false', async () => {
    mockPathExists.mockResolvedValue(false as never);
    const result = await fileExists('/nonexistent/file.txt');
    expect(result).toBe(false);
  });

  // ── 边界情况 ──
  it('空字符串路径', async () => {
    mockPathExists.mockResolvedValue(false as never);
    const result = await fileExists('');
    expect(result).toBe(false);
  });

  it('根目录路径', async () => {
    mockPathExists.mockResolvedValue(true as never);
    const result = await fileExists('/');
    expect(result).toBe(true);
  });

  it('含特殊字符的路径', async () => {
    mockPathExists.mockResolvedValue(true as never);
    const result = await fileExists('/path/to/my file (copy).txt');
    expect(result).toBe(true);
    expect(mockPathExists).toHaveBeenCalledWith('/path/to/my file (copy).txt');
  });
});

describe('findExistingFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况 ──
  it('返回存在的文件列表（部分存在）', async () => {
    mockPathExists.mockImplementation((p: string) => {
      return Promise.resolve(p.includes('exists') || p.includes('README')) as never;
    });

    const targets = ['README.md', 'package.json', 'nonexistent.md', 'src/exists.ts'];
    const result = await findExistingFiles('/project', targets);

    expect(result).toContain('README.md');
    expect(result).not.toContain('package.json');
    expect(result).not.toContain('nonexistent.md');
    expect(result).toContain('src/exists.ts');
    expect(result).toHaveLength(2);
  });

  it('全部文件不存在时返回空列表', async () => {
    mockPathExists.mockResolvedValue(false as never);
    const result = await findExistingFiles('/project', ['a.md', 'b.md', 'c.md']);
    expect(result).toEqual([]);
  });

  it('全部文件都存在时返回完整列表', async () => {
    mockPathExists.mockResolvedValue(true as never);
    const result = await findExistingFiles('/project', ['a.md', 'b.md', 'c.md']);
    expect(result).toEqual(['a.md', 'b.md', 'c.md']);
  });

  // ── 边界情况 ──
  it('空目标列表', async () => {
    const result = await findExistingFiles('/project', []);
    expect(result).toEqual([]);
    expect(mockPathExists).not.toHaveBeenCalled();
  });

  it('单个目标文件', async () => {
    mockPathExists.mockResolvedValue(true as never);
    const result = await findExistingFiles('/project', ['single.md']);
    expect(result).toEqual(['single.md']);
  });
});

describe('getResPath', () => {
  // ── 正常情况 ──
  it('无额外参数时返回 res 目录路径', () => {
    const result = getResPath();
    expect(result).toContain('res');
    expect(result.endsWith('res')).toBe(true);
  });

  it('带子目录参数时返回正确路径', () => {
    const result = getResPath('tools', 'init');
    expect(result).toContain('res');
    expect(result.endsWith('init')).toBe(true);
  });

  it('单个参数', () => {
    const result = getResPath('templates');
    expect(result).toContain('res');
    expect(result.endsWith('templates')).toBe(true);
  });
});

describe('resolvePath (re-export)', () => {
  it('是 path.resolve 的重新导出', () => {
    expect(resolvePath).toBeDefined();
    const result = resolvePath('/foo', 'bar');
    expect(result).toContain('bar');
  });
});
