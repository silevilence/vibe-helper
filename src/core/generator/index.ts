/**
 * 文件生成引擎 (Generator)
 *
 * 编排模板组装与安全文件写入流程：
 *   1. 探测目标文件是否存在
 *   2. 触发覆盖确认（如需要）
 *   3. 读取模板、拼装内容
 *   4. 写入磁盘
 */
import { outputFile, copy, ensureDir } from 'fs-extra';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { spinner, note, confirm } from '@clack/prompts';
import { isCancel } from '@clack/prompts';
import type { InitOptions, CrushOverwriteMode } from '../types.js';
import { fileExists } from '../utils/file-check.js';
import { confirmOverwrite } from '../prompts/confirm-overwrite.js';
import {
  buildCopilotInstructions,
  buildCrushJson,
  getRoadmapTemplatePath,
  getSkillsResPath,
} from './template-loader.js';
import { getInitStrategy } from '../config/config-manager.js';

/** 生成结果汇总 */
export interface GenerationResult {
  /** 成功生成的文件路径列表 */
  created: string[];
  /** 跳过的文件路径列表（用户选择不覆盖） */
  skipped: string[];
  /** 生成失败的文件 */
  failed: { path: string; error: string }[];
}

/**
 * 安全写入文件：先检查是否存在，再根据配置确认覆盖，最后写入
 *
 * @param cwd - 当前工作目录
 * @param relativePath - 相对文件路径
 * @param content - 写入内容
 * @param skipConfirm - 是否跳过覆盖确认（由 Config 控制）
 */
async function safeWrite(
  cwd: string,
  relativePath: string,
  content: string,
  skipConfirm = false,
): Promise<'created' | 'skipped' | 'failed'> {
  const fullPath = resolve(cwd, relativePath);

  // 检查文件是否存在
  if (await fileExists(fullPath)) {
    if (skipConfirm) {
      // 配置指示直接覆盖，不询问
    } else {
      const action = await confirmOverwrite(relativePath);
      if (action === 'skip') return 'skipped';
      // 'abort' 已在 confirmOverwrite 中 process.exit
    }
  }

  // 确保目录存在
  await ensureDir(join(fullPath, '..'));

  try {
    await outputFile(fullPath, content, 'utf-8');
    return 'created';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`写入 ${relativePath} 失败: ${message}`);
  }
}

/**
 * 安全复制目录
 */
async function safeCopyDir(
  cwd: string,
  relativeDest: string,
  srcDir: string,
): Promise<'created' | 'skipped' | 'failed'> {
  const fullDest = resolve(cwd, relativeDest);

  if (await fileExists(fullDest)) {
    const action = await confirmOverwrite(relativeDest);
    if (action === 'skip') return 'skipped';
  }

  try {
    await copy(srcDir, fullDest, { overwrite: true });
    return 'created';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`复制到 ${relativeDest} 失败: ${message}`);
  }
}

/**
 * 执行完整的文件生成流程
 *
 * 加载全局配置，根据用户配置的策略决定每个文件的覆盖行为。
 */
export async function generateFiles(
  options: InitOptions,
  resBasePath: string,
  cwd: string,
): Promise<GenerationResult> {
  const genSpinner = spinner();
  genSpinner.start('正在生成配置文件...');

  const result: GenerationResult = {
    created: [],
    skipped: [],
    failed: [],
  };

  try {
    // 加载全局配置中的 Init 策略
    const strategy = await getInitStrategy();

    // ── 5.1 生成 .github/copilot-instructions.md ──
    const instructions = await buildCopilotInstructions(options, resBasePath);
    const status = await safeWrite(
      cwd,
      '.github/copilot-instructions.md',
      instructions,
      !strategy.copilotConfirmOverwrite,
    );
    if (status === 'created') result.created.push('.github/copilot-instructions.md');
    else if (status === 'skipped') result.skipped.push('.github/copilot-instructions.md');

    // ── 5.2 生成 ROADMAP.md ──
    const roadmapSrc = getRoadmapTemplatePath(resBasePath);
    if (await fileExists(roadmapSrc)) {
      const roadmapContent = await readFile(roadmapSrc, 'utf-8');
      const roadmapStatus = await safeWrite(
        cwd,
        'ROADMAP.md',
        roadmapContent,
        !strategy.roadmapConfirmOverwrite,
      );
      if (roadmapStatus === 'created') result.created.push('ROADMAP.md');
      else if (roadmapStatus === 'skipped') result.skipped.push('ROADMAP.md');
    }

    // ── 5.3 复制技能文件到 .github/skills/ ──
    const skillsSrc = getSkillsResPath(resBasePath);
    if (options.skills.length > 0 && await fileExists(skillsSrc)) {
      for (const skillName of options.skills) {
        const skillSrcDir = join(skillsSrc, skillName);
        const skillDestDir = `.github/skills/${skillName}`;

        if (await fileExists(skillSrcDir)) {
          const status = await safeCopyDir(cwd, skillDestDir, skillSrcDir);
          if (status === 'created') result.created.push(skillDestDir);
          else if (status === 'skipped') result.skipped.push(skillDestDir);
        }
      }
    }

    // ── 5.4 生成 crush.json（仅启用 Crush 引擎时） ──
    if (options.engines.includes('crush')) {
      const crushJson = await buildCrushJson(options, resBasePath);
      const crushStatus = await handleCrushWrite(
        cwd,
        'crush.json',
        crushJson,
        strategy.crushOverwriteMode,
      );
      if (crushStatus === 'created') result.created.push('crush.json');
      else if (crushStatus === 'skipped') result.skipped.push('crush.json');
    }

    genSpinner.stop('配置文件生成完成');
  } catch (err) {
    genSpinner.stop('生成过程中发生错误');
    const message = err instanceof Error ? err.message : String(err);
    result.failed.push({ path: '(生成流程)', error: message });
  }

  return result;
}

