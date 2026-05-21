/**
 * init 命令 — 项目初始化工具
 *
 * 功能定位：面向 Vibe Coding 场景的 AI Agent 配置脚手架。
 * 通过终端交互采集研发需求，动态读取并无缝拼装底层模板片段，
 * 自动化生成规范的工程配置文件。
 *
 * 完整五步交互流程（支持回退到上一步）：
 *   1. 采集基础项目信息
 *   2. 配置 AI Agent 引擎
 *   3. 配置工程技术栈（级联交互）
 *   4. 配置研发工作流与 AI 规范边界
 *   5. 执行安全校验与产物生成
 */
import type { Command } from 'commander';
import { intro, outro, note, cancel } from '@clack/prompts';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { CommandModule, InitOptions, StepResult } from '../core/types.js';
import { collectProjectInfo, type ProjectInfoInput } from '../core/prompts/project-info.js';
import { collectAiEngine, type AiEngineInput } from '../core/prompts/ai-engine.js';
import { collectTechStack, type TechStackInput } from '../core/prompts/tech-stack.js';
import { collectWorkflow, type WorkflowInput } from '../core/prompts/workflow.js';
import { showPreview } from '../core/prompts/preview.js';
import { generateFiles, showGenerationSummary } from '../core/generator/index.js';
import { handleError } from '../core/utils/error-handler.js';

// ESM 下获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const command: CommandModule = {
  name: 'init',
  description: '项目初始化 — 生成 AI Agent 配置脚手架',

  register(program: Command): void {
    program
      .command('init')
      .description('初始化 AI Agent 相关配置文件（.github/copilot-instructions.md、技能库、路线图等）')
      .action(async () => {
        await runInit();
      });
  },
};

/** 步骤定义 */
type WizardStep =
  | { step: 1; fn: () => Promise<StepResult<ProjectInfoInput>> }
  | { step: 2; fn: () => Promise<StepResult<AiEngineInput>> }
  | { step: 3; fn: () => Promise<StepResult<TechStackInput>> }
  | { step: 4; fn: () => Promise<StepResult<WorkflowInput>> };

/**
 * init 命令的主执行流程（状态机模式，支持回退 + 预览确认）
 */
async function runInit(): Promise<void> {
  // ── 显示欢迎界面 ──
  intro('🛠️  项目初始化 — AI Agent 配置脚手架');

  note(
    '此工具将引导您逐步完成 AI Agent 配置的初始化。\n' +
      '包括：核心指导文件、技能库、开发路线图等。\n' +
      '在每个选择步骤底部可选"← 返回上一步"来修改之前的配置。\n\n' +
      '按 Ctrl+C 可随时退出。',
    '欢迎',
  );

  try {
    // 初始化配置选项容器
    const options: Partial<InitOptions> = {};

    // 计算技能资源目录路径: 从 src/commands/ 向上到项目根目录
    const projectRoot = resolve(__dirname, '..', '..');
    const skillsBasePath = join(projectRoot, 'res', 'tools', 'init', 'skills');

    // ── 状态机循环：按步骤推进，支持回退，步骤 5 为预览确认 ──
    let currentStep = 1;

    while (currentStep <= 5) {
      let result: StepResult<unknown>;

      switch (currentStep) {
        case 1: {
          result = await collectProjectInfo();
          if (result.type === 'next') {
            const data = result.data as ProjectInfoInput;
            options.projectName = data.projectName;
            options.description = data.description;
            currentStep = 2;
          }
          break;
        }
        case 2: {
          result = await collectAiEngine();
          if (result.type === 'next') {
            const data = result.data as AiEngineInput;
            options.engines = data.engines;
            currentStep = 3;
          } else if (result.type === 'back') {
            currentStep = 1;
          }
          break;
        }
        case 3: {
          result = await collectTechStack();
          if (result.type === 'next') {
            const data = result.data as TechStackInput;
            options.language = data.language;
            options.deliveryType = data.deliveryType;
            options.dotnetVersion = data.dotnetVersion;
            options.pythonDepManager = data.pythonDepManager;
            currentStep = 4;
          } else if (result.type === 'back') {
            currentStep = 2;
          }
          break;
        }
        case 4: {
          result = await collectWorkflow(skillsBasePath);
          if (result.type === 'next') {
            const data = result.data as WorkflowInput;
            options.testStrategy = data.testStrategy;
            options.docPermission = data.docPermission;
            options.gitPermission = data.gitPermission;
            options.skills = data.skills;
            currentStep = 5; // 进入预览确认
          } else if (result.type === 'back') {
            currentStep = 3;
          }
          break;
        }
        case 5: {
          // ── 预览确认环节 ──
          const previewResult = await showPreview(options as InitOptions);
          if (previewResult.type === 'confirm') {
            currentStep = 6; // 退出循环，进入文件生成
          } else {
            currentStep = previewResult.step; // 回退到指定步骤
          }
          break;
        }
      }
    }

    // ── 步骤 6: 执行安全校验与产物生成 ──
    const resBasePath = join(projectRoot, 'res', 'tools', 'init');
    const cwd = process.cwd();

    const result = await generateFiles(
      options as InitOptions,
      resBasePath,
      cwd,
    );

    // 显示生成结果摘要
    showGenerationSummary(result);

    // ── 完成 ──
    outro('✅ 项目初始化完成！');
  } catch (err) {
    handleError(err, 'init');
  }
}

export default command;
