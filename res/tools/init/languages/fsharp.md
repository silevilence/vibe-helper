## F# 开发规范

### 编码风格
- 使用标准的 F# 命名规范（camelCase 用于函数和变量，PascalCase 用于类型和模块）
- 优先使用不可变数据结构
- 使用管道操作符 (`|>`) 提高代码可读性
- 使用类型推断，但在公共 API 上显式标注类型

### 函数式编程
- 优先使用纯函数，避免副作用
- 使用 `Result` 和 `Option` 类型替代异常和 null
- 使用判别联合 (Discriminated Unions) 建模领域类型

### 异步编程
- 使用 `async { }` 计算表达式处理异步操作
- 使用 `Task` 与 C# 互操作时添加 `Async` 后缀

### {{DELIVERY_TYPE}} 特定规范
- 遵循 {{DELIVERY_TYPE}} 项目模板的最佳实践
