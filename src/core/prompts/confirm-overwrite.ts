/**
 * 文件覆盖确认提示
 *
 * 在执行磁盘写入前，探测目标路径是否存在。
 * 若已存在，触发二次确认交互（覆盖 / 中止）。
 */
import { confirm, isCancel, cancel } from '@clack/prompts';
import type { InitOptions } from '../types.js';

export type OverwriteAction = 'overwrite' | 'skip' | 'abort';

/**
 * 当检测到目标文件已存在时，向用户确认操作
 *
 * @param filePath - 已存在的文件相对路径
 * @returns 用户选择的操作
 */
export async function confirmOverwrite(filePath: string): Promise<OverwriteAction> {
  const shouldOverwrite = await confirm({
    message: `文件 "${filePath}" 已存在，是否覆盖？`,
    initialValue: false,
  });

  if (isCancel(shouldOverwrite)) {
    cancel('操作已取消，未修改任何文件。');
    process.exit(0);
  }

  return shouldOverwrite ? 'overwrite' : 'skip';
}

/**
 * 批量确认覆盖操作
 *
 * @param existingFiles - 已存在的文件路径列表
 * @returns 需要覆盖的文件列表（用户确认覆盖的）
 */
export async function batchConfirmOverwrite(
  existingFiles: string[],
): Promise<string[]> {
  const toOverwrite: string[] = [];

  for (const file of existingFiles) {
    const action = await confirmOverwrite(file);
    if (action === 'abort') {
      return [];
    }
    if (action === 'overwrite') {
      toOverwrite.push(file);
    }
    // skip: 不加入覆盖列表
  }

  return toOverwrite;
}
