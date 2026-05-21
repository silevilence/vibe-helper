# vibe-helper AI 开发指导指南

## 项目概述

vibe-helper 是一个面向 Vibe Coding 场景的 CLI/TUI 终端交互工具，采用**插件化命令架构**。通过高度精美的命令行交互，帮助开发者快速为新旧项目初始化 AI Agent 相关的配置文件（`.github/copilot-instructions.md`、预设技能库、开发路线图、引擎私有配置等）。

### 架构模式

- **入口层** (`src/index.ts`)：初始化 Commander 程序实例，动态加载所有命令模块；无参数启动时渲染 TUI 主菜单
- **命令层** (`src/commands/`)：每个子命令实现为独立模块（`CommandModule` 接口），通过 `register(program)` 注册
- **核心层** (`src/core/`)：包含 prompts（TUI 交互）、generator（文件生成引擎）、utils（工具类）、types（共享类型）
- **资源层** (`res/tools/init/`)：与代码严格分离的静态模板片段，通过占位符替换机制拼装

### 当前版本状态

V0.1.0 — `init` 工具已完成，项目框架就绪，具备完整的测试体系。

---

## 技术栈与核心依赖

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 运行环境 | Node.js | ≥ 18 | `engines` 字段约束 |
| 开发语言 | TypeScript | ^5.6 | 严格模式 (`strict: true`) |
| 编译目标 | ES2022 / ESNext | — | `moduleResolution: bundler` |
| CLI 框架 | commander | ^12.1 | 命令行参数解析与子命令管理 |
| TUI 交互 | @clack/prompts | ^0.7 | 终端 UI 组件 (intro, outro, spinner, select, multiselect, confirm, text, note, cancel) |
| 文件操作 | fs-extra | ^11.2 | 异步文件系统操作 (`pathExists`, `outputFile`, `copy`, `ensureDir`) |
| 运行时引擎 | tsx | ^4.19 | 开发期直接执行 TS 源码（当前在 `dependencies` 中） |
| 测试框架 | Vitest | ^4.1.7 | 单元测试与覆盖率 |
| 覆盖率 | @vitest/coverage-v8 | ^4.1.7 | V8 引擎覆盖率采集 |

**硬性约束**：
- 不得降级 TypeScript 严格模式配置
- `tsx` 在 npm 发布前**必须**保留在 `dependencies` 中
- 项目为纯 ESM (`"type": "module"`)，禁止使用 CommonJS `require` 语法（`bin/run.cjs` 例外）

---

## 目录结构规范

项目需要保持清晰的模块化，代码与资源严格分离：

