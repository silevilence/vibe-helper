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
import { join, resolve } from 'path';
import { spinner, note } from '@clack/prompts';
import type { InitOptions } from '../types.js';
import { fileExists } from '../utils/file-check.js';
import { confirmOverwrite } from '../prompts/confirm-overwrite.js';
import {
  buildCopilotInstructions,
  buildCrushJson,
  getRoadmapTemplatePath,
  getSkillsResPath,
} from './template-loader.js';

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
 * 安全写入文件：先检查是否存在，再确认覆盖，最后写入
 */
async function safeWrite(
  cwd: string,
  relativePath: string,
  content: string,
): Promise<'created' | 'skipped' | 'failed'> {
  const fullPath = resolve(cwd, relativePath);

  // 检查文件是否存在
  if (await fileExists(fullPath)) {
    const action = await confirmOverwrite(relativePath);
    if (action === 'skip') return 'skipped';
    // 'abort' 已在 confirmOverwrite 中 process.exit
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
    // ── 5.1 生成 .github/copilot-instructions.md ──
    if (options.engines.includes('github-copilot')) {
      const instructions = await buildCopilotInstructions(options, resBasePath);
      const status = await safeWrite(
        cwd,
        '.github/copilot-instructions.md',
        instructions,
      );
      if (status === 'created') result.created.push('.github/copilot-instructions.md');
      else if (status === 'skipped') result.skipped.push('.github/copilot-instructions.md');
    }

    // ── 5.2 生成 ROADMAP.md ──
    const roadmapSrc = getRoadmapTemplatePath(resBasePath);
    if (await fileExists(roadmapSrc)) {
      const { readFile } = await import('fs/promises');
      const roadmapContent = await readFile(roadmapSrc, 'utf-8');
      const roadmapStatus = await safeWrite(cwd, 'ROADMAP.md', roadmapContent);
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
      const status = await safeWrite(cwd, 'crush.json', crushJson);
      if (status === 'created') result.created.push('crush.json');
      else if (status === 'skipped') result.skipped.push('crush.json');
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
