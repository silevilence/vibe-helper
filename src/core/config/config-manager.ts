/**
 * 配置状态管理引擎 (ConfigStateManager)
 *
 * 实现参数持久化写入用户本地环境（~/.vibe-helper/config.json），
 * 并保障每次 CLI 唤醒时自动加载至上下文。
 *
 * 核心特性：
 *   - 自动加载：模块首次引用时自动从磁盘读取配置
 *   - 惰性写入：仅在配置变更时写回磁盘
 *   - 深度合并：缺失项自动回退至全局默认值
 *   - 线程安全：通过 Promise 链保证并发安全
 */
import { homedir } from 'os';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { pathExists, outputFile } from 'fs-extra';
import { DEFAULT_CONFIG, getDefaultInitStrategy } from './config-defaults.js';
import type { VibeHelperConfig, InitStrategyConfig, CrushOverwriteMode } from '../types.js';

// ── 配置文件路径 ────────────────────────────────────────────

/** 用户本地配置目录 */
const CONFIG_DIR = join(homedir(), '.vibe-helper');
/** 用户本地配置文件 */
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// ── 状态管理 ────────────────────────────────────────────────

/** 内存中的运行时配置缓存 */
let _config: VibeHelperConfig | null = null;
/** 加载 Promise，防止并发重复加载 */
let _loadPromise: Promise<VibeHelperConfig> | null = null;
/** 是否有未持久化的变更 */
let _dirty = false;

// ── 公共 API ────────────────────────────────────────────────

/**
 * 获取当前完整配置（自动加载）
 *
 * 首次调用时自动从 ~/.vibe-helper/config.json 加载，
 * 缺失项回退至默认值。后续调用返回内存缓存。
 */
export async function getConfig(): Promise<VibeHelperConfig> {
  if (_config) return _config;
  return loadConfig();
}

/**
 * 获取 Init 工具执行策略配置（便捷方法）
 */
export async function getInitStrategy(): Promise<InitStrategyConfig> {
  const config = await getConfig();
  return config.initStrategy;
}

/**
 * 更新配置（部分更新，深度合并）
 *
 * 仅修改传入的字段，未传入的字段保持不变。
 * 变更自动标记为待持久化，需调用 saveConfig() 写入磁盘。
 *
 * @param patch - 部分配置更新
 */
export function updateConfig(patch: Partial<VibeHelperConfig>): void {
  if (!_config) {
    throw new Error('配置尚未加载，请先调用 getConfig()');
  }
  deepMerge(_config, patch);
  _dirty = true;
}

/**
 * 更新 Init 策略配置（便捷方法）
 */
export function updateInitStrategy(patch: Partial<InitStrategyConfig>): void {
  if (!_config) {
    throw new Error('配置尚未加载，请先调用 getConfig()');
  }
  _config.initStrategy = { ..._config.initStrategy, ...patch };
  _dirty = true;
}

/**
 * 保存配置到磁盘
 *
 * 将内存中的配置变更持久化到 ~/.vibe-helper/config.json。
 * 无变更则跳过写入。
 */
export async function saveConfig(): Promise<void> {
  if (!_dirty || !_config) return;
  await outputFile(CONFIG_FILE, JSON.stringify(_config, null, 2), 'utf-8');
  _dirty = false;
}

/**
 * 重置配置为默认值（内存 + 磁盘）
 */
export async function resetConfig(): Promise<void> {
  _config = structuredClone(DEFAULT_CONFIG as VibeHelperConfig);
  _dirty = true;
  await saveConfig();
}

/**
 * 强制重新加载配置（丢弃内存缓存）
 */
export async function reloadConfig(): Promise<VibeHelperConfig> {
  _config = null;
  _loadPromise = null;
  _dirty = false;
  return loadConfig();
}

/**
 * 获取配置文件路径（供诊断使用）
 */
export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

/**
 * 【仅供测试】重置内部状态缓存
 *
 * 将内存中的配置缓存和加载锁清空，不写入磁盘。
 * 使用本函数可确保测试间状态隔离。
 */
export function __internalReset(): void {
  _config = null;
  _loadPromise = null;
  _dirty = false;
}

// ── 内部实现 ────────────────────────────────────────────────

/**
 * 从磁盘加载配置，缺失项回退至默认值
 */
async function loadConfig(): Promise<VibeHelperConfig> {
  // 已有并发加载在进行中，等待其完成
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      if (await pathExists(CONFIG_FILE)) {
        const raw = await readFile(CONFIG_FILE, 'utf-8');
        const fileConfig = JSON.parse(raw) as Partial<VibeHelperConfig>;
        _config = mergeWithDefaults(fileConfig);
      } else {
        _config = structuredClone(DEFAULT_CONFIG as VibeHelperConfig);
      }
    } catch {
      // 文件损坏或读取失败时回退到默认值
      _config = structuredClone(DEFAULT_CONFIG as VibeHelperConfig);
    }
    _dirty = false;
    return _config;
  })();

  return _loadPromise;
}

/**
 * 将文件中的配置与默认值深度合并，确保所有键都存在
 */
function mergeWithDefaults(fileConfig: Partial<VibeHelperConfig>): VibeHelperConfig {
  const defaults = structuredClone(DEFAULT_CONFIG as VibeHelperConfig);
  deepMerge(defaults, fileConfig);
  return defaults;
}

/**
 * 简单的深度合并（仅处理普通对象，不处理数组）
 * target 会被原地修改
 */
function deepMerge(target: Record<string, unknown>, source: Partial<Record<string, unknown>>): void {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      deepMerge(tgtVal as Record<string, unknown>, srcVal as Record<string, unknown>);
    } else if (srcVal !== undefined) {
      target[key] = srcVal;
    }
  }
}