```text
vibe-helper/
├── bin/
│   └── run.cjs              # 智能 JS 桥接入口（package.json 的 bin 字段指向此处）
├── src/
│   ├── index.ts              # CLI 入口文件，动态加载命令 + TUI 主菜单
│   ├── commands/
│   │   └── init.ts           # init 命令 — 五步交互式项目初始化向导
│   ├── core/
│   │   ├── types.ts          # 共享类型定义（Language, InitOptions, CommandModule 等）
│   │   ├── command-registry.ts # 插件化命令注册架构
│   │   ├── generator/
│   │   │   ├── index.ts      # 文件生成引擎（safeWrite, safeCopyDir, generateFiles, showGenerationSummary）
│   │   │   └── template-loader.ts # 模板读取、占位符替换、片段拼接
│   │   ├── prompts/
│   │   │   ├── project-info.ts    # 步骤 1：采集项目名称与描述
│   │   │   ├── ai-engine.ts      # 步骤 2：选择 AI Agent 引擎（多选）
│   │   │   ├── tech-stack.ts     # 步骤 3：开发语言 → 交付类型 → .NET 版本（级联）
│   │   │   ├── workflow.ts       # 步骤 4：测试策略 + 文档/Git 权限 + 技能选择
│   │   │   ├── preview.ts        # 步骤 5：配置预览与确认 / 回退修改
│   │   │   └── confirm-overwrite.ts # 文件覆盖确认（overwrite / skip / abort）
│   │   └── utils/
│   │       ├── error-handler.ts  # 优雅错误处理（系统错误码映射 + cancel 退出）
│   │       └── file-check.ts     # fileExists, findExistingFiles, getResPath
│   └── __tests__/            # 单元测试（与 src/ 同级结构镜像）
│       ├── types.test.ts
│       ├── command-registry.test.ts
│       ├── commands/
│       │   └── init.test.ts
│       ├── generator/
│       │   ├── index.test.ts
│       │   └── template-loader.test.ts
│       ├── prompts/
│       │   ├── confirm-overwrite.test.ts
│       │   └── preview.test.ts
│       └── utils/
│           ├── error-handler.test.ts
│           └── file-check.test.ts
├── res/
│   └── tools/
│       └── init/
│           ├── base/             # 通用基础模板 (copilot-instructions.md + 各语言目录结构)
│           ├── languages/        # 语言特定开发规范 (cpp, csharp, fsharp, rust, typescript)
│           ├── requirements/     # 测试策略 + 文档/Git 权限要求
│           ├── skills/           # AI 技能模块（当前仅有 .gitkeep）
│           ├── ROADMAP.md        # 路线图模板
│           └── crush.json        # Crush 配置模板
├── coverage/                     # 测试覆盖率报告（V8 provider）
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── ROADMAP.md                    # 项目开发路线图
└── changelog.md                  # 变更日志
```

## 运行与发布机制 (JS Bridge 策略)

当前项目为支持通过 `npx github:silevilence/vibe-helper` 直接执行 TypeScript 源码，采用**智能 JS 桥接策略**：

1. **桥接文件 (`bin/run.cjs`)**：作为 `package.json` 的 `bin` 入口。使用 CommonJS 语法编写（纯 ESM 项目的唯一例外），动态判断执行策略：
   - **已编译路径优先**：检查 `dist/index.js` 是否存在，存在则直接用 Node.js 执行编译产物（面向未来 npm 发布场景）
   - **源码回退**：编译产物不存在时，通过 `npx tsx` 执行 TypeScript 源码（兼容当前直接从 GitHub 运行）

2. **依赖要求**：在此阶段，`tsx` **必须**保留在 `package.json` 的 `dependencies` 中。

3. **未来 NPM 发布约定**：当项目正式打包发布到 npm 仓库时：
   - 废弃桥接文件策略
   - 将源码编译至 `dist/`，`package.json` 的 `bin` 直接指向 `"./dist/index.js"`
   - 将 `tsx` 移至 `devDependencies`

---

## 架构与扩展性原则 (CRITICAL)

以下每一条原则都是强制要求，开发时需逐条遵守。

### 原则一：命令的插件化架构
   - `src/index.ts` 中只负责基础设置和按需加载命令。
   - 每个命令（如 `init`）必须实现为一个独立模块，方便未来无限横向扩展其他工具（如 `add`, `eject`, `audit`）。

### 原则二：级联交互逻辑
   - 在使用 `@clack/prompts` 设计表单时，严格遵守**级联依赖**。例如：必须在用户选择"C#"后，再提供"Winform / WPF / MAUI"等相关选项。

### 原则三：安全的文件生成机制（防覆盖保护）
   - **绝对禁止**在没有检查的情况下直接写入或覆盖文件系统。
   - 在执行生成动作前，必须检查目标路径文件（如 `.github/copilot-instructions.md` 或 `ROADMAP.md`）是否存在。
   - 若存在，必须触发 `@clack/prompts` 的二次确认（`confirm`）交互，询问用户是否覆盖或中止。

### 原则四：纯粹的片段拼接逻辑
   - `init` 工具的核心是“组装”。尽量不要在代码中硬编码长篇幅的 Prompt 文本，而是通过 `fs.readFile` 读取 `res/tools/init/` 目录下的 Markdown 片段，利用字符串拼接或简单的占位符替换生成最终内容。

