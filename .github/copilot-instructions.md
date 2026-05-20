# vibe-helper AI 开发指导指南

## 项目背景与目标
**项目名称**: vibe-helper
**项目描述**: 这是一个针对 Vibe Coding 场景的 CLI/TUI 终端交互工具。其核心功能是通过高度精美的命令行交互，帮助开发者快速为新旧项目初始化 AI Agent 相关的配置文件（如 `.github/copilot-instructions.md`、预设技能库、开发路线图等）。
**当前核心功能**: `init` 工具（脚手架式组合拼接指令片段并生成文件）。

---

## 技术栈与核心依赖
- **运行环境**: Node.js
- **开发语言**: TypeScript (强类型，严格模式)
- **运行方式**: 早期开发及未发布前使用 `tsx` 运行 (例如 `npx tsx src/index.ts`)。
- **CLI 框架**: `commander` (用于解析命令行参数和管理子命令架构)
- **TUI 交互**: `@clack/prompts` (用于渲染优雅的单选、多选、文本输入及级联交互菜单)
- **文件操作**: `fs-extra` (提供更便捷的文件系统操作，如复制目录、确保目录存在等)

---

## 目录结构规范
项目需要保持清晰的模块化，特别是资源目录和命令行架构的解耦：

```text
├── src/
│   ├── index.ts              # CLI 入口文件，负责注册所有子命令
│   ├── commands/             # 子命令目录（目前仅有 init.ts）
│   ├── core/                 # 核心逻辑
│   │   ├── prompts/          # TUI 交互逻辑（抽离各种收集用户信息的表单）
│   │   ├── generator/        # 模板组合与文件生成引擎
│   │   └── utils/            # 通用工具类 (如文件覆盖检查、路径处理)
├── res/                      # 静态资源与模板目录
│   └── tools/
│       └── init/
│           ├── base/         # 通用基础设定模板
│           ├── languages/    # 语言与项目类型相关的片段模板
│           ├── requirements/ # 测试、代码管理等要求片段模板
│           ├── skills/       # AI 具体技能文件存放区
│           ├── ROADMAP.md    # 路线图模板
│           └── crush.json    # Crush 配置文件模板
├── package.json
└── tsconfig.json
```

## 运行与发布机制 (JS Bridge 策略)

当前项目为了支持通过 `npx github:...` 直接拉取执行 TypeScript 源码，采用 JS 桥接策略：

1. **桥接文件 (`bin/run.js`)**: 
  作为 `package.json` 的 `bin` 入口。必须通过子进程调用 `tsx` 运行 TS 源码，且必须严格遵守以下要求：透传 `process.argv` 和保持 `stdio: 'inherit'`（确保 TUI 渲染正常）。
  标准实现代码如下：
  ```javascript
  #!/usr/bin/env node
  const { spawnSync } = require('child_process');
  const { join } = require('path');
  const args = process.argv.slice(2);
  const result = spawnSync('npx', ['tsx', join(__dirname, '../src/index.ts'), ...args], { stdio: 'inherit' });
  process.exit(result.status);
  ```

2. **依赖要求**: 在此阶段，`tsx` 必须保留在 `package.json` 的 `dependencies` 中。
3. **未来 NPM 发布约定**: 当项目准备正式打包发布到 npm 仓库时，需废弃此桥接文件策略。改为将源码打包至 `dist/`，并将 `package.json` 的 `bin` 字段直接指向编译产物（如 `"./dist/index.js"`），同时将 `tsx` 移至 `devDependencies`。

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

## 编码规范

1. **TypeScript 规范**:
   - 全面使用 ES Modules (ESM) 语法（`import`/`export`）。
   - 尽量定义清晰的 Interface/Type（例如用户配置收集结果的类型定义 `InitOptions`）。
   - 避免使用 `any`，确保配置对象在传递给 generator 时类型安全。

2. **UI 体验**:
   - CLI 输出信息必须美观且语义化，善用 `@clack/prompts` 的 `intro`, `outro`, `spinner`, `note` 等 UI 组件。
   - 提供友好的报错信息。如果发生异常（如模板丢失、权限不足），需通过 `cancel` 优雅退出终端，而不是抛出长篇乱码调用栈。

3. **异步优先**:
   - 所有文件系统读写必须使用异步方法（`async/await`），防止阻塞主线程渲染 TUI 动画。

4. **完善测试**:
   - 所有功能与问题修复必须配套单元测试。

## 文档与 Git 规范 (CRITICAL)

为了防止 AI 执行越界操作，在协助开发本工具时，必须严格遵守以下红线原则：

1. **核心文档防篡改**:
   - 除非在对话中收到明确的“允许/要求更新文档”的指令，否则**绝对禁止**自动修改项目核心文档（包括但不限于 `README.md`、`ROADMAP.md` 以及本文件 `.github/copilot-instructions.md`）。
   - 当明确收到修改文档的请求时，**严格限制**只能修改指令中明确指定的那份（或那几份）文档，绝不允许因为关联性而自行修改其他未被提及的文档。

2. **Git 操作权限 (只读)**:
   - **禁止写入**：绝对禁止 AI 自动执行任何改变 Git 状态的操作（严禁使用 `git add`、`git commit`、`git push` 等命令）。所有的代码提交与同步工作完全交由用户手动完成。
   - **允许读取**：AI 可以且仅可以使用安全的只读命令（如 `git status`、`git diff`、`git log`）来查看代码变更或上下文。