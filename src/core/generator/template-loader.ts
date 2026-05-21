/**
 * 模板加载器
 *
 * 负责从 res/tools/init/ 目录读取 Markdown 模板片段，
 * 执行占位符替换，返回拼接后的最终内容。
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { InitOptions, Language } from '../types.js';

/** 语言名称映射 */
const LANGUAGE_NAMES: Record<Language, string> = {
  csharp: 'C#',
  fsharp: 'F#',
  typescript: 'TypeScript',
  rust: 'Rust',
  cpp: 'C++',
  python: 'Python',
};

/**
 * 简单的占位符替换引擎
 * 将 {{KEY}} 替换为对应的值
 */
function replacePlaceholders(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

/**
 * 读取模板文件内容
 */
async function readTemplate(...segments: string[]): Promise<string> {
  const filePath = join(...segments);
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * 安全拼接内容块，确保块之间有空行分隔
 */
function joinSections(...sections: (string | undefined | null)[]): string {
  return sections.filter(Boolean).join('\n\n').trim();
}

/**
 * 组装 copilot-instructions.md 的完整内容
 */
export async function buildCopilotInstructions(
  options: InitOptions,
  resBasePath: string,
): Promise<string> {
  // 并行读取所有需要的模板片段
  // 目录结构根据语言选择不同的模板（回退到通用模板）
  const dirStructureFile = `directory-structure-${options.language}.md`;
  let dirStructure = await readTemplate(resBasePath, 'base', dirStructureFile);
  if (!dirStructure) {
    dirStructure = await readTemplate(resBasePath, 'base', 'directory-structure.md');
  }

  const [
    baseTemplate,
    langTemplate,
    testingTemplate,
    docTemplate,
    gitTemplate,
  ] = await Promise.all([
    readTemplate(resBasePath, 'base', 'copilot-instructions.md'),
    readTemplate(resBasePath, 'languages', `${options.language}.md`),
    readTemplate(resBasePath, 'requirements', `testing-${options.testStrategy}.md`),
    readTemplate(resBasePath, 'requirements', `doc-permission-${options.docPermission}.md`),
    readTemplate(
      resBasePath,
      'requirements',
      `git-permission-${options.gitPermission === 'manual-only' ? 'manual' : 'allow'}.md`,
    ),
  ]);

  // 读取 Python 依赖管理模板（仅 Python 语言）
  let depManagerTemplate = '';
  if (options.language === 'python' && options.pythonDepManager) {
    depManagerTemplate = await readTemplate(
      resBasePath,
      'requirements',
      `python-dep-${options.pythonDepManager}.md`,
    );
  }

  // 构建语言特定的交付类型额外内容
  let deliveryExtra = '';
  if (options.language === 'typescript' && options.deliveryType === 'Electron') {
    deliveryExtra =
      '\n- 注意 Electron 主进程与渲染进程的代码隔离\n- 使用 IPC 通信时注意类型安全';
  }

  // 构建运行时环境描述
  let runtimeEnv: string;
  if (options.dotnetVersion) {
    const versionLabel = options.dotnetVersion === 'net8' ? '.NET 8 (LTS)' : '.NET 10';
    runtimeEnv = versionLabel;
  } else if (options.language === 'python') {
    runtimeEnv = 'Python (>= 3.10)';
  } else {
    runtimeEnv = 'Node.js (>= 18)';
  }

  // 处理语言模板中的占位符
  const processedLangTemplate = replacePlaceholders(langTemplate, {
    DELIVERY_TYPE: options.deliveryType,
    DELIVERY_EXTRA: deliveryExtra,
    DEP_MANAGER_RULES: depManagerTemplate.trim(),
  });

  // 处理目录结构模板中的占位符（如 {{PROJECT_NAME}}）
  const processedDirStructure = replacePlaceholders(dirStructure, {
    PROJECT_NAME: options.projectName,
  });

  // 拼装最终内容
  const content = replacePlaceholders(baseTemplate, {
    PROJECT_NAME: options.projectName,
    PROJECT_DESCRIPTION: options.description || '一个优秀的软件项目',
    RUNTIME_ENV: runtimeEnv,
    LANGUAGE: LANGUAGE_NAMES[options.language],
    LANGUAGE_SPECIFIC: options.dotnetVersion
      ? `- **.NET 版本**: ${options.dotnetVersion === 'net8' ? '.NET 8 (LTS)' : '.NET 10'}`
      : options.language === 'python' && options.pythonDepManager
        ? `- **依赖管理**: ${options.pythonDepManager}`
        : '',
    DIRECTORY_STRUCTURE: processedDirStructure.trim(),
    CODING_STANDARDS: processedLangTemplate.trim(),
    DOC_PERMISSION_RULES: docTemplate.trim(),
    GIT_PERMISSION_RULES: gitTemplate.trim(),
    TESTING_REQUIREMENTS: testingTemplate.trim(),
    DELIVERY_TYPE: options.deliveryType,
  });

  return content.trim() + '\n';
}

/**
 * 组装 crush.json 内容
 */
export async function buildCrushJson(
  options: InitOptions,
  resBasePath: string,
): Promise<string> {
  const template = await readTemplate(resBasePath, 'crush.json');
  return replacePlaceholders(template, {
    PROJECT_NAME: options.projectName,
    PROJECT_DESCRIPTION: options.description || '',
  });
}

/**
 * 获取 ROADMAP.md 模板路径
 */
export function getRoadmapTemplatePath(resBasePath: string): string {
  return join(resBasePath, 'ROADMAP.md');
}

/**
 * 获取技能资源目录路径
 */
export function getSkillsResPath(resBasePath: string): string {
  return join(resBasePath, 'skills');
}
