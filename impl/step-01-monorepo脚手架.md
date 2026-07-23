# Step 01 · Monorepo 脚手架

**对应 Phase 1 · 预估 2–3 天**

## 目标与产出

- 可 `pnpm dev` 启动的 Electron + Vue 3 空壳窗口
- `packages/core`、`packages/db` 空包可被引用
- Vitest 可运行空测试
- ESLint + TypeScript 严格模式

## 前置依赖

无（第一步）

## 详细任务

### 1.1 初始化 workspace

- [ ] 根目录 `package.json`：`"private": true`，scripts：`dev` / `build` / `test`
- [ ] `pnpm-workspace.yaml`：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] `.npmrc`：`shamefully-hoist=true`（better-sqlite3 需要）
- [ ] `tsconfig.base.json`：strict、paths 映射 `@novel-assistant/core`、`@novel-assistant/db`

### 1.2 创建 apps/desktop

- [ ] 使用 `electron-vite` 官方 Vue-TS 模板结构
- [ ] 依赖：`electron`、`vue`、`vue-router`、`pinia`、`naive-ui`、`tailwindcss`
- [ ] `electron.vite.config.ts` 配置 main / preload / renderer 三入口
- [ ] 主窗口 1280×800，最小 1024×768

### 1.3 创建 packages/core

- [ ] `package.json`：`name: @novel-assistant/core`，`main` 指向 `src/index.ts`
- [ ] 导出空模块 + 占位类型 `Project`、`Chapter`（从 md/08 复制）
- [ ] `vitest.config.ts`

### 1.4 创建 packages/db

- [ ] 依赖：`better-sqlite3`、`uuid`
- [ ] devDependency：`@types/better-sqlite3`
- [ ] 导出 `DatabaseService` 占位类

### 1.5 开发体验

- [ ] `.gitignore`：node_modules、dist、*.db、.env
- [ ] `.env.example`：`# LLM_API_KEY=`（不提交真实 key）
- [ ] README 指向 `md/` 与 `impl/`

## 建议命令

```bash
pnpm install
pnpm dev          # 应弹出空窗口
pnpm test         # 0 tests passed
pnpm build        # 应成功
```

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **better-sqlite3 在 Electron 下编译失败** | 仅主进程引用；安装 `electron-rebuild`；`postinstall` 跑 rebuild；文档注明 Node 20+ |
| **pnpm 幽灵依赖** | `.npmrc` shamefully-hoist；子包显式声明依赖 |
| **路径别名在 main/renderer 不一致** | electron-vite 分别为 main、renderer 配 resolve.alias |
| **Windows 中文路径** | 测试项目放在含中文的 `小说创作助手-v3` 路径下构建一次 |

## 验收标准

- [ ] `pnpm dev` 窗口正常，无控制台报错
- [ ] renderer 可 `import { } from '@novel-assistant/core'`
- [ ] `pnpm build` 产出 `dist/` 安装包目录
- [ ] Vitest 在 core、db 各跑通 1 个占位测试

## 参考

- `md/09-tech-stack.md` §2–3
- `impl/00-实施总览.md` §3

**下一步 → [step-02-数据库与Repository.md](./step-02-数据库与Repository.md)**
