/**
 * config-defaults.ts 单元测试
 *
 * 覆盖：DEFAULT_CONFIG 完整性、getDefaultInitStrategy 独立副本
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, getDefaultInitStrategy } from '../../core/config/config-defaults.js';

describe('DEFAULT_CONFIG', () => {
  it('包含 version 字段', () => {
    expect(DEFAULT_CONFIG.version).toBe('0.1.0');
  });

  it('initStrategy 各字段均有默认值', () => {
    const s = DEFAULT_CONFIG.initStrategy;
    expect(s.copilotConfirmOverwrite).toBe(true);
    expect(s.roadmapConfirmOverwrite).toBe(true);
    expect(s.crushOverwriteMode).toBe('merge-confirm');
  });

  it('llm 各字段均有默认值', () => {
    const l = DEFAULT_CONFIG.llm;
    expect(l.provider).toBe('openai');
    expect(l.baseUrl).toBe('https://api.openai.com/v1');
    expect(l.modelId).toBe('gpt-4');
  });

  it('DEFAULT_CONFIG 应被冻结（不可修改）', () => {
    expect(Object.isFrozen(DEFAULT_CONFIG)).toBe(true);
  });
});

describe('getDefaultInitStrategy', () => {
  it('返回与 DEFAULT_CONFIG.initStrategy 内容相同的副本', () => {
    const copy = getDefaultInitStrategy();
    expect(copy).toEqual(DEFAULT_CONFIG.initStrategy);
  });

  it('返回的是独立副本，修改不影响原默认值', () => {
    const copy = getDefaultInitStrategy();
    copy.copilotConfirmOverwrite = false;
    expect(DEFAULT_CONFIG.initStrategy.copilotConfirmOverwrite).toBe(true);
  });
});
