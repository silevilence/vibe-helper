/**
 * template-loader.ts 单元测试
 *
 * 覆盖：模板读取、占位符替换、内容拼接
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import type { InitOptions } from '../../core/types.js';
import {
  buildCopilotInstructions,
  buildCrushJson,
  getRoadmapTemplatePath,
  getSkillsResPath,
} from '../../core/generator/template-loader.js';

// Mock fs/promises readFile
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

const mockReadFile = vi.mocked(readFile);

/** 平台无关的路径匹配辅助函数 */
function pathHas(filePath: unknown, segment: string): boolean {
  return String(filePath).replace(/\\/g, '/').includes(segment);
}

// 测试用的 res base path
const RES_BASE = '/fake/res/tools/init';

// 构建基础 InitOptions
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

describe('buildCopilotInstructions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况：TypeScript CLI 项目 ──
  it('生成 TypeScript CLI 项目的完整配置', async () => {
    // 模拟所有模板文件读取
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.includes('directory-structure-typescript.md')) {
        return Promise.resolve('├── src/\n│   └── index.ts\n');
      }
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('# {{PROJECT_NAME}}\n> {{PROJECT_DESCRIPTION}}\n- {{RUNTIME_ENV}}\n- {{LANGUAGE}}\n{{LANGUAGE_SPECIFIC}}\n```text\n{{DIRECTORY_STRUCTURE}}\n```\n\n{{CODING_STANDARDS}}\n\n{{DOC_PERMISSION_RULES}}\n\n{{GIT_PERMISSION_RULES}}\n\n{{TESTING_REQUIREMENTS}}');
      }
      if (p.includes('languages/typescript.md')) {
        return Promise.resolve('## TypeScript 编码规范\n交付类型: {{DELIVERY_TYPE}}\n{{DELIVERY_EXTRA}}');
      }
      if (p.includes('testing-coverage.md')) {
        return Promise.resolve('## 测试要求：测试覆盖');
      }
      if (p.includes('doc-permission-deny.md')) {
        return Promise.resolve('- 禁止自动更新文档');
      }
      if (p.includes('git-permission-manual.md')) {
        return Promise.resolve('- 仅限手动 Git 操作');
      }
      return Promise.resolve('');
    });

    const options = makeOptions();
    const result = await buildCopilotInstructions(options, RES_BASE);

    expect(result).toContain('test-project');
    expect(result).toContain('A test project');
    expect(result).toContain('Node.js');
    expect(result).toContain('TypeScript');
    expect(result).toContain('CLI');
    expect(result).toContain('禁止自动更新文档');
    expect(result).toContain('仅限手动 Git 操作');
    expect(result).toContain('测试覆盖');
  });

  // ── 正常情况：C# WPF 项目（含 .NET 版本） ──
  it('生成 C# WPF 项目的完整配置（含 .NET 版本）', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.includes('directory-structure-csharp.md')) {
        return Promise.resolve('├── {{PROJECT_NAME}}.csproj\n');
      }
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('# {{PROJECT_NAME}}\n{{LANGUAGE}}\n{{LANGUAGE_SPECIFIC}}\n{{RUNTIME_ENV}}\n{{TESTING_REQUIREMENTS}}\n{{DOC_PERMISSION_RULES}}\n{{GIT_PERMISSION_RULES}}');
      }
      if (p.includes('languages/csharp.md')) {
        return Promise.resolve('C# 编码规范');
      }
      if (p.includes('testing-tdd.md')) {
        return Promise.resolve('TDD 测试要求');
      }
      if (p.includes('doc-permission-allow.md')) {
        return Promise.resolve('允许更新文档');
      }
      if (p.includes('git-permission-allow.md')) {
        return Promise.resolve('允许 Git 操作');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({
      language: 'csharp',
      deliveryType: 'WPF',
      dotnetVersion: 'net8',
      testStrategy: 'tdd',
      docPermission: 'allow',
      gitPermission: 'allow',
    });
    const result = await buildCopilotInstructions(options, RES_BASE);

    expect(result).toContain('.NET 8 (LTS)');
    expect(result).toContain('C#');
    expect(result).toContain('TDD 测试要求');
    expect(result).toContain('允许更新文档');
    expect(result).toContain('允许 Git 操作');
  });

  // ── 边界情况：无 description ──
  it('项目描述为空时使用默认描述', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('# {{PROJECT_NAME}}\n> {{PROJECT_DESCRIPTION}}\n');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({ description: '' });
    const result = await buildCopilotInstructions(options, RES_BASE);
    expect(result).toContain('优秀的软件项目');
  });

  // ── 边界情况：Electron 交付类型带额外注释 ──
  it('TypeScript Electron 项目包含额外注意提示', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.includes('directory-structure-typescript.md')) {
        return Promise.resolve('dir');
      }
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{CODING_STANDARDS}}');
      }
      if (p.includes('languages/typescript.md')) {
        return Promise.resolve('{{DELIVERY_TYPE}} {{DELIVERY_EXTRA}}');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({ deliveryType: 'Electron' });
    const result = await buildCopilotInstructions(options, RES_BASE);
    expect(result).toContain('Electron 主进程与渲染进程');
    expect(result).toContain('IPC 通信');
  });

  // ── 边界情况：语言特定目录结构不存在时回退到通用模板 ──
  it('语言特定目录结构模板不存在时回退到通用模板', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.includes('directory-structure-rust.md')) {
        return Promise.resolve('');
      }
      if (p.endsWith('directory-structure.md')) {
        return Promise.resolve('通用目录结构 {{PROJECT_NAME}}');
      }
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{DIRECTORY_STRUCTURE}}');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({ language: 'rust', deliveryType: 'CLI' });
    const result = await buildCopilotInstructions(options, RES_BASE);
    expect(result).toContain('通用目录结构');
    expect(result).toContain('test-project');
  });

  // ── 边界情况：F# 项目含 .NET 10 ──
  it('F# 项目选择 .NET 10', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{LANGUAGE_SPECIFIC}}\n{{RUNTIME_ENV}}');
      }
      if (p.includes('languages/fsharp.md')) {
        return Promise.resolve('F# 规范');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({
      language: 'fsharp',
      deliveryType: 'Console',
      dotnetVersion: 'net10',
    });
    const result = await buildCopilotInstructions(options, RES_BASE);
    expect(result).toContain('.NET 10');
  });

  // ── 边界情况：C++ 项目 ──
  it('C++ 项目无 .NET 版本信息', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{LANGUAGE_SPECIFIC}}');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({
      language: 'cpp',
      deliveryType: 'CLI',
      dotnetVersion: undefined,
    });
    const result = await buildCopilotInstructions(options, RES_BASE);
    // LANGUAGE_SPECIFIC 为空（无 dotnetVersion 时），trim 后为空
    expect(result.trim()).toBe('');
  });

  // ── 正常情况：Python CLI 项目（uv 依赖管理） ──
  it('生成 Python CLI 项目的完整配置（uv 依赖管理）', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.includes('directory-structure-python.md')) {
        return Promise.resolve('├── src/{{PROJECT_NAME}}/\n');
      }
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('# {{PROJECT_NAME}}\n{{LANGUAGE}}\n{{LANGUAGE_SPECIFIC}}\n{{RUNTIME_ENV}}\n{{CODING_STANDARDS}}\n{{TESTING_REQUIREMENTS}}');
      }
      if (p.includes('languages/python.md')) {
        return Promise.resolve('Python 编码规范\n{{DELIVERY_TYPE}}\n{{DEP_MANAGER_RULES}}');
      }
      if (p.includes('testing-coverage.md')) {
        return Promise.resolve('测试覆盖要求');
      }
      if (p.includes('python-dep-uv.md')) {
        return Promise.resolve('uv 工作流约束：使用 uv run');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({
      language: 'python',
      deliveryType: 'CLI',
      pythonDepManager: 'uv',
    });
    const result = await buildCopilotInstructions(options, RES_BASE);

    expect(result).toContain('Python');
    expect(result).toContain('uv');
    expect(result).toContain('依赖管理');
    expect(result).toContain('uv 工作流约束');
    expect(result).toContain('CLI');
    expect(result).toContain('测试覆盖要求');
  });

  // ── 正常情况：Python FastAPI 项目（pip 依赖管理） ──
  it('生成 Python FastAPI 项目的完整配置（pip 依赖管理）', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{LANGUAGE_SPECIFIC}}\n{{RUNTIME_ENV}}\n{{CODING_STANDARDS}}');
      }
      if (p.includes('languages/python.md')) {
        return Promise.resolve('{{DEP_MANAGER_RULES}}');
      }
      if (p.includes('python-dep-pip.md')) {
        return Promise.resolve('pip 工作流：使用 requirements.txt');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({
      language: 'python',
      deliveryType: 'FastAPI',
      pythonDepManager: 'pip',
    });
    const result = await buildCopilotInstructions(options, RES_BASE);

    expect(result).toContain('pip');
    expect(result).toContain('pip 工作流');
    expect(result).toContain('Python (>= 3.10)');
  });

  // ── 正常情况：Python Django 项目（conda 依赖管理） ──
  it('生成 Python Django 项目的完整配置（conda 依赖管理）', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{LANGUAGE_SPECIFIC}}\n{{CODING_STANDARDS}}');
      }
      if (p.includes('languages/python.md')) {
        return Promise.resolve('{{DEP_MANAGER_RULES}}');
      }
      if (p.includes('python-dep-conda.md')) {
        return Promise.resolve('conda 工作流：使用 environment.yml');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({
      language: 'python',
      deliveryType: 'Django',
      pythonDepManager: 'conda',
    });
    const result = await buildCopilotInstructions(options, RES_BASE);

    expect(result).toContain('conda');
    expect(result).toContain('conda 工作流');
    expect(result).toContain('environment.yml');
  });

  // ── 边界情况：Python 项目未选择依赖管理器 ──
  it('Python 项目未选择依赖管理器时无 DEP_MANAGER_RULES 内容', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{LANGUAGE_SPECIFIC}}\n{{CODING_STANDARDS}}');
      }
      if (p.includes('languages/python.md')) {
        return Promise.resolve('{{DEP_MANAGER_RULES}}');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({
      language: 'python',
      deliveryType: '脚本/自动化',
      pythonDepManager: undefined,
    });
    const result = await buildCopilotInstructions(options, RES_BASE);

    // LANGUAGE_SPECIFIC 为空（无 pythonDepManager）
    expect(result.trim()).toBe('');
  });

  // ── 边界情况：无测试策略 ──
  it('测试策略为 none 时正确读取模板', async () => {
    mockReadFile.mockImplementation((filePath: string | Buffer | URL) => {
      const p = String(filePath).replace(/\\/g, '/');
      if (p.endsWith('base/copilot-instructions.md')) {
        return Promise.resolve('{{TESTING_REQUIREMENTS}}');
      }
      if (p.includes('testing-none.md')) {
        return Promise.resolve('不要求自动化测试');
      }
      return Promise.resolve('');
    });

    const options = makeOptions({ testStrategy: 'none' });
    const result = await buildCopilotInstructions(options, RES_BASE);
    expect(result).toContain('不要求自动化测试');
  });
});

