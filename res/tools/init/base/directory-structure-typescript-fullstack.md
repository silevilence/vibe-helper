├── src/
│   ├── server/              # 后端服务层 (API)
│   │   ├── index.ts         # 服务入口
│   │   ├── routes/          # API 路由定义
│   │   ├── middleware/       # 中间件
│   │   └── services/        # 业务逻辑服务
│   ├── web/                 # 前端视图层 (SPA)
│   │   ├── index.html       # 入口 HTML
│   │   ├── main.tsx         # 前端入口
│   │   ├── components/      # UI 组件
│   │   ├── pages/           # 页面组件
│   │   └── assets/          # 静态资源
│   └── shared/              # 前后端共享类型/工具
│       └── types.ts
├── public/                  # 前端构建产物输出
├── package.json
└── tsconfig.json