/**
 * 处理 crush.json 的写入，应用配置中的覆盖策略
 *
 * @param cwd - 当前工作目录
 * @param relativePath - 相对文件路径
 * @param newContent - 新生成的 JSON 内容
 * @param mode - 覆盖策略
 */
async function handleCrushWrite(
  cwd: string,
  relativePath: string,
  newContent: string,
  mode: CrushOverwriteMode,
): Promise<'created' | 'skipped' | 'failed'> {
  const fullPath = resolve(cwd, relativePath);
  const exists = await fileExists(fullPath);

  // 文件不存在，直接写入
  if (!exists) {
    await ensureDir(join(fullPath, '..'));
    await outputFile(fullPath, newContent, 'utf-8');
    return 'created';
  }

  // 文件存在，根据策略处理
  switch (mode) {
    case 'replace':
      // 静默替换：直接覆盖
      await outputFile(fullPath, newContent, 'utf-8');
      return 'created';

    case 'confirm':
      // 覆盖前二次确认
      {
        const action = await confirmOverwrite(relativePath);
        if (action === 'skip') return 'skipped';
        await outputFile(fullPath, newContent, 'utf-8');
        return 'created';
      }

    case 'merge-confirm':
      // 深度合并前二次确认
      return deepMergeCrushJson(cwd, relativePath, newContent);

    default:
      // 未知模式回退到二次确认
      const action = await confirmOverwrite(relativePath);
      if (action === 'skip') return 'skipped';
      await outputFile(fullPath, newContent, 'utf-8');
      return 'created';
  }
}

/**
 * JSON AST 级别的深度合并算法
 *
 * 读取已有的 crush.json，将新模板与已有结构深度合并：
 * existing 独有的键保留原值，incoming 新增的键写入，
 * 双方共有的键以 incoming（模板）为准。
 * 合并后展示差异并二次确认。
 */
async function deepMergeCrushJson(
  cwd: string,
  relativePath: string,
  newContent: string,
): Promise<'created' | 'skipped' | 'failed'> {
  const fullPath = resolve(cwd, relativePath);

  try {
    // 读取已有内容
    const existingRaw = await readFile(fullPath, 'utf-8');
    const existing = JSON.parse(existingRaw) as Record<string, unknown>;
    const incoming = JSON.parse(newContent) as Record<string, unknown>;

    // 深度合并：incoming 的键覆盖 existing 的同名键（递归）
    const merged = deepMergeObjects(existing, incoming);

    // 无变更则跳过
    if (JSON.stringify(existing) === JSON.stringify(merged)) {
      return 'skipped';
    }

    // 展示差异并确认
    const shouldMerge = await confirm({
      message: `crush.json 已存在，检测到配置差异。是否将新结构合并到现有文件？\n  (选择"否"将跳过该文件)`,
      initialValue: true,
    });

    if (isCancel(shouldMerge) || !shouldMerge) {
      return 'skipped';
    }

    await outputFile(fullPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
    return 'created';
  } catch {
    // JSON 解析失败时回退到二次确认
    const action = await confirmOverwrite(relativePath);
    if (action === 'skip') return 'skipped';
    await outputFile(fullPath, newContent, 'utf-8');
    return 'created';
  }
}

/**
 * 深度合并两个 JSON 对象
 *
 * 规则：
 *   - incoming 中的新键直接添加
 *   - incoming 中的已有键（值为对象）递归合并
 *   - incoming 中的已有键（值为非对象）覆盖 existing
 *   - existing 独有的键保持不变
 */
function deepMergeObjects(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      key in result &&
      result[key] !== null &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      // 双方都是普通对象：递归合并
      result[key] = deepMergeObjects(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      // 非对象或一方不存在：直接覆盖
      result[key] = value;
    }
  }

  return result;
}

/**
 * 显示生成结果摘要
 */
export function showGenerationSummary(result: GenerationResult): void {
  if (result.created.length > 0) {
    note(
      result.created.map((f) => `  ✅ ${f}`).join('\n'),
      '已生成',
    );
  }

  if (result.skipped.length > 0) {
    note(
      result.skipped.map((f) => `  ⏭️  ${f} (已跳过)`).join('\n'),
      '已跳过',
    );
  }

  if (result.failed.length > 0) {
    note(
      result.failed.map((f) => `  ❌ ${f.path}: ${f.error}`).join('\n'),
      '失败',
    );
  }
}
