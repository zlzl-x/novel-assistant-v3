# Step 14 · 导入导出与打包发布

**对应 Phase 4 收尾 · 预估 2–3 天**

## 目标与产出

- txt / docx / 番茄格式导入
- `.nav3` zip 备份导出
- electron-builder Windows 安装包
- **M4 MVP 发布检查清单**

## 前置依赖

- Step 05、09、11、12、13

## 详细任务

### 14.1 文本导入

| 格式 | 实现 |
|------|------|
| `.txt` | 主进程 `fs.readFile` utf-8 |
| `.docx` | `mammoth.extractRawText` |
| 番茄 | 调研导出格式；常见为 txt 或自定义 html → 写 `fanqie-parser.ts` |

- [x] 导入对话框：选文件 → 解析 → 预览章分（按「第x章」正则，可选手动）
- [x] 批量创建 chapters 或合并到当前章

### 14.2 导出备份

- [x] `export:project`：zip 含 JSON 导出 + map html + 元数据
- [x] `export:all`：整个 storage 目录打包 `.nav3`

### 14.3 顶栏导出入口

- [x] 「导出备份」按钮
- [x] 选择保存路径

### 14.4 electron-builder

- [x] `electron-builder.yml`：Windows nsis
- [x] 应用名「小说创作助手 v3」
- [x] `better-sqlite3` native 在 build 配置 `asarUnpack`

### 14.5 MVP 发布检查清单（逐项打勾）

- [ ] 作品/章节/角色/面板持久化
- [ ] 识别两步 → 预览 name|value → 严格确认
- [ ] 仅最新章 commit；非最新章提示
- [ ] 同名裁决；proximity 1–5
- [ ] 完整识别字段集（md/06 §10.1）
- [ ] 出场时间线
- [ ] 关系网 + 左栏搜索
- [ ] 地图代码沙箱渲染
- [ ] 设定四模板
- [x] txt/docx/番茄导入
- [x] LLM 配置 + 存储目录顶栏
- [ ] Windows 安装包可安装运行（运行 `pnpm --filter @novel-assistant/desktop build:installer` 验证）

### 14.6 E2E 冒烟（Playwright）

- [ ] 新建作品 → 粘贴章 → mock LLM → commit → 角色库有数据
- [ ] CI 可选 GitHub Actions

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **番茄格式不统一** | 先支持最常见 txt 导出；html 解析作 fallback；文档说明 |
| **docx 丢格式** | 只提取纯文本，符合产品定位 |
| **章分正则误切** | 导入预览让用户确认分章点 |
| **asar 内 sqlite 只读** | db 必须在 userData/storagePath，不进 asar |
| **安装包体积** | 接受 Electron 体积；可选 compression |

## 验收标准

- [ ] 真实 `.docx` 导入成功（需本地手动验证）
- [ ] zip 备份可在另一目录恢复（需本地手动验证）
- [ ] 干净 Windows 机器安装运行（`build:installer`）
- [ ] **M4 MVP 发布**

## 参考

- `md/10-mvp-roadmap.md` §6 MVP 发布检查清单
- `md/11-open-questions.md` H1
- `md/09-tech-stack.md` §9

**下一步 → [step-15-二期功能.md](./step-15-二期功能.md)**（非 MVP 阻塞）
