#### uv 工作流约束 (CRITICAL)

项目使用 **uv** 作为统一的包管理与工程构建工具。以下为强制约束：

- **工程初始化与构建**：必须使用 `uv init`、`uv build` 命令
- **依赖安装与维护**：
  - 安装依赖：`uv add <package>` / `uv add --dev <package>`
  - 同步依赖锁文件：`uv sync`
  - 禁止直接使用 `pip install` 或 `pip freeze`
- **脚本与任务执行**：
  - 运行项目脚本：`uv run <script>`
  - 执行测试：`uv run pytest`
  - 代码检查：`uv run ruff check .`
  - 类型检查：`uv run mypy src/`
- **虚拟环境管理**：由 uv 自动管理，禁止手动创建/激活 venv
- **Python 版本管理**：使用 `uv python` 子命令管理 Python 解释器版本