describe('buildCrushJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 正常情况 ──
  it('生成 crush.json 并替换占位符', async () => {
    mockReadFile.mockResolvedValue('{"name": "{{PROJECT_NAME}}", "desc": "{{PROJECT_DESCRIPTION}}"}' as never);

    const options = makeOptions();
    const result = await buildCrushJson(options, RES_BASE);

    expect(result).toContain('"test-project"');
    expect(result).toContain('"A test project"');
  });

  // ── 边界情况：描述为空 ──
  it('描述为空时替换为空字符串', async () => {
    mockReadFile.mockResolvedValue('{"desc": "{{PROJECT_DESCRIPTION}}"}' as never);

    const options = makeOptions({ description: '' });
    const result = await buildCrushJson(options, RES_BASE);

    expect(result).toContain('""');
  });
});

describe('getRoadmapTemplatePath', () => {
  it('返回正确的 ROADMAP.md 路径', () => {
    const result = getRoadmapTemplatePath('/base/path');
    // 使用 path 模块的规范化比较，兼容 Windows 反斜杠
    const normalized = result.replace(/\\/g, '/');
    expect(normalized).toBe('/base/path/ROADMAP.md');
  });

  it('处理带尾部斜杠的路径', () => {
    const result = getRoadmapTemplatePath('/base/path/');
    expect(result).toContain('ROADMAP.md');
  });
});

describe('getSkillsResPath', () => {
  it('返回正确的 skills 目录路径', () => {
    const result = getSkillsResPath('/base/path');
    const normalized = result.replace(/\\/g, '/');
    expect(normalized).toBe('/base/path/skills');
  });

  it('处理带尾部斜杠的路径', () => {
    const result = getSkillsResPath('/base/path/');
    expect(result).toContain('skills');
  });
});
