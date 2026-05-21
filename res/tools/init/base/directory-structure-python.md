├── src/
│   └── {{PROJECT_NAME}}/       # 主包目录
│       ├── __init__.py
│       ├── main.py              # 入口文件
│       ├── core/                # 核心业务逻辑
│       ├── models/              # 数据模型
│       ├── services/            # 服务层
│       └── utils/               # 通用工具类
├── tests/                       # 测试目录
│   ├── __init__.py
│   ├── conftest.py              # pytest 共享 fixture
│   ├── test_core/
│   └── test_utils/
├── pyproject.toml               # 项目元数据与工具配置
├── README.md
└── .gitignore