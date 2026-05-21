#### pip 工作流约束

项目使用 **pip** + **venv** 作为依赖管理工具。以下为强制约束：

- **虚拟环境管理**：
  - 创建虚拟环境：`python -m venv .venv`
  - 激活后所有操作在虚拟环境中进行
- **依赖安装**：
  - 安装生产依赖：`pip install <package>`
  - 安装开发依赖：`pip install -e ".[dev]"`
- **依赖锁定**：
  - 使用 `pip freeze > requirements.txt` 锁定生产依赖
  - 使用 `pip freeze > requirements-dev.txt` 锁定开发依赖（可选）
- **脚本执行**：
  - 运行项目：`python -m {{PROJECT_NAME}}`
  - 执行测试：`pytest`
  - 代码检查：`ruff check .`
  - 类型检查：`mypy src/`
- **版本管理**：使用 `pyproject.toml` 声明项目元数据与构建配置