---

## 核心类型与接口参考

### CommandModule 接口

每个子命令必须实现此接口，放置在 `src/commands/` 目录下：

```typescript
export interface CommandModule {
  name: string;           // 命令名称（如 "init"）
  description: string;    // 命令描述，同时用于 TUI 菜单标签
  register: (program: Command) => void;  // 注册到 commander 实例
}
```

### InitOptions — 用户配置的完整类型

```typescript
export interface InitOptions {
  projectName: string;
  description: string;
  engines: AiEngine[];           // 'github-copilot' | 'crush'
  language: Language;            // 'csharp' | 'fsharp' | 'typescript' | 'rust' | 'cpp'
  deliveryType: string;          // 根据语言级联选择
  dotnetVersion?: DotNetVersion; // 'net8' | 'net10'（仅 C#/F#）
  testStrategy: TestStrategy;    // 'tdd' | 'coverage' | 'none'
  docPermission: DocPermission;  // 'deny' | 'allow'
  gitPermission: GitPermission;  // 'manual-only' | 'allow'
  skills: string[];              // 用户选中的技能名称列表
}
```

### StepResult — 向导步骤的状态机类型

```typescript
export type StepResult<T> =
  | { type: 'next'; data: T }
  | { type: 'back' };
```

### 关键导出函数

| 模块 | 导出 | 用途 |
|------|------|------|
| `generator/index.ts` | `generateFiles(options, resBasePath, cwd)` | 执行完整文件生成流程 |
| `generator/index.ts` | `showGenerationSummary(result)` | 输出生成结果摘要 |
| `generator/template-loader.ts` | `buildCopilotInstructions(options, resBasePath)` | 拼装 copilot-instructions.md |
| `generator/template-loader.ts` | `buildCrushJson(options, resBasePath)` | 拼装 crush.json |
| `generator/template-loader.ts` | `getRoadmapTemplatePath(resBasePath)` | 获取 ROADMAP 模板路径 |
| `generator/template-loader.ts` | `getSkillsResPath(resBasePath)` | 获取技能资源路径 |
| `utils/file-check.ts` | `fileExists(targetPath)` | 检查文件是否存在 |
| `utils/file-check.ts` | `findExistingFiles(cwd, targets)` | 批量检查文件存在 |
| `utils/file-check.ts` | `getResPath(...segments)` | 从核心目录向上查找资源路径 |
| `utils/error-handler.ts` | `handleError(err, context?)` | 统一错误处理（cancel 退出） |

### Prompts 模块约定

每个 prompts 模块导出以下模式的函数：

```typescript
// 返回 StepResult<T> 给向导状态机使用
export async function collectXxx(...): Promise<StepResult<XxxInput>>;

// 或返回 PreviewAction / OverwriteAction 等
export async function showPreview(options: InitOptions): Promise<PreviewAction>;
export async function confirmOverwrite(filePath: string): Promise<OverwriteAction>;
```

在 prompts 内部，使用 `BACK_SENTINEL = '__back__'` 作为返回上一步的标记值，通过 `step<number>` 索引实现状态机跳转。

---

## 编码规范

1. **TypeScript 规范**:
   - 全面使用 ES Modules (ESM) 语法（`import`/`export`）。
   - 尽量定义清晰的 Interface/Type（例如 `InitOptions`, `CommandModule`, `StepResult`）。
   - 避免使用 `any`，确保配置对象在传递给 generator 时类型安全。
   - TypeScript 编译目标 `ES2022`，`moduleResolution: bundler`。

2. **UI 体验**:
   - CLI 输出信息必须美观且语义化，善用 `@clack/prompts` 的 `intro`, `outro`, `spinner`, `note` 等 UI 组件。
   - 发生异常时通过 `cancel` 优雅退出终端，而不是抛出长篇调用栈。
   - `@clack/prompts` 的 `isCancel()` 和 `cancel()` 用于处理用户手动取消。

