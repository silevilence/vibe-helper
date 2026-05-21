# vibe-helper

面向 Vibe Coding 场景的 CLI/TUI 终端交互工具，帮助开发者快速初始化 AI Agent 相关配置文件。

## 功能亮点

- **一键项目初始化**：通过五步终端交互向导，自动生成 `.github/copilot-instructions.md`、技能库、开发路线图等 AI Agent 配置
- **智能技术栈选择**：支持 C#、F#、TypeScript、Rust、C++，根据语言自动级联推荐框架和交付类型
- **安全防覆盖**：写入文件前自动检测已有文件，提供覆盖确认，避免误操作丢失内容
- **多引擎支持**：可同时启用 GitHub Copilot 和 Crush 两种 AI 辅助工具
- **即用即走**：无需全局安装，直接通过 `npx` 运行

## 环境要求

- **Node.js** ≥ 18.0.0
- **操作系统**：Windows、macOS、Linux

## 快速开始

无需安装，直接运行：

```bash
# 在目标项目目录下运行
npx github:silevilence/vibe-helper

# 或指定子命令
npx github:silevilence/vibe-helper init
```

运行后跟随终端交互提示完成配置即可。

## 构建与生产运行

```bash
# 安装依赖
npm install

# 开发模式（直接运行 TypeScript 源码）
npm run dev

# 编译为 JavaScript
npm run build

# 运行编译产物
npm start
```

## 测试

```bash
# 运行全部测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 项目结构

```
vibe-helper/
├── bin/
│   └── run.cjs              # 智能 JS 桥接入口
├── src/
│   ├── index.ts              # CLI 入口，负责注册子命令和 TUI 主菜单
│   ├── commands/             # 子命令模块（插件化架构）
│   │   └── init.ts           # init 工具 — 项目初始化向导
│   ├── core/
│   │   ├── types.ts          # 共享类型定义
│   │   ├── command-registry.ts # 命令动态注册架构
│   │   ├── generator/        # 文件生成引擎
│   │   │   ├── index.ts      # 文件安全写入与生成编排
│   │   │   └── template-loader.ts # 模板读取与片段拼接
│   │   ├── prompts/          # TUI 交互模块
│   │   │   ├── project-info.ts    # 步骤1：项目信息采集
│   │   │   ├── ai-engine.ts      # 步骤2：AI 引擎选择
│   │   │   ├── tech-stack.ts     # 步骤3：技术栈级联选择
│   │   │   ├── workflow.ts       # 步骤4：工作流与权限配置
│   │   │   ├── preview.ts        # 步骤5：配置预览与确认
│   │   │   └── confirm-overwrite.ts # 文件覆盖确认
│   │   └── utils/
│   │       ├── error-handler.ts  # 优雅错误处理
│   │       └── file-check.ts     # 文件存在性检查
│   └── __tests__/            # 单元测试
├── res/
│   └── tools/
│       └── init/             # 模板资源（与代码逻辑分离）
│           ├── base/         # 通用基础设定模板
│           ├── languages/    # 语言特定开发规范
│           ├── requirements/ # 测试、权限等要求模板
│           └── skills/       # AI 技能模块
├── ROADMAP.md                # 项目开发路线图
└── changelog.md              # 变更日志
```

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 运行环境 | Node.js | ≥ 18 |
| 开发语言 | TypeScript | 5.6 |
| CLI 框架 | commander | 12.1 |
| TUI 交互 | @clack/prompts | 0.7 |
| 文件操作 | fs-extra | 11.2 |
| 开发运行 | tsx | 4.19 |
| 测试框架 | Vitest | 4.1 |
| 编译目标 | ES2022 / ESNext | — |
