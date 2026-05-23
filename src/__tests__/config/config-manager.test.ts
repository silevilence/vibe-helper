/**
 * config-manager.ts 单元测试
 *
 * 覆盖：getConfig 自动加载、updateConfig/saveConfig 持久化、
 *       resetConfig 重置、reloadConfig 重载、深度合并逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VibeHelperConfig, InitStrategyConfig } from '../../core/types.js';
import { DEFAULT_CONFIG } from '../../core/config/config-defaults.js';

// ── Mock fs-extra ──
const { mockPathExists, mockOutputFile } = vi.hoisted(() => ({
  mockPathExists: vi.fn(),
  mockOutputFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs-extra', () => ({
  pathExists: mockPathExists,
  outputFile: mockOutputFile,
}));

// ── Mock fs/promises ──
const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn().mockResolvedValue('{}'),
}));

vi.mock('fs/promises', () => ({
  readFile: mockReadFile,
}));

// ── Mock os.homedir ──
vi.mock('os', () => ({
  homedir: () => '/mock/home',
}));

// 动态导入被测模块（必须在 mock 之后）
const {
  getConfig,
  getInitStrategy,
  updateConfig,
  updateInitStrategy,
  saveConfig,
  resetConfig,
  reloadConfig,
  getConfigFilePath,
  __internalReset,
} = await import('../../core/config/config-manager.js');

describe('config-manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 每个测试前重置模块内部状态，确保隔离
    __internalReset();
  });

  afterEach(async () => {
    // 确保后续测试不受影响
    __internalReset();
  });

  describe('getConfigFilePath', () => {
    it('返回 ~/.vibe-helper/config.json', () => {
      expect(getConfigFilePath().replace(/\\/g, '/')).toBe('/mock/home/.vibe-helper/config.json');
    });
  });

  describe('getConfig — 首次加载', () => {
    it('配置文件不存在时返回默认配置', async () => {
      mockPathExists.mockResolvedValue(false);

      const config = await getConfig();

      expect(config.version).toBe(DEFAULT_CONFIG.version);
      expect(config.initStrategy.copilotConfirmOverwrite).toBe(true);
      expect(config.initStrategy.crushOverwriteMode).toBe('merge-confirm');
    });

    it('配置文件存在时读取并合并默认值', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({
        version: '0.2.0',
        initStrategy: {
          copilotConfirmOverwrite: false,
        },
      }));

      const config = await getConfig();

      expect(config.version).toBe('0.2.0');
      expect(config.initStrategy.copilotConfirmOverwrite).toBe(false);
      // 未定义的字段回退默认值
      expect(config.initStrategy.roadmapConfirmOverwrite).toBe(true);
      expect(config.initStrategy.crushOverwriteMode).toBe('merge-confirm');
      expect(config.llm.provider).toBe('openai');
    });

    it('配置文件损坏时回退默认值', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockRejectedValue(new Error('disk read error'));

      const config = await getConfig();

      expect(config.version).toBe(DEFAULT_CONFIG.version);
      expect(config.initStrategy).toEqual(DEFAULT_CONFIG.initStrategy);
    });

    it('多次调用 getConfig 返回同一缓存实例', async () => {
      mockPathExists.mockResolvedValue(false);

      const config1 = await getConfig();
      const config2 = await getConfig();

      expect(config1).toBe(config2);
    });
  });

  describe('getInitStrategy', () => {
    it('返回 initStrategy 配置', async () => {
      mockPathExists.mockResolvedValue(false);

      const strategy = await getInitStrategy();

      expect(strategy.copilotConfirmOverwrite).toBe(true);
      expect(strategy.roadmapConfirmOverwrite).toBe(true);
      expect(strategy.crushOverwriteMode).toBe('merge-confirm');
    });
  });

  describe('updateConfig', () => {
    it('部分更新配置字段', async () => {
      mockPathExists.mockResolvedValue(false);
      await getConfig(); // 确保已加载

      updateConfig({
        version: '0.3.0',
        initStrategy: {
          copilotConfirmOverwrite: false,
          roadmapConfirmOverwrite: false,
          crushOverwriteMode: 'replace',
        },
      });

      const config = await getConfig();
      expect(config.version).toBe('0.3.0');
      expect(config.initStrategy.copilotConfirmOverwrite).toBe(false);
      expect(config.initStrategy.crushOverwriteMode).toBe('replace');
      // 未修改的字段保持原值
      expect(config.llm.provider).toBe('openai');
    });

    it('未加载时调用 updateConfig 抛出异常', () => {
      expect(() => updateConfig({ version: 'x' })).toThrow('配置尚未加载');
    });
  });

  describe('updateInitStrategy', () => {
    it('便捷更新 Init 策略', async () => {
      mockPathExists.mockResolvedValue(false);
      await getConfig();

      updateInitStrategy({
        copilotConfirmOverwrite: false,
      });

      const config = await getConfig();
      expect(config.initStrategy.copilotConfirmOverwrite).toBe(false);
      expect(config.initStrategy.roadmapConfirmOverwrite).toBe(true); // 未改
    });

    it('未加载时抛出异常', () => {
      expect(() => updateInitStrategy({ copilotConfirmOverwrite: false })).toThrow('配置尚未加载');
    });
  });

  describe('saveConfig', () => {
    it('有变更时写入磁盘', async () => {
      mockPathExists.mockResolvedValue(false);
      await getConfig();

      updateInitStrategy({ copilotConfirmOverwrite: false });
      await saveConfig();

      expect(mockOutputFile).toHaveBeenCalledTimes(1);
      const callArgs = mockOutputFile.mock.calls[0]!;
      expect(String(callArgs[0]).replace(/\\/g, '/')).toBe('/mock/home/.vibe-helper/config.json');
      // 验证写入的是有效 JSON
      const written = JSON.parse(callArgs[1] as string) as VibeHelperConfig;
      expect(written.initStrategy.copilotConfirmOverwrite).toBe(false);
    });

    it('无变更时跳过写入', async () => {
      mockPathExists.mockResolvedValue(false);
      await getConfig();

      // 没有做任何修改
      await saveConfig();

      expect(mockOutputFile).not.toHaveBeenCalled();
    });
  });

  describe('resetConfig', () => {
    it('重置为默认值并持久化', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({
        version: '0.5.0',
        initStrategy: { copilotConfirmOverwrite: false, roadmapConfirmOverwrite: false, crushOverwriteMode: 'replace' },
      }));
      await getConfig();

      // 确认已加载非默认值
      let config = await getConfig();
      expect(config.initStrategy.copilotConfirmOverwrite).toBe(false);

      await resetConfig();

      config = await getConfig();
      expect(config.initStrategy.copilotConfirmOverwrite).toBe(true);
      expect(config.initStrategy.crushOverwriteMode).toBe('merge-confirm');
      expect(mockOutputFile).toHaveBeenCalled();
    });
  });

  describe('reloadConfig', () => {
    it('强制重新从磁盘加载', async () => {
      // 首次加载返回默认值
      mockPathExists.mockResolvedValue(false);
      let config = await getConfig();
      expect(config.version).toBe('0.1.0');

      // 模拟磁盘文件变为新值
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({ version: '0.9.0' }));

      config = await reloadConfig();
      expect(config.version).toBe('0.9.0');
    });
  });

  describe('深度合并逻辑', () => {
    it('嵌套对象正确合并', async () => {
      mockPathExists.mockResolvedValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify({
        initStrategy: {
          copilotConfirmOverwrite: false,
          // roadmapConfirmOverwrite 和 crushOverwriteMode 未定义
        },
        llm: {
          provider: 'gemini',
          // baseUrl 和 modelId 未定义
        },
      }));

      await reloadConfig();
      const config = await getConfig();

      // 文件中的值保留
      expect(config.initStrategy.copilotConfirmOverwrite).toBe(false);
      // 缺失的嵌套字段回退默认值
      expect(config.initStrategy.roadmapConfirmOverwrite).toBe(true);
      expect(config.initStrategy.crushOverwriteMode).toBe('merge-confirm');
      expect(config.llm.provider).toBe('gemini');
      expect(config.llm.baseUrl).toBe('https://api.openai.com/v1');
    });
  });
});
