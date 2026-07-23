# Step 04 · 全局布局与路由

**对应 Phase 1 收尾 · 预估 2 天**

## 目标与产出

- 作品列表页 + 作品工作台四模块壳层
- 顶栏：Logo、存储目录、作品名、设置
- 三栏骨架：角色名侧栏 | 主导航 | 内容区
- 路由与空状态占位

## 前置依赖

- Step 03 完成

## 详细任务

### 4.1 路由（`renderer/router/index.ts`）

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `ProjectListView` | 作品列表 |
| `/project/:id` | redirect → manuscript | |
| `/project/:id/manuscript` | `ManuscriptView` | 正文（占位） |
| `/project/:id/manuscript/:chapterId` | `ManuscriptView` | 深链接 |
| `/project/:id/map` | `MapView` | 占位 |
| `/project/:id/characters` | `CharactersView` | 占位 |
| `/project/:id/settings` | `SettingsView` | 设定占位 |
| `/app-settings` | `AppSettingsView` | LLM 配置 |

### 4.2 布局组件

- [ ] `AppShell.vue`：顶栏 + 工作台容器
- [ ] `TopBar.vue`：存储目录下拉、`novelApi.storage.pickDirectory`、设置入口
- [ ] `ProjectWorkspace.vue`：仅在有 projectId 时显示侧栏
- [ ] `CharacterSidebar.vue`：宽 200px，可折叠至 40px，搜索框占位
- [ ] `MainNav.vue`：正文/地图/角色/设定 图标+文字，72px
- [ ] `ContentArea.vue`：`<router-view />`

### 4.3 Pinia Stores 骨架

- [ ] `useAppStore`：storagePath, sidebarCollapsed
- [ ] `useProjectStore`：currentProjectId, loadProject
- [ ] `useChapterStore`：chapters[], currentChapterId（空）
- [ ] `useCharacterStore`：characters[]（空）
- [ ] `usePreviewStore`：previews Map<chapterId, RecognitionPreview>（**仅内存**）

### 4.4 作品列表

- [ ] `ProjectListView`：列表 + 「新建作品」对话框（书名）
- [ ] 创建后跳转 `/project/:id/manuscript`
- [ ] 空状态：「创建第一部作品」

### 4.5 尺寸与响应式

- [ ] 按 md/03 §1、§6 实现宽度预算
- [ ] `< 1280px` 预览栏折叠策略（先占位按钮）

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **切换导航丢失正文草稿** | `chapterStore.drafts` Map 缓存未保存 textarea；切换前 debounce 自动存 local draft 到内存 |
| **Naive UI 与 Tailwind 冲突** | Naive 管组件，布局用 Tailwind；`n-config-provider` 包一层 |
| **默认进正文** | `/project/:id` redirect 到 `manuscript`（md/02） |
| **侧栏全局常驻** | `ProjectWorkspace` 包裹所有子路由，CharacterSidebar 不随路由销毁 |

## 验收标准

- [ ] 新建作品 → 进入正文空白页
- [ ] 四模块导航可切换，占位页不同标题
- [ ] 顶栏可改存储目录（Step 03 功能）
- [ ] 折叠角色侧栏，刷新保持（localStorage `sidebarCollapsed`）
- [ ] **M1 里程碑：** 作品 CRUD + 壳层完整

## 参考

- `md/02-information-architecture.md`
- `md/03-ui-layout-spec.md` §5–6

**下一步 → [step-05-正文与章节CRUD.md](./step-05-正文与章节CRUD.md)**
