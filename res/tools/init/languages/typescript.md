## TypeScript 开发规范

### 编码风格
- 全面使用 ES Modules (ESM) 语法（`import`/`export`）
- 尽量定义清晰的 Interface/Type
- 避免使用 `any`，确保类型安全
- 使用 `const` 和 `let`，禁止 `var`

### 类型系统
- 启用 TypeScript 严格模式 (`strict: true`)
- 使用泛型提高代码复用性
- 优先使用 `interface` 定义对象形状，`type` 用于联合类型

### 异步优先
- 所有 I/O 操作必须使用 `async/await`
- 使用 `Promise.all` 并行执行独立异步操作
- 正确处理 Promise 错误

### 模块化
- 每个文件应有明确的单一职责
- 使用 barrel exports (`index.ts`) 简化导入路径

### {{DELIVERY_TYPE}} 特定规范
- 遵循 {{DELIVERY_TYPE}} 项目的最佳实践
{{DELIVERY_EXTRA}}
