/**
 * 步骤 1: 采集基础项目信息
 *
 * 读取当前执行目录名称作为"项目名称"的默认值（支持用户重写）；
 * 提供"项目描述"的全文本输入流（支持留空）。
 * 支持返回上一步（步骤 1 没有上一步，仅支持重新填写）。
 */
import { text, confirm, isCancel, cancel } from '@clack/prompts';
import { basename } from 'path';
import type { StepResult } from '../types.js';

export interface ProjectInfoInput {
  projectName: string;
  description: string;
}

/**
 * 收集项目基础信息
 */
export async function collectProjectInfo(): Promise<StepResult<ProjectInfoInput>> {
  const defaultName = basename(process.cwd());

  let projectName: string | symbol;
  let description: string | symbol;

  // 循环：允许用户重新填写
  while (true) {
    projectName = await text({
      message: '请输入项目名称：',
      placeholder: defaultName,
      defaultValue: defaultName,
      validate(value: string) {
        if (value.length > 128) return '项目名称不能超过 128 个字符';
        return;
      },
    });

    if (isCancel(projectName)) {
      cancel('操作已取消');
      process.exit(0);
    }

    description = await text({
      message: '请输入项目描述（可选）：',
      placeholder: '简要描述项目的功能和目标',
      defaultValue: '',
    });

    if (isCancel(description)) {
      cancel('操作已取消');
      process.exit(0);
    }

    // 确认信息
    const finalName = (projectName as string).trim() || defaultName;
    const finalDesc = (description as string).trim();

    const confirmed = await confirm({
      message: `项目名称: "${finalName}"${finalDesc ? `\n项目描述: "${finalDesc}"` : ''}\n确认以上信息并继续？`,
      initialValue: true,
    });

    if (isCancel(confirmed)) {
      cancel('操作已取消');
      process.exit(0);
    }

    if (confirmed) {
      return {
        type: 'next',
        data: { projectName: finalName, description: finalDesc },
      };
    }
    // 用户选择"否" → 重新填写
  }
}
