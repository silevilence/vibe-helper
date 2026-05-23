/**
 * 全局配置默认值字典
 *
 * 确立所有配置项的标准默认值，确保任何缺失项自动回退至此。
 * 后续新增配置项时，只需在此文件中添加默认值即可。
 */
import type { VibeHelperConfig } from '../types.js';

/**
 * 全局默认配置
 *
 * 当用户本地无配置文件或配置项缺失时，所有值回退至此。
 * 该对象应始终保持与 VibeHelperConfig 接口同步。
 */
export const DEFAULT_CONFIG: Readonly<VibeHelperConfig> = Object.freeze({
  /** 配置版本号 */
  version: '0.1.0',

  /** Init 工具执行策略 */
  initStrategy: {
    /** 覆盖前二次确认拦截（默认：开启） */
    copilotConfirmOverwrite: true,
    /** 覆盖前二次确认拦截（默认：开启） */
    roadmapConfirmOverwrite: true,
    /** 静默替换 / 覆盖前二次确认 / 结构合并前二次确认（默认：结构合并前二次确认） */
    crushOverwriteMode: 'merge-confirm',
  },

  /** LLM 引擎网关配置（预留扩展） */
  llm: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4',
  },
});

/**
 * 获取 Init 工具执行策略的默认值（便捷访问）
 */
export function getDefaultInitStrategy() {
  return { ...DEFAULT_CONFIG.initStrategy };
}
