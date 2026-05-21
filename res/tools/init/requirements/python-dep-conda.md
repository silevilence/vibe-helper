#### conda 工作流约束

项目使用 **conda** (Anaconda/Miniforge) 作为环境与依赖管理工具。以下为强制约束：

- **环境管理**：
  - 创建环境：`conda create -n <env-name> python=3.x`
  - 激活环境：`conda activate <env-name>`
  - 导出环境配置：`conda env export > environment.yml`
- **依赖安装**：
  - 安装 conda 包：`conda install <package>`
  - 安装 pip 包（仅当 conda 不可用时）：在 conda 环境中使用 `pip install`
  - 禁止在 conda 环境外使用 pip
- **环境复现**：
  - 从配置文件恢复：`conda env create -f environment.yml`
  - 维护 `environment.yml` 作为唯一环境定义文件
- **脚本执行**：
  - 运行项目：`python -m {{PROJECT_NAME}}`
  - 执行测试：`pytest`
  - 代码检查：`ruff check .`
  - 类型检查：`mypy src/`
- **版本管理**：使用 `pyproject.toml` 声明项目元数据，`environment.yml` 管理依赖