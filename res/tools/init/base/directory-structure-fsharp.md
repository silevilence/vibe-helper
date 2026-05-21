├── src/
│   ├── {{PROJECT_NAME}}.Domain/     # 领域模型与判别联合类型
│   ├── {{PROJECT_NAME}}.Services/   # 业务逻辑（纯函数、异步工作流）
│   ├── {{PROJECT_NAME}}.App/        # 应用程序入口（Host、DI 配置）
│   └── {{PROJECT_NAME}}.Tests/      # 单元测试与属性测试
├── {{PROJECT_NAME}}.sln             # 解决方案文件
├── Directory.Build.props            # 统一构建配置（版本号、分析器设置）
└── README.md