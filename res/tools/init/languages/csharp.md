## C# 开发规范

### 编码风格
- 使用 .NET 内置命名规范（PascalCase 用于类和方法，camelCase 用于变量）
- 所有公共 API 必须有 XML 文档注释
- 使用 `var` 仅当类型显而易见时
- 优先使用表达式体成员（expression-bodied members）

### 项目结构
- 遵循标准 .NET 解决方案结构
- 每个项目使用 `Directory.Build.props` 统一管理版本

### 异步编程
- 所有 I/O 操作必须使用 `async/await`
- 避免 `async void`，使用 `async Task`
- 使用 `ConfigureAwait(false)` 在库代码中

### 空安全
- 启用 nullable reference types
- 使用 null 合并运算符 (`??`) 和 null 条件运算符 (`?.`)

### {{DELIVERY_TYPE}} 特定规范
- 遵循 {{DELIVERY_TYPE}} 项目模板的最佳实践
- 使用依赖注入 (DI) 容器管理服务生命周期
