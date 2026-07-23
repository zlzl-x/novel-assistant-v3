# 09 · 技术选型建议

## 1. 应用形态

| 选项 | 优点 | 缺点 | 建议 |
|------|------|------|------|
| **Electron 桌面** | 本地文件、隐私 | 包体积大 | **MVP 主形态** |
| 小程序 | 轻量触达 | 存储/文件受限 | **后续可能扩展** |
| Tauri | 更轻 | Rust 学习成本 | 备选 |
| 纯 Web | 免安装 | 稿件隐私顾虑 | 不做主形态 |

**结论：Electron + Vue 3 + TypeScript**；核心逻辑放 `packages/core`，与 UI 分离，便于未来小程序移植。

---

## 2. 技术栈明细

```
┌─────────────────────────────────────────┐
│  Electron 主进程                         │
│  - 文件/SQLite IPC                       │
│  - safeStorage API Key                   │
├─────────────────────────────────────────┤
│  渲染进程 Vue 3 + TypeScript             │
│  - Vue Router                            │
│  - Pinia 状态                            │
│  - Tailwind CSS / 自定义设计系统          │
├─────────────────────────────────────────┤
│  可视化                                  │
│  - 关系网: vis-network 或 Cytoscape.js   │
│  - 地图: 沙箱 iframe 渲染 LLM 生成的 HTML/SVG │
│  - Diff: 自研双栏组件（可内联编辑）       │
├─────────────────────────────────────────┤
│  编辑器                                  │
│  - 正文: CodeMirror 6 / 简单 textarea    │
│  - 设定富文本: TipTap / Milkdown         │
├─────────────────────────────────────────┤
│  构建                                    │
│  - Vite                                  │
│  - electron-vite 或 vite-plugin-electron │
├─────────────────────────────────────────┤
│  测试                                    │
│  - Vitest (unit)                         │
│  - Playwright (e2e, 可选)                │
└─────────────────────────────────────────┘
```

---

## 3. Monorepo 结构（建议）

```
小说创作助手-v3/
├── apps/
│   └── desktop/              # Electron + Vue
│       ├── src/
│       │   ├── main/         # 主进程
│       │   ├── renderer/     # 页面
│       │   ├── components/
│       │   ├── views/
│       │   ├── stores/
│       │   └── services/
│       │       └── llm/
│       └── tests/
├── packages/
│   ├── core/                 # 纯 TS：模型、diff、识别 schema
│   ├── db/                   # SQLite 访问层
│   └── ui/                   # 共享组件（可选）
├── docs/                     # 规划文档（即 md/）
├── package.json
└── pnpm-workspace.yaml
```

---

## 4. 关键依赖选型

| 能力 | 候选 | 选择理由 |
|------|------|----------|
| 关系图 | vis-network | 径向 + 多中心布局 |
| 地图渲染 | 沙箱 iframe + LLM 生成 HTML/SVG | 真实地理关系、悬停交互 |
| 地图树 | Naive UI Tree / 自研 | 世界选择 + 搜索 |
| SQLite | better-sqlite3 | 同步 API 简单（主进程） |
| 文本 LLM | OpenAI 兼容 | 用户自备 Key；识别 + 地图代码生成共用 |
| 文档解析 | mammoth (.docx) + 番茄格式解析 | txt/docx/番茄导入 |
| 状态 | Pinia | Vue 生态 |

---

## 5. LLM 集成

复用 v2 模式：
- `packages/core` 定义 schema 与 diff 纯函数
- `apps/desktop/services/llm/` 负责 prompt、调用、解析
- 设置页：多 API Profile、模型名、温度

**v3 新增：**
- `recognition-prompts.ts` 多角色提取 + 面板词条匹配 + 关系远近量化
- 上下文压缩：角色库摘要算法
- `map-codegen/` 地图提示词 → HTML/SVG 代码生成 + sanitize
- `map-sandbox/` 沙箱 iframe 渲染与 postMessage 联动
- 顶栏存储目录选择器

---

## 6. 性能目标

| 场景 | 目标 |
|------|------|
| 冷启动 | < 3s |
| 切换章节 | < 100ms |
| 角色搜索 500 人 | < 200ms |
| 关系网 80 节点 | 60fps 拖拽 |
| 识别 | 取决于 API，UI 异步不阻塞编辑 |

---

## 7. 开发环境

- Node.js 20+
- pnpm 9+
- Windows 为主（用户环境），兼顾 macOS

---

## 8. 与 v2 代码复用评估

| 模块 | 可复用 | 说明 |
|------|--------|------|
| Electron 脚手架 | 部分 | 结构调整 |
| LLM client | 高 | 直接搬 |
| panel-* 逻辑 | 低 | 领域不同 |
| ChapterList | 中 | UI 可参考 |
| asset-validation | 低 | 不适用 |

**建议：** 新仓库干净启动，仅复制 `llm/client` 与 Electron 配置。

---

## 9. 安全

- API Key：`safeStorage`
- 不上传正文到自有服务器（无后端 MVP）
- CSP 限制渲染进程
- 导入文件大小限制（如 10MB）

---

## 10. 已确认项

见 `11-open-questions.md`（已全部确认）：
- 桌面端 MVP，后续可能小程序
- 用户自备文本 LLM API Key（识别 + 地图共用）
- 用户自选存储目录（顶栏）
- 严格识别模式，识别与地图解耦