3. **异步优先**:
   - 所有文件系统读写必须使用异步方法（`async/await`），防止阻塞 TUI 动画。
   - 对有并行可能性的 I/O 操作使用 `Promise.all`。

4. **模块化**:
   - 每个文件应有明确的单一职责。
   - 命令模块通过 `export default command` 导出 `CommandModule` 实例。
   - Windows ESM 兼容：动态导入必须使用 `pathToFileURL` 转换为 `file://` URL。

---

## 测试规则

### 框架与运行

- **Vitest** 作为测试运行器，`@vitest/coverage-v8` 提供覆盖率
- 测试文件放在 `src/__tests__/`，与源文件目录结构镜像
- 测试文件命名：`*.test.ts`
- 运行命令：`npm test`（单次）、`npm run test:watch`（监听）、`npm run test:coverage`（覆盖率）

### 测试编写规范

- 使用 `describe` / `it` 组织测试用例
- 测试纯逻辑函数和模块接口，不测试 TUI 交互（`@clack/prompts` 需要终端环境）
- 对文件 I/O 密集型逻辑（如 generator），mock `fs-extra` 和 `fs/promises`
- 每个新功能或 Bug 修复必须补充对应的单元测试

### 覆盖率要求

- 核心业务逻辑覆盖率 ≥ 80%
- 总体代码覆盖率 ≥ 70%

## 文档与 Git 规范 (CRITICAL)

为了防止 AI 执行越界操作，在协助开发本工具时，必须严格遵守以下红线原则：

1. **核心文档防篡改**:
   - 除非在对话中收到明确的"允许/要求更新文档"的指令，否则**绝对禁止**自动修改项目核心文档（包括但不限于 `README.md`、`ROADMAP.md` 以及本文件 `.github/copilot-instructions.md`）。
   - 当明确收到修改文档的请求时，**严格限制**只能修改指令中明确指定的那份（或那几份）文档，绝不允许因为关联性而自行修改其他未被提及的文档。

2. **Git 操作权限 (只读)**:
   - **禁止写入**：绝对禁止 AI 自动执行任何改变 Git 状态的操作（严禁使用 `git add`、`git commit`、`git push` 等命令）。所有的代码提交与同步工作完全交由用户手动完成。
   - **允许读取**：AI 可以且仅可以使用安全的只读命令（如 `git status`、`git diff`、`git log`）来查看代码变更或上下文。

---

## 默认 AI 行为指南

### 新功能开发
1. 在 `src/commands/` 下创建新的命令模块（实现 `CommandModule` 接口）
2. 如有 TUI 交互需求，在 `src/core/prompts/` 下创建对应的 prompt 模块
3. 如有模板生成需求，在 `res/tools/` 下创建模板目录和片段文件
4. 在 `src/core/types.ts` 中添加必要的类型定义
5. 在 `src/__tests__/` 下编写对应的单元测试

### Bug 修复
1. 先通过 `src/__tests__/` 下的测试定位问题
2. 使用 `git log --oneline` 和 `git diff` 查看相关变更历史
3. 修复后运行 `npm test` 确认所有测试通过
4. 如修复涉及新边界情况，补充测试用例

### 代码审查
- 检查 TypeScript 类型安全（无 `any`）
- 确认文件写入前有覆盖保护
- 确认 TUI 组件使用符合 `@clack/prompts` 规范
- 确认模板拼装逻辑在 `template-loader.ts` 中，不在代码中硬编码

### 禁止事项
- 禁止自动修改 `README.md`、`ROADMAP.md` 或本文件
- 禁止执行 `git add`、`git commit`、`git push`
- 禁止降级 TypeScript 严格模式
- 禁止将 `tsx` 从 `dependencies` 移至 `devDependencies`（发布前）
- 禁止引入新的生产依赖未经明确许可