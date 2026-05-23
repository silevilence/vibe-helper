/**
 * vibe-helper 共享类型定义
 *
 * 定义整个 CLI 工具中使用的核心类型，确保配置对象在传递给 generator 时类型安全。
 */

/** 开发语言选项 */
export type Language = 'csharp' | 'fsharp' | 'typescript' | 'rust' | 'cpp' | 'python';

/** 语言对应的交付类型映射 */
export const LanguageDeliveryMap: Record<Language, string[]> = {
  csharp: ['WinForm', 'WPF', 'MAUI', 'Console', 'ASP.NET Web API'],
  fsharp: ['Console', 'ASP.NET Web API', 'Fable'],
  typescript: ['全栈应用', 'CLI', 'NPM 包'],
  rust: ['CLI', 'WASM', '嵌入式'],
  cpp: ['CLI', 'GUI (Qt)', '嵌入式'],
  python: ['CLI', 'FastAPI', 'Flask', 'Django', '脚本/自动化'],
};

/** TypeScript 全栈应用 — 目标运行容器 */
export type WebContainer = 'browser' | 'electron' | 'tauri';

/** TypeScript 全栈应用 — 前端视图层框架 */
export type FrontendFramework = 'react' | 'vue';

/** TypeScript 全栈应用 — 后端服务层框架 */
export type BackendFramework = 'express';

/** C# / F# 的 .NET 运行时版本 */
export type DotNetVersion = 'net8' | 'net10';

/** Python 依赖管理工具 */
export type PythonDepManager = 'uv' | 'pip' | 'conda';

/** AI Agent 引擎 */
export type AiEngine = 'github-copilot' | 'crush';

/** 测试策略 */
export type TestStrategy = 'tdd' | 'coverage' | 'none';

/** 文档更新权限 */
export type DocPermission = 'deny' | 'allow';

/** Git 提交权限 */
export type GitPermission = 'manual-only' | 'allow';

/** 用户通过 TUI 收集的全部配置 */
export interface InitOptions {
  /** 项目名称 */
  projectName: string;
  /** 项目描述（可留空） */
  description: string;
  /** 选中的 AI Agent 引擎 */
  engines: AiEngine[];
  /** 开发语言 */
  language: Language;
  /** 交付类型（根据语言级联选择） */
  deliveryType: string;
  /** .NET 版本（仅 C#/F# 时选择） */
  dotnetVersion?: DotNetVersion;
  /** Python 依赖管理工具（仅 Python 时选择） */
  pythonDepManager?: PythonDepManager;
  /** 全栈应用 — 目标运行容器（仅 TypeScript "全栈应用" 时选择） */
  webContainer?: WebContainer;
  /** 全栈应用 — 前端视图层框架（仅 TypeScript "全栈应用" 时选择） */
  frontendFramework?: FrontendFramework;
  /** 全栈应用 — 后端服务层框架（仅 TypeScript "全栈应用" 时选择） */
  backendFramework?: BackendFramework;
  /** 测试策略 */
  testStrategy: TestStrategy;
  /** 文档更新权限 */
  docPermission: DocPermission;
  /** Git 提交权限 */
  gitPermission: GitPermission;
  /** 选中的技能列表 */
  skills: string[];
}

/** 命令注册接口 — 每个子命令实现此接口 */
export interface CommandModule {
  /** 命令名称（如 "init"） */
  name: string;
  /** 命令描述 */
  description: string;
  /** 注册到 commander 实例 */
  register: (program: import('commander').Command) => void;
}

/** 工具菜单项 */
export interface ToolMenuItem {
  /** 工具标识 */
  value: string;
  /** 显示标签 */
  label: string;
  /** 辅助说明 */
  hint?: string;
}

/** 步骤结果：next 表示继续下一步，back 表示返回上一步 */
export type StepResult<T> =
  | { type: 'next'; data: T }
  | { type: 'back' };
