/**
 * 优雅错误处理工具
 *
 * 将异常转换为用户友好的 TUI 提示，避免输出长篇调用栈。
 * 使用 @clack/prompts 的 cancel/outro 优雅退出。
 */
import { cancel, outro } from '@clack/prompts';

/**
 * 用户可读的错误消息映射
 */
const FRIENDLY_ERRORS: Record<string, string> = {
  EACCES: '权限不足，无法访问目标路径。请检查文件权限后重试。',
  ENOENT: '未找到指定文件或目录，请确认路径是否正确。',
  EEXIST: '目标文件已存在，操作已被安全拦截以防止覆盖。',
  ENOSPC: '磁盘空间不足，无法写入文件。请释放空间后重试。',
  EISDIR: '路径指向了一个目录，但需要的是文件路径。',
  ENOTDIR: '路径指向了一个文件，但需要的是目录路径。',
  EPERM: '操作被系统拒绝，请以管理员身份运行或检查权限设置。',
};

/**
 * 将系统错误码映射为中文友好提示
 */
function friendlyMessage(err: NodeJS.ErrnoException): string {
  if (err.code && FRIENDLY_ERRORS[err.code]) {
    return FRIENDLY_ERRORS[err.code]!;
  }
  return err.message || '发生未知错误，请重试。';
}

/**
 * 统一错误处理入口
 * 通过 @clack/prompts 的 cancel 优雅退出，不打印调用栈
 */
export function handleError(err: unknown, context?: string): never {
  const prefix = context ? `[${context}] ` : '';

  if (err instanceof Error && 'code' in err) {
    cancel(`${prefix}${friendlyMessage(err as NodeJS.ErrnoException)}`);
    process.exit(1);
  }

  const message = err instanceof Error ? err.message : String(err);
  cancel(`${prefix}错误：${message}`);
  process.exit(1);
}

/**
 * 安全执行异步函数，捕获异常后调用 handleError
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    handleError(err, context);
  }
}

/**
 * 操作完成后显示友好的退出提示
 */
export function gracefulExit(message?: string): never {
  outro(message ?? '感谢使用 vibe-helper，再见！');
  process.exit(0);
}
