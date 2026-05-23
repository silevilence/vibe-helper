/**
 * types.ts 运行时值单元测试
 *
 * 验证类型映射、菜单项结构等运行时行为
 */
import { describe, it, expect } from 'vitest';
import { LanguageDeliveryMap } from '../core/types.js';
import type { Language, ToolMenuItem, StepResult, CommandModule } from '../../core/types.js';

describe('LanguageDeliveryMap', () => {
  // ── 正常情况：每种语言都有对应的交付类型列表 ──
  it('所有语言都有对应的交付类型', () => {
    const languages: Language[] = ['csharp', 'fsharp', 'typescript', 'rust', 'cpp', 'python'];
    for (const lang of languages) {
      const deliveries = LanguageDeliveryMap[lang];
      expect(deliveries).toBeDefined();
      expect(Array.isArray(deliveries)).toBe(true);
      expect(deliveries.length).toBeGreaterThan(0);
    }
  });

  // ── 正常情况：特定语言的具体类型 ──
  it('C# 包含 WinForm、WPF、MAUI、Console、ASP.NET Web API', () => {
    expect(LanguageDeliveryMap.csharp).toContain('WinForm');
    expect(LanguageDeliveryMap.csharp).toContain('WPF');
    expect(LanguageDeliveryMap.csharp).toContain('MAUI');
    expect(LanguageDeliveryMap.csharp).toContain('Console');
    expect(LanguageDeliveryMap.csharp).toContain('ASP.NET Web API');
    expect(LanguageDeliveryMap.csharp).toHaveLength(5);
  });

  it('TypeScript 包含全栈应用、CLI、NPM 包', () => {
    expect(LanguageDeliveryMap.typescript).toContain('全栈应用');
    expect(LanguageDeliveryMap.typescript).toContain('CLI');
    expect(LanguageDeliveryMap.typescript).toContain('NPM 包');
    expect(LanguageDeliveryMap.typescript).toHaveLength(3);
  });

  it('Rust 包含 CLI、WASM、嵌入式', () => {
    expect(LanguageDeliveryMap.rust).toContain('CLI');
    expect(LanguageDeliveryMap.rust).toContain('WASM');
    expect(LanguageDeliveryMap.rust).toContain('嵌入式');
  });

  it('F# 包含 Console、ASP.NET Web API、Fable', () => {
    expect(LanguageDeliveryMap.fsharp).toContain('Console');
    expect(LanguageDeliveryMap.fsharp).toContain('ASP.NET Web API');
    expect(LanguageDeliveryMap.fsharp).toContain('Fable');
  });

  it('C++ 包含 CLI、GUI (Qt)、嵌入式', () => {
    expect(LanguageDeliveryMap.cpp).toContain('CLI');
    expect(LanguageDeliveryMap.cpp).toContain('GUI (Qt)');
    expect(LanguageDeliveryMap.cpp).toContain('嵌入式');
  });

  it('Python 包含 CLI、FastAPI、Flask、Django、脚本/自动化', () => {
    expect(LanguageDeliveryMap.python).toContain('CLI');
    expect(LanguageDeliveryMap.python).toContain('FastAPI');
    expect(LanguageDeliveryMap.python).toContain('Flask');
    expect(LanguageDeliveryMap.python).toContain('Django');
    expect(LanguageDeliveryMap.python).toContain('脚本/自动化');
    expect(LanguageDeliveryMap.python).toHaveLength(5);
  });

  // ── 边界情况：语言映射只读性 ──
  it('LanguageDeliveryMap 键仅包含已定义的语言', () => {
    const keys = Object.keys(LanguageDeliveryMap);
    expect(keys).toHaveLength(6);
    expect(keys).toEqual(['csharp', 'fsharp', 'typescript', 'rust', 'cpp', 'python']);
  });

  // ── 边界情况：每种语言的交付类型无重复 ──
  it('每种语言内部的交付类型无重复', () => {
    for (const [, deliveries] of Object.entries(LanguageDeliveryMap)) {
      const unique = new Set(deliveries);
      expect(unique.size).toBe(deliveries.length);
    }
  });
});

describe('ToolMenuItem 类型构造', () => {
  it('ToolMenuItem 对象符合接口定义', () => {
    const item: ToolMenuItem = {
      value: 'init',
      label: '项目初始化',
      hint: '生成 AI Agent 配置',
    };
    expect(item.value).toBe('init');
    expect(item.label).toBe('项目初始化');
    expect(item.hint).toBe('生成 AI Agent 配置');
  });

  it('hint 为可选字段', () => {
    const item: ToolMenuItem = {
      value: 'test',
      label: '测试工具',
    };
    expect(item.hint).toBeUndefined();
  });
});

describe('StepResult 类型构造', () => {
  it('next 类型包含 data 字段', () => {
    const result: StepResult<string> = { type: 'next', data: 'hello' };
    expect(result.type).toBe('next');
    expect(result.data).toBe('hello');
  });

  it('back 类型不包含 data 字段', () => {
    const result: StepResult<number> = { type: 'back' };
    expect(result.type).toBe('back');
    expect('data' in result).toBe(false);
  });
});

describe('CommandModule 类型构造', () => {
  it('CommandModule 对象符合接口定义', () => {
    const mod: CommandModule = {
      name: 'test-cmd',
      description: 'A test command',
      register: () => {},
    };
    expect(mod.name).toBe('test-cmd');
    expect(mod.description).toBe('A test command');
    expect(typeof mod.register).toBe('function');
  });
});
