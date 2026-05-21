/**
 * 步骤 3: 配置工程技术栈（基于动态级联交互）
 *
 * - 选取开发语言（单选闭环：C# / F# / TypeScript / Rust / C++）
 * - 根据所选语言，级联触发交付类型选择
 * - 根据所选语言，条件触发运行时环境配置（仅 C#/F# 时，触发 .NET 版本选择）
 * - 支持返回上一步及级联内部回退
 */
import { select, isCancel, cancel } from '@clack/prompts';
import {
  LanguageDeliveryMap,
  type Language,
  type DotNetVersion,
  type PythonDepManager,
  type StepResult,
} from '../types.js';

export interface TechStackInput {
  language: Language;
  deliveryType: string;
  dotnetVersion?: DotNetVersion;
  pythonDepManager?: PythonDepManager;
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
      },
    };
  }
}
