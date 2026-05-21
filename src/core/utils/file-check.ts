/**
 * 文件系统检查工具
 *
 * 提供文件存在性探测与安全写入功能，
 * 防止静默覆盖用户已有的配置文件。
 */
import { pathExists } from 'fs-extra';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * 检查目标路径的文件是否已存在
 */
export async function fileExists(targetPath: string): Promise<boolean> {
  return pathExists(targetPath);
}

/**
 * 批量检查多个目标路径，返回已存在的文件路径列表
 */
export async function findExistingFiles(
  cwd: string,
  targets: string[],
): Promise<string[]> {
  const existing: string[] = [];
  for (const target of targets) {
    const fullPath = resolve(cwd, target);
    if (await fileExists(fullPath)) {
      existing.push(target);
    }
  }
  return existing;
}

/**
 * 获取项目根目录下的资源模板路径
 *
 * 从 src/core/utils/ 向上找到项目根目录
 */
export function getResPath(...segments: string[]): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // src/core/utils -> src/core -> src -> 项目根目录
  const projectRoot = resolve(__dirname, '..', '..', '..');
  return resolve(projectRoot, 'res', ...segments);
}

export { resolve as resolvePath };
