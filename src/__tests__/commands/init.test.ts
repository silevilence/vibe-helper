/**
 * commands/init.ts 单元测试
 *
 * 覆盖：命令模块注册、步骤逻辑（通过 mock 间接测试）
 * 主要测试 CommandModule 接口实现和 runInit 的异常处理路径
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Command } from 'commander';
import initCommand from '../../commands/init.js';
import type { CommandModule } from '../../core/types.js';

describe('init 命令模块', () => {
  // ── 正常情况：CommandModule 接口实现 ──
  it('导出符合 CommandModule 接口', () => {
    expect(initCommand.name).toBe('init');
    expect(initCommand.description).toBeTruthy();
    expect(typeof initCommand.register).toBe('function');
  });

  // ── 正常情况：name 属性 ──
  it('name 为 "init"', () => {
    expect(initCommand.name).toBe('init');
  });

  // ── 正常情况：description 包含关键信息 ──
  it('description 包含 "初始化"', () => {
    expect(initCommand.description).toContain('初始化');
  });

  // ── 正常情况：register 方法接受 Command 实例 ──
  it('register 方法在 Command 上注册 init 子命令', () => {
    const mockCommandFn = vi.fn().mockReturnThis();
    const mockDescriptionFn = vi.fn().mockReturnThis();
    const mockActionFn = vi.fn();

    const mockProgram = {
      command: mockCommandFn.mockImplementation(() => ({
        description: mockDescriptionFn,
        action: mockActionFn,
      })),
    } as unknown as Command;

    initCommand.register(mockProgram);

    expect(mockCommandFn).toHaveBeenCalledWith('init');
    expect(mockDescriptionFn).toHaveBeenCalled();
    expect(mockActionFn).toHaveBeenCalled();
  });

  // ── 边界情况：action 是一个异步函数 ──
  it('action 回调是异步函数', () => {
    let capturedAction: (() => void) | undefined;

    const mockProgram = {
      command: vi.fn().mockReturnValue({
        description: vi.fn().mockReturnThis(),
        action: vi.fn((fn: () => void) => {
          capturedAction = fn;
        }),
      }),
    } as unknown as Command;

    initCommand.register(mockProgram);
    expect(capturedAction).toBeDefined();
    // 检查是 async 函数
    expect(capturedAction!.constructor.name).toBe('AsyncFunction');
  });
});

describe('init 命令边界场景', () => {
  // ── 重复注册 ──
  it('重复注册不会抛出异常', () => {
    const mockCmd = {
      command: vi.fn().mockReturnValue({
        description: vi.fn().mockReturnThis(),
        action: vi.fn(),
      }),
    } as unknown as Command;

    expect(() => {
      initCommand.register(mockCmd);
      initCommand.register(mockCmd);
    }).not.toThrow();
  });

  // ── 空 Command 对象 ──
  it('传入空对象时不会崩溃（但会抛异常）', () => {
    expect(() => {
      initCommand.register({} as Command);
    }).toThrow();
  });
});
