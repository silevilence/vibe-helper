## C++ 开发规范

### 编码风格
- 遵循 C++ Core Guidelines
- 使用 RAII 管理资源
- 使用 snake_case 命名变量和函数，PascalCase 命名类
- 使用 `clang-format` 统一代码格式

### 内存管理
- 优先使用智能指针 (`std::unique_ptr`, `std::shared_ptr`)
- 避免裸 `new` 和 `delete`
- 使用 `std::vector` 和 `std::array` 替代 C 风格数组

### 现代 C++ 特性
- 使用 C++17/20 特性
- 使用 `auto` 进行类型推导
- 使用范围 for 循环 (`for (const auto& x : container)`)
- 使用 `std::optional` 和 `std::variant`

### 错误处理
- 使用异常处理错误（或者在性能关键路径使用 `std::expected`）
- 使用 `noexcept` 标记不抛异常的函数

### {{DELIVERY_TYPE}} 特定规范
- 遵循 {{DELIVERY_TYPE}} 项目的最佳实践
