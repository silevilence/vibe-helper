/**
 * 步骤 3: 配置工程技术栈（基于动态级联交互）
 *
 * - 选取开发语言（单选闭环：C# / F# / TypeScript / Rust / C++ / Python）
 * - 根据所选语言，级联触发交付类型选择
 * - 根据所选语言，条件触发运行时环境配置（仅 C#/F# 时，触发 .NET 版本选择）
 * - TypeScript "全栈应用" 触发动态级联子流程：容器 → 前端框架 → 后端框架
 * - 支持返回上一步及级联内部回退
 */
import { select, isCancel, cancel } from '@clack/prompts';
import {
  LanguageDeliveryMap,
  type Language,
  type DotNetVersion,
  type PythonDepManager,
  type WebContainer,
  type FrontendFramework,
  type BackendFramework,
  type StepResult,
} from '../types.js';

export interface TechStackInput {
  language: Language;
  deliveryType: string;
  dotnetVersion?: DotNetVersion;
  pythonDepManager?: PythonDepManager;
  webContainer?: WebContainer;
  frontendFramework?: FrontendFramework;
  backendFramework?: BackendFramework;
}

/** 返回上一步的标记值 */
const BACK_SENTINEL = '__back__' as const;

/** 语言选项标签映射 */
const LANGUAGE_LABELS: Record<Language, string> = {
  csharp: 'C#',
  fsharp: 'F#',
  typescript: 'TypeScript',
  rust: 'Rust',
  cpp: 'C++',
  python: 'Python',
};

/**
 * 收集技术栈配置（级联交互，支持回退）
 */
