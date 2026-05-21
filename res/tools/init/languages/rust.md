## Rust 开发规范

### 编码风格
- 遵循 Rust 官方命名规范（snake_case 用于变量和函数，PascalCase 用于类型，SCREAMING_SNAKE_CASE 用于常量）
- 使用 `rustfmt` 自动格式化代码
- 使用 `clippy` 进行代码检查

### 所有权与借用
- 理解并正确使用所有权系统
- 优先使用引用 (`&T`) 而非转移所有权
- 使用生命周期标注仅当必要时

### 错误处理
- 使用 `Result<T, E>` 和 `Option<T>` 而非 `panic!`
- 使用 `?` 运算符传播错误
- 使用 `thiserror` 或 `anyhow` 简化错误处理

### 异步编程
- 使用 `tokio` 或 `async-std` 运行时
- 使用 `async`/`await` 语法

### {{DELIVERY_TYPE}} 特定规范
- 遵循 {{DELIVERY_TYPE}} 项目的最佳实践
