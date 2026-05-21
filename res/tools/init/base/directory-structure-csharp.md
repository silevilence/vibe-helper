├── src/
│   ├── {{PROJECT_NAME}}.Core/       # 核心业务逻辑（领域模型、服务接口）
│   ├── {{PROJECT_NAME}}.Infrastructure/ # 基础设施（数据访问、外部服务）
│   ├── {{PROJECT_NAME}}.App/        # 应用程序入口（Host、DI 配置）
│   └── {{PROJECT_NAME}}.Tests/      # 单元测试与集成测试
├── {{PROJECT_NAME}}.sln             # 解决方案文件
├── Directory.Build.props            # 统一构建配置（版本号、分析器设置）
└── README.md