export async function collectTechStack(): Promise<StepResult<TechStackInput>> {
  // ── 3.1 选择开发语言（外层循环，支持从交付类型回退） ──
  let language: string | symbol;

  while (true) {
    language = await select({
      message: '请选择开发语言：',
      options: [
        ...(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(
          ([value, label]) => ({ value, label }),
        ),
        { value: BACK_SENTINEL, label: '← 返回上一步', hint: '回到 AI 引擎选择' },
      ],
    });

    if (isCancel(language)) {
      cancel('操作已取消');
      process.exit(0);
    }

    if (language === BACK_SENTINEL) {
      return { type: 'back' };
    }

    // ── 3.2 级联：根据语言选择交付类型（内层循环，支持回退到语言选择） ──
    const lang = language as Language;
    const deliveryOptions = LanguageDeliveryMap[lang].map((item) => ({
      value: item,
      label: item,
    }));

    const deliveryType = await select({
      message: `请选择 ${LANGUAGE_LABELS[lang]} 的交付类型：`,
      options: [
        ...deliveryOptions,
        { value: BACK_SENTINEL, label: '← 返回选择语言', hint: '重新选择开发语言' },
      ],
    });

    if (isCancel(deliveryType)) {
      cancel('操作已取消');
      process.exit(0);
    }

    if (deliveryType === BACK_SENTINEL) {
      continue; // 回到语言选择
    }

    // ── 3.2a 级联子流程：TypeScript "全栈应用" → 容器/前端/后端选型 ──
    let webContainer: WebContainer | undefined;
    let frontendFramework: FrontendFramework | undefined;
    let backendFramework: BackendFramework | undefined;

    if (lang === 'typescript' && deliveryType === '全栈应用') {
      // 内层循环：容器 → 前端 → 后端，支持逐级回退
      let fullstackStep = 1; // 1=容器, 2=前端, 3=后端

      while (fullstackStep <= 3) {
        if (fullstackStep === 1) {
          const container = await select({
            message: '请选择目标运行容器：',
            options: [
              { value: 'browser' as WebContainer, label: 'Web 浏览器端', hint: '纯前端 SPA，部署到静态服务器/CDN' },
              { value: 'electron' as WebContainer, label: 'Electron', hint: '跨平台桌面应用 (Chromium + Node.js)' },
              { value: 'tauri' as WebContainer, label: 'Tauri', hint: '轻量级桌面应用 (Rust 后端 + Web 前端)' },
              { value: BACK_SENTINEL, label: '← 返回选择交付类型', hint: '重新选择交付类型' },
            ],
          });

          if (isCancel(container)) {
            cancel('操作已取消');
            process.exit(0);
          }

          if (container === BACK_SENTINEL) {
            break; // 退出子循环，回到交付类型选择
          }

          webContainer = container as WebContainer;
          fullstackStep = 2;
        }

        if (fullstackStep === 2) {
          const frontend = await select({
            message: '请选择前端视图层技术栈：',
            options: [
              { value: 'react' as FrontendFramework, label: 'React', hint: '生态最丰富的 UI 库' },
              { value: 'vue' as FrontendFramework, label: 'Vue', hint: '渐进式 JavaScript 框架' },
              { value: BACK_SENTINEL, label: '← 返回选择运行容器', hint: '重新选择目标容器' },
            ],
          });

          if (isCancel(frontend)) {
            cancel('操作已取消');
            process.exit(0);
          }

          if (frontend === BACK_SENTINEL) {
            fullstackStep = 1;
            continue;
          }

          frontendFramework = frontend as FrontendFramework;
          fullstackStep = 3;
        }

        if (fullstackStep === 3) {
          const backend = await select({
            message: '请选择后端服务层技术栈：',
            options: [
              { value: 'express' as BackendFramework, label: 'Express', hint: '轻量级 Node.js Web 框架' },
              { value: BACK_SENTINEL, label: '← 返回选择前端框架', hint: '重新选择前端框架' },
            ],
          });

          if (isCancel(backend)) {
            cancel('操作已取消');
            process.exit(0);
          }

          if (backend === BACK_SENTINEL) {
            fullstackStep = 2;
            continue;
          }

          backendFramework = backend as BackendFramework;
          fullstackStep = 4; // 完成，退出子循环
        }
      }

      // 如果用户从子循环中回退到交付类型选择，重新开始外层循环
      if (fullstackStep <= 3) {
        continue;
      }
    }

    // ── 3.3 条件触发：仅 C#/F# 时选择 .NET 版本 ──
    let dotnetVersion: DotNetVersion | undefined;
    if (lang === 'csharp' || lang === 'fsharp') {
      const version = await select({
        message: '请选择 .NET 运行时版本：',
        options: [
          { value: 'net10' as DotNetVersion, label: '.NET 10 (最新)', hint: '推荐 — 最新版本' },
          { value: 'net8' as DotNetVersion, label: '.NET 8 (LTS)', hint: '长期支持版本' },
          { value: BACK_SENTINEL, label: '← 返回选择交付类型', hint: '重新选择交付类型' },
        ],
      });

      if (isCancel(version)) {
        cancel('操作已取消');
        process.exit(0);
      }

      if (version === BACK_SENTINEL) {
        continue; // 回到交付类型选择
      }

      dotnetVersion = version as DotNetVersion;
    }

    // ── 3.4 条件触发：仅 Python 时选择依赖管理工具 ──
    let pythonDepManager: PythonDepManager | undefined;
    if (lang === 'python') {
      const depManager = await select({
        message: '请选择 Python 依赖管理工具：',
        options: [
          { value: 'uv' as PythonDepManager, label: 'uv', hint: '推荐 — 极速包管理器 (Rust 实现)' },
          { value: 'pip' as PythonDepManager, label: 'pip', hint: 'Python 标准包管理器' },
          { value: 'conda' as PythonDepManager, label: 'conda', hint: '跨语言环境管理 (Anaconda/Miniforge)' },
          { value: BACK_SENTINEL, label: '← 返回选择交付类型', hint: '重新选择交付类型' },
        ],
      });

      if (isCancel(depManager)) {
        cancel('操作已取消');
        process.exit(0);
      }

      if (depManager === BACK_SENTINEL) {
        continue; // 回到交付类型选择
      }

      pythonDepManager = depManager as PythonDepManager;
    }

    return {
      type: 'next',
      data: {
        language: lang,
        deliveryType: deliveryType as string,
        dotnetVersion,
        pythonDepManager,
        webContainer,
        frontendFramework,
        backendFramework,
      },
    };
  }
}
