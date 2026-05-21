## Python 开发规范

### 编码风格
- 遵循 PEP 8 代码风格规范
- 使用 `ruff` 进行代码格式化和 lint（统一替代 flake8、isort、black）
- 使用 4 空格缩进，禁止使用 Tab
- 每行最多 88 个字符（兼容 `ruff` 默认配置）

### 类型注解
- 所有公共函数/方法必须有完整的类型注解
- 使用 `mypy` 进行静态类型检查（启用 strict 模式）
- 优先使用标准库类型（`list`、`dict`），仅在需要泛型参数时使用 `typing` 模块

### 异步编程
- 所有 I/O 操作必须使用 `async/await`
- 使用 `asyncio` 标准库，避免引入不必要的第三方异步框架
- 正确使用 `asyncio.gather()` 进行并发操作

### 项目结构
- 遵循 `src-layout` 结构（源码放在 `src/` 目录下）
- 使用 `pyproject.toml` 统一管理项目元数据、依赖和工具配置
- 每个模块应有明确的 `__init__.py`

### 错误处理
- 使用明确的异常类型，避免裸 `except:`
- 自定义异常继承自 `Exception` 而非 `BaseException`
- 使用 `logging` 模块而非 `print()` 输出运行时信息

### 测试
- 使用 `pytest` 作为测试框架
- 测试文件放在 `tests/` 目录下，与 `src/` 平行
- 使用 `pytest-cov` 生成覆盖率报告

### {{DELIVERY_TYPE}} 特定规范
- 遵循 {{DELIVERY_TYPE}} 项目的最佳实践
{{DELIVERY_EXTRA}}

### 依赖管理
{{DEP_MANAGER_RULES